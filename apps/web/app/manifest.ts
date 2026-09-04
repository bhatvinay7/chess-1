import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rooky",
    short_name: "Rooky",
    description:
      "Play live chess, challenge friends, join tournaments, and improve with game analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5fbeb",
    theme_color: "#f5fbeb",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
