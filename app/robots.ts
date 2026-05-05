import type { MetadataRoute } from "next";

const siteUrl = "https://www.mydoorables.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/messages",
          "/account",
          "/api",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
