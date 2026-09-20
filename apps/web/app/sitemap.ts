import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chesscounty.life";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/arena",
    "/arena/bot",
    "/arena/coach",
    "/clubs",
    "/tournament",
    "/watch",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
