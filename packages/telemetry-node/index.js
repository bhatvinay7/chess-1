import { context, propagation, ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

let sdk;
export function initTelemetry(serviceName, options = {}) {
  if (sdk || process.env.OTEL_SDK_DISABLED === 'true') return sdk;
  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || serviceName,
    traceExporter: options.traceExporter || new OTLPTraceExporter(),
    // Application metrics have their own Prometheus endpoint; logs use stdout.
    metricReaders: [],
    logRecordProcessors: [],
    ...(options.spanProcessors ? { spanProcessors: options.spanProcessors } : {}),
  });
  sdk.start();
  process.once('SIGTERM', () => {
    const timeout = setTimeout(() => process.exit(0), 5000);
    timeout.unref();
    sdk.shutdown().finally(() => process.exit(0));
  });
  return sdk;
}

export { SpanKind };
export function currentCarrier() {
  const carrier = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function withTracePayload(payload) {
  return { ...payload, _trace_context: currentCarrier() };
}

function completed(span, name, failed = false) {
  const { traceId, spanId } = span.spanContext();
  if (traceId !== '00000000000000000000000000000000') {
    console.log(JSON.stringify({ severity: failed ? 'ERROR' : 'INFO', message: 'operation completed', operation: name, trace_id: traceId, span_id: spanId }));
  }
  span.end();
}

export function withSpan(name, kind, operation, carrier, attributes = {}) {
  const parent = carrier === undefined ? context.active() : propagation.extract(ROOT_CONTEXT, carrier);
  return trace.getTracer('chess').startActiveSpan(name, { kind, attributes }, parent, async span => {
    let failed = false;
    try {
      return await operation();
    } catch (error) {
      failed = true;
      span.setStatus({ code: SpanStatusCode.ERROR });
      // Do not record request bodies, credentials, or database error contents.
      throw error;
    } finally {
      completed(span, name, failed);
    }
  });
}

// Install before Express routes. A separate async context is used for each request.
export function httpTracing(req, res, next) {
  const parent = propagation.extract(ROOT_CONTEXT, req.headers);
  const span = trace.getTracer('chess').startSpan('HTTP ' + req.method, {
    kind: SpanKind.SERVER,
    attributes: { 'http.request.method': req.method },
  }, parent);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    // Route templates only: never export URL query parameters or user identifiers.
    const route = req.route?.path;
    if (typeof route === 'string') {
      span.updateName(req.method + ' ' + route);
      span.setAttribute('http.route', route);
    }
    span.setAttribute('http.response.status_code', res.statusCode);
    const failed = res.statusCode >= 500 || !res.writableFinished;
    if (failed) span.setStatus({ code: SpanStatusCode.ERROR });
    completed(span, 'http.request', failed);
  };
  res.once('finish', finish);
  res.once('close', finish);
  context.with(trace.setSpan(parent, span), next);
}
