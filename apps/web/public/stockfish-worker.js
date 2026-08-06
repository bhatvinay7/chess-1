// stockfish-worker.js — same-origin proxy for cross-origin (S3) Stockfish files.
//
// WHY THIS EXISTS:
//   Browsers block Workers from cross-origin URLs. When stockfish-18.js moves to
//   S3, create the Worker from this file (same origin) and pass the S3 URL via
//   INIT. This worker importScripts the remote file, bypassing the CORS Worker
//   restriction.
//
// WHY WE DON'T USE IT NOW:
//   Stockfish derives its WASM path from `self.location` (this worker's URL), so
//   it would request /stockfish-worker.wasm (404) instead of /stockfish-18.wasm.
//   For local serving, use stockfish-18.js directly as new Worker('/stockfish-18.js').
//
// FUTURE S3 USAGE:
//   new Worker('/stockfish-worker.js')
//   worker.postMessage({ type: 'INIT', data: { scriptUrl: 'https://cdn/sf18.js', wasmUrl: 'https://cdn/sf18.wasm' } })

let sf = null;

self.onmessage = async function (e) {
  const { type, data } = e.data;

  if (type === 'INIT') {
    try {
      importScripts(data.scriptUrl);

      // locateFile redirects WASM lookup to the provided URL instead of
      // deriving it from this worker's own pathname.
      sf = await Stockfish({
        locateFile: (file) =>
          file.endsWith('.wasm') ? data.wasmUrl || data.scriptUrl.replace(/\.js$/i, '.wasm') : file,
      });

      sf.onmessage = function (line) {
        self.postMessage({ type: 'OUTPUT', data: line });
      };

      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', data: String(err) });
    }
    return;
  }

  if (type === 'COMMAND' && sf) {
    sf.postMessage(data);
  }
};
