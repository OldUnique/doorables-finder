import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "../lib/seo";

// Rebuild the sitemap at most once an hour so new public collector profiles show up.
export const revalidate = 3600;

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

const staticRoutes: { path: string; changeFrequency: ChangeFrequency; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/collection", changeFrequency: "weekly", priority: 0.9 },
  { path: "/demo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/marketplace", changeFrequency: "daily", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/feedback", changeFrequency: "weekly", priority: 0.6 },
];

function isPublicVisibility(value: unknown) {
  const clean = String(value ?? "").toLowerCase().trim();
  return clean === "public" || clean.includes("full") || clean.includes("extras");
}

async function getPublicCollectorPaths(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return [];

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase
      .from("users")
      .select("username, collection_visibility")
      .not("username", "is", null)
      .limit(5000);

    if (error || !data) return [];

    const seen = new Set<string>();
    for (const row of data as { username?: string | null; collection_visibility?: unknown }[]) {
      const username = String(row.username || "").trim();
      if (!username || !isPublicVisibility(row.collection_visibility)) continue;
      seen.add(`/collector/${encodeURIComponent(username)}`);
    }
    return Array.from(seen);
  } catch {
    // Never let a database hiccup break the sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const collectors: MetadataRoute.Sitemap = (await getPublicCollectorPaths()).map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...pages, ...collectors];
}
