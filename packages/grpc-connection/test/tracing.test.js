import assert from 'node:assert/strict';
import test from 'node:test';
import { initTelemetry, currentCarrier, SpanKind, withSpan } from '@repo/telemetry-node';
import { processMoveGrpc, registerSpectatedGameGrpc } from '../dist/client.js';

// Inspect finished spans without making any exporter/network requests.
const spans = [];
const sdk = initTelemetry('grpc-test', { spanProcessors: [{
  onStart() {}, onEnd(span) { spans.push(span); },
  forceFlush: async () => {}, shutdown: async () => {},
}] });

test('gRPC helpers inject client span context and preserve failures', async () => {
  let requestParent;
  const seen = [];
  const fakeClient = {
    ProcessMove(request, metadata, callback) {
      seen.push(metadata.get('traceparent')[0]);
      callback(null, { valid: true });
    },
    RegisterSpectatedGame(request, metadata, callback) {
      seen.push(metadata.get('traceparent')[0]);
      callback(new Error('unavailable'));
    },
  };
  try {
    await withSpan('socket.user_move', SpanKind.SERVER, async () => {
      requestParent = currentCarrier().traceparent;
      assert.equal((await processMoveGrpc(fakeClient, { game_id: 'test' })).valid, true);
      await assert.rejects(registerSpectatedGameGrpc(fakeClient, 'test'), /unavailable/);
    }, { traceparent: `00-${'a'.repeat(32)}-${'1'.repeat(16)}-01` });
    assert.equal(seen.length, 2);
    const clients = spans.filter(span => span.kind === SpanKind.CLIENT);
    assert.equal(clients.length, 2);
    for (let i = 0; i < clients.length; i++) {
      assert.equal(seen[i].slice(3, 35), 'a'.repeat(32));
      assert.equal(seen[i].slice(36, 52), clients[i].spanContext().spanId);
      assert.equal(clients[i].parentSpanContext.spanId, requestParent.slice(36, 52));
    }
    assert.equal(clients[1].status.code, 2);
  } finally { await sdk.shutdown(); }
});
