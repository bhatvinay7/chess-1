/** @type {import('next').NextConfig} */
const configuredStockfishR2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const stockfishR2Url = /^https?:\/\//.test(configuredStockfishR2Url || "")
  ? configuredStockfishR2Url.replace(/\/$/, "")
  : "https://thepipe.shop";

const nextConfig = {
  serverExternalPackages: ["@repo/telemetry-node"],
  async rewrites() {
    const wasmDestination = `${stockfishR2Url}/stockfish/stockfish-18.wasm`;

    return [
      {
        source: "/stockfish/stockfish-18.wasm",
        destination: wasmDestination,
      },
      {
        // Compatibility for clients that cached the previous proxy worker.
        source: "/stockfish-worker.wasm",
        destination: wasmDestination,
      },
    ];
  },
  async headers() {
    return [
      {
        // COOP+COEP required for SharedArrayBuffer (Stockfish engine).
        // "credentialless" allows cross-origin images (Cloudinary) while still
        // enabling SharedArrayBuffer in Chrome 96+ and Firefox 119+.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
