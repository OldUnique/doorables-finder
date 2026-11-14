// Server-side catalog helpers for the public, indexable series pages and the series guide.
// Uses the public anon key only and never throws, so pages still render if Supabase is down.

export type CatalogFigure = {
  id: string;
  name: string;
  series: string;
  subcategory: string;
  rarity: string;
  movie: string;
  image: string | null;
};

export type SeriesSummary = {
  name: string;
  slug: string;
  group: SeriesGroup;
  count: number;
  subcategories: string[];
  rarityCounts: { rarity: string; count: number }[];
  topMovies: { movie: string; count: number }[];
  movieCount: number;
  image: string | null;
};

export type SeriesGroup = "main" | "starwars-marvel" | "lines" | "sets";

export function seriesSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function mainSeriesNumber(name: string) {
  const match = /^series\s+(\d+)$/i.exec(name.trim());
  return match ? Number(match[1]) : null;
}

const RARITY_ORDER = [
  "Common",
  "Rare",
  "Super Rare",
  "Ultra Rare",
  "Special Edition",
  "Limited Edition",
  "Exclusive",
  "Bonus",
  "Unknown",
];

export function rarityRank(rarity: string) {
  const i = RARITY_ORDER.indexOf(rarity);
  return i === -1 ? RARITY_ORDER.length : i;
}

function groupFor(name: string, figures: CatalogFigure[]): SeriesGroup {
  if (mainSeriesNumber(name) !== null) return "main";
  if (/star wars|galactic|ewok|marvel|spider|fantastic four/i.test(name)) return "starwars-marvel";
  // Blind-box style lines have Common/Rare tiers; fixed sets are all Exclusive/Bonus.
  const blind = figures.some((f) => /common|rare/i.test(f.rarity));
  return blind ? "lines" : "sets";
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

type Row = {
  id: string;
  name: string | null;
  series: string | null;
  subcategory: string | null;
  rarity: string | null;
  movie: string | null;
  image_url: string | null;
};

export async function getCatalog(): Promise<CatalogFigure[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return [];

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const pages = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      try {
        const res = await fetch(
          `${url}/rest/v1/doorables?select=id,name,series,subcategory,rarity,movie,image_url&order=id.asc&limit=1000&offset=${i * 1000}`,
          { headers, next: { revalidate: 3600 } }
        );
        if (!res.ok) return [] as Row[];
        return (await res.json()) as Row[];
      } catch {
        return [] as Row[];
      }
    })
  );

  return pages.flat().map((r) => {
    const image = clean(r.image_url);
    return {
      id: r.id,
      name: clean(r.name),
      series: clean(r.series) || "Unassigned",
      subcategory: clean(r.subcategory),
      rarity: clean(r.rarity) || "Unknown",
      movie: clean(r.movie),
      image: /^https:\/\//.test(image) ? image : null,
    };
  });
}

export function summarizeSeries(figures: CatalogFigure[]): SeriesSummary[] {
  const bySeries = new Map<string, CatalogFigure[]>();
  for (const f of figures) {
    const list = bySeries.get(f.series) || [];
    list.push(f);
    bySeries.set(f.series, list);
  }

  const out: SeriesSummary[] = [];
  for (const [name, list] of bySeries) {
    const rarity = new Map<string, number>();
    const movies = new Map<string, number>();
    const subs = new Set<string>();
    for (const f of list) {
      rarity.set(f.rarity, (rarity.get(f.rarity) || 0) + 1);
      if (f.movie) movies.set(f.movie, (movies.get(f.movie) || 0) + 1);
      if (f.subcategory) subs.add(f.subcategory);
    }
    out.push({
      name,
      slug: seriesSlug(name),
      group: groupFor(name, list),
      count: list.length,
      subcategories: Array.from(subs).sort(),
      rarityCounts: Array.from(rarity, ([r, c]) => ({ rarity: r, count: c })).sort(
        (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity)
      ),
      topMovies: Array.from(movies, ([m, c]) => ({ movie: m, count: c }))
        .sort((a, b) => b.count - a.count || a.movie.localeCompare(b.movie))
        .slice(0, 8),
      movieCount: movies.size,
      image: list.find((f) => f.image)?.image || null,
    });
  }

  return out.sort((a, b) => {
    const an = mainSeriesNumber(a.name);
    const bn = mainSeriesNumber(b.name);
    if (an !== null && bn !== null) return an - bn;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return b.count - a.count || a.name.localeCompare(b.name);
  });
}

export const SERIES_GROUP_LABELS: Record<SeriesGroup, { title: string; text: string }> = {
  main: {
    title: "Main numbered series",
    text: "The core blind-box waves, from the original 2018 release through the newest numbered series.",
  },
  "starwars-marvel": {
    title: "Star Wars and Marvel",
    text: "Galaxy Peek, Galactic Cruisers, Marvel and other non-princess-and-Pixar lines.",
  },
  lines: {
    title: "Themed blind-box lines",
    text: "Spin-off lines with their own Common, Rare and Ultra Rare checklists, like Let's Go, Academy, Costume Cuties and seasonal releases.",
  },
  sets: {
    title: "Collection Peeks and fixed sets",
    text: "Sets where every figure is in the box, often store exclusives, advent calendars and anniversary releases.",
  },
};

// Short, sourced notes for well-documented series. Everything else on a series page is generated from the catalog.
export const SERIES_NOTES: Record<string, string> = {
  "Series 1":
    "Series 1 is where Doorables began. The line was launched by Moose Toys in August 2018, built around tiny figures with glittery eyes hidden behind door-shaped packaging. Series 1 and 2 are the only main series made by Moose Toys before Just Play relaunched the brand in 2019, which is why collectors often call them the Moose series.",
  "Series 2":
    "Series 2 was the second and final main wave from Moose Toys, adding more characters to the original 2018 launch before Just Play took over the brand and relaunched it in 2019.",
  "Series 3":
    "Series 3 was the first main series after Just Play relaunched Doorables in 2019. Collector checklists describe it as bringing back favorites from the first two series, including glitter variants.",
  "Series 6":
    "Series 6 introduced the Magic Key, a packaging feature where you count Hidden Mickeys behind the door to learn how many figures are in the box. Just Play's description highlights jeweled princesses, pearlized Little Mermaid figures and flocked Winnie the Pooh characters.",
  "Series 7":
    "Series 7 is known for its Special Edition Color Reveal figures, which change to one of two possible designs when dipped in cold water. Just Play's listing also calls out metallic Incredibles figures and pearlized translucent Inside Out figures.",
  "Series 10":
    "Series 10 celebrated Disney's 100th anniversary in 2023, which is why its theme is Celebrate 100 Years. Its Special Edition figures have a platinum finish, and collector checklists list a platinum Mickey Mouse Limited Edition reported to be limited to 100 pieces.",
  "Series 11":
    "Series 11, Technicolor Takeover, gives its Special Edition figures a full rainbow of colors.",
  "Series 12":
    "Series 12, Pixel Perfect, gave its Special Edition figures a pixelated look, a first for the line. Collector checklists date it to August 2024.",
  "Series 13":
    "Series 13, Remember When, pairs grown-up versions of characters with younger versions of themselves.",
  "Series 14":
    "Series 14, Let's Party, spreads its figures across several party themes, from pool parties to tea parties.",
  "Series 15":
    "Series 15, In Full Bloom, is a garden theme with figures in flowerpots, topiaries and blooms.",
  "Series 16":
    "Series 16, Ticket to Fun, is a festival and amusement-park theme released in July 2026. Just Play splits it into five zones: Perfect Prizes, Amazing Amusements, All Fun & Games, Enchanted Entertainers and Festival Foodies. Every figure comes with a pop-on base, and some connect, like the Stitch, Angel and Leroy coaster cars. The Special Edition chases have iridescent, scented, flocked or glow-in-the-dark finishes.",
  "Star Wars":
    "Star Wars Doorables arrived in 2024 with Galaxy Peek capsules, and the line has continued through several numbered series. In this catalog the Star Wars figures are grouped together, with the numbered Galaxy Peek series shown as subcategories.",
  "Costume Foodies":
    "Costume Foodies is a 36-figure line of characters dressed as food. Only the figures that Just Play and Disney Store have officially named are in the catalog so far; the rest will be added when a full list is published.",
};
