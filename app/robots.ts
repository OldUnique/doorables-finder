import type { MetadataRoute } from "next";

const siteUrl = "https://www.mydoorables.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api",
          "/admin",
          "/account",
          "/messages",
          "/login",
          "/reset-password",
          "/success",
          "/sell",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
