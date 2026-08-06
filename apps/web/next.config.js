/** @type {import('next').NextConfig} */
const nextConfig = {
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
