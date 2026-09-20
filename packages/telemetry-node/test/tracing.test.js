import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer, request } from 'node:http';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { currentCarrier, httpTracing, initTelemetry, SpanKind, withSpan, withTracePayload } from '../index.js';

const exporter = new InMemorySpanExporter();
const sdk = initTelemetry('test-service', { spanProcessors: [new SimpleSpanProcessor(exporter)] });

function get(port, traceId) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, headers: { traceparent: `00-${traceId}-1111111111111111-01` } }, res => {
      let body = '';
      res.on('data', part => { body += part; });
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

test('concurrent HTTP requests and durable messages retain isolated trace parents', async () => {
  const server = createServer((req, res) => {
    httpTracing(req, res, () => {
      withSpan('send job', SpanKind.PRODUCER, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.end(JSON.stringify(withTracePayload({ job: 'test' })));
      }).catch(() => { res.statusCode = 500; res.end(); });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const ids = ['a'.repeat(32), 'b'.repeat(32)];
    const messages = await Promise.all(ids.map(id => get(server.address().port, id)));
    for (let i = 0; i < messages.length; i++) {
      const msg = JSON.parse(JSON.stringify(messages[i]));
      assert.ok(msg._trace_context.traceparent.includes(ids[i]));
      await assert.rejects(withSpan('worker', SpanKind.CONSUMER, async () => {
        assert.ok(currentCarrier().traceparent.includes(ids[i]));
        throw new Error('expected failure');
      }, msg._trace_context));
    }
    const spans = exporter.getFinishedSpans();
    for (const id of ids) {
      const chain = spans.filter(span => span.spanContext().traceId === id);
      assert.equal(chain.length, 3);
      const http = chain.find(span => span.kind === SpanKind.SERVER);
      const producer = chain.find(span => span.kind === SpanKind.PRODUCER);
      const consumer = chain.find(span => span.kind === SpanKind.CONSUMER);
      assert.equal(http.parentSpanContext.spanId, '1111111111111111');
      assert.equal(producer.parentSpanContext.spanId, http.spanContext().spanId);
      assert.equal(consumer.parentSpanContext.spanId, producer.spanContext().spanId);
      assert.equal(consumer.status.code, 2);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await sdk.shutdown();
  }
});
