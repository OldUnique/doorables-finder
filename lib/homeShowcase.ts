// Server-side data for the homepage showcase (catalog stats, photos, series).
// Uses the public anon key only, and never throws: the homepage must render even if Supabase is down.

export type ShowcaseFigure = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  image: string;
};

export type ShowcaseSeries = {
  name: string;
  count: number;
  image: string | null;
};

export type HomeShowcase = {
  catalogCount: number | null;
  seriesCount: number | null;
  collectorCount: number | null;
  trackedCount: number | null;
  collage: ShowcaseFigure[];
  series: ShowcaseSeries[];
  spotlight: { name: string; rarity: string }[];
};

export const EMPTY_SHOWCASE: HomeShowcase = {
  catalogCount: null,
  seriesCount: null,
  collectorCount: null,
  trackedCount: null,
  collage: [],
  series: [],
  spotlight: [],
};

const SPECIAL_SERIES_PICKS = ["Star Wars", "Marvel", "Disney Parks", "Nightmare Before Christmas"];

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, key };
}

async function rest(path: string, init?: { count?: boolean }) {
  const { url, key } = env();
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
  if (init?.count) headers.Prefer = "count=exact";

  const res = await fetch(`${url}/rest/v1/${path}`, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res;
}

async function countRows(path: string): Promise<number | null> {
  try {
    const res = await rest(`${path}&limit=1`, { count: true });
    const total = res.headers.get("content-range")?.split("/")[1];
    const n = Number(total);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function getJson<T>(path: string): Promise<T[]> {
  try {
    const res = await rest(path);
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

function seriesNumber(name: string) {
  const match = /^series\s+(\d+)$/i.exec(name.trim());
  return match ? Number(match[1]) : null;
}

type ImageRow = { id: string; name: string; series: string | null; rarity: string | null; image_url: string | null };

function toFigure(row: ImageRow): ShowcaseFigure {
  return {
    id: row.id,
    name: String(row.name || "").split("-")[0].trim() || row.name,
    series: String(row.series || ""),
    rarity: String(row.rarity || ""),
    image: String(row.image_url || ""),
  };
}

export async function getHomeShowcase(): Promise<HomeShowcase> {
  const { url, key } = env();
  if (!url || !key) return EMPTY_SHOWCASE;

  const imageFilter = "image_url=not.is.null&image_url=like.https*";

  const [catalogCount, collectorCount, trackedCount, imageRows, spotlight] = await Promise.all([
    countRows("doorables?select=id"),
    countRows("users?select=id"),
    countRows("user_doorables?select=id&qty_owned=gt.0"),
    getJson<ImageRow>(
      `doorables?select=id,name,series,rarity,image_url&${imageFilter}&order=created_at.desc&limit=300`
    ),
    getJson<{ name: string; rarity: string | null }>(
      "doorables?select=name,rarity&series=eq.Series%2016&order=name.asc"
    ),
  ]);

  const pageCount = Math.min(Math.ceil((catalogCount ?? 3000) / 1000), 10);
  const seriesPages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      getJson<{ series: string | null }>(`doorables?select=series&order=id.asc&limit=1000&offset=${i * 1000}`)
    )
  );

  const counts = new Map<string, number>();
  for (const row of seriesPages.flat()) {
    const name = String(row.series || "").trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }

  const figures = imageRows.map(toFigure).filter((f) => f.image);

  // Collage: one figure per series so the hero shows variety.
  const collage: ShowcaseFigure[] = [];
  const seenSeries = new Set<string>();
  for (const f of figures) {
    if (seenSeries.has(f.series)) continue;
    seenSeries.add(f.series);
    collage.push(f);
    if (collage.length >= 9) break;
  }

  // Series grid: newest numbered series first, then a few big specials.
  const numbered = Array.from(counts.keys())
    .filter((n) => seriesNumber(n) !== null)
    .sort((a, b) => (seriesNumber(b) || 0) - (seriesNumber(a) || 0))
    .slice(0, 8);
  const specials = SPECIAL_SERIES_PICKS.filter((n) => counts.has(n));
  const picked = [...numbered, ...specials].slice(0, 12);

  const covers = await Promise.all(
    picked.map(async (name) => {
      const rows = await getJson<{ image_url: string }>(
        `doorables?select=image_url&series=eq.${encodeURIComponent(name)}&${imageFilter}&limit=1`
      );
      return rows[0]?.image_url || null;
    })
  );

  return {
    catalogCount,
    seriesCount: counts.size || null,
    collectorCount,
    trackedCount,
    collage,
    series: picked.map((name, i) => ({ name, count: counts.get(name) || 0, image: covers[i] })),
    spotlight: spotlight.map((r) => ({ name: r.name, rarity: String(r.rarity || "") })),
  };
}
