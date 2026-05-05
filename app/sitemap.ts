import type { MetadataRoute } from "next";

const siteUrl = "https://www.mydoorables.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/demo`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/marketplace`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/feedback`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
  ];

  return routes;
}
