import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, SITE_URL } from "../../../lib/seo";
import {
  getCatalog,
  mainSeriesNumber,
  rarityRank,
  summarizeSeries,
  SERIES_GROUP_LABELS,
  SERIES_NOTES,
  type CatalogFigure,
  type SeriesSummary,
} from "../../../lib/catalog";
import "../../content.css";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const series = summarizeSeries(await getCatalog());
  return series.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const figures = await getCatalog();
  const all = summarizeSeries(figures);
  const summary = all.find((s) => s.slug === slug) || null;
  const list = summary ? figures.filter((f) => f.series === summary.name) : [];
  return { all, summary, list };
}

function seriesTitle(s: SeriesSummary) {
  const theme = mainSeriesNumber(s.name) !== null && s.subcategories.length === 1 ? ` (${s.subcategories[0]})` : "";
  return `Doorables ${s.name}${theme} Checklist`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { summary } = await load(slug);
  if (!summary) return { title: "Series not found", robots: { index: false } };
  const top = summary.topMovies.slice(0, 3).map((m) => m.movie).join(", ");
  return pageMetadata({
    title: seriesTitle(summary),
    description: `Full Disney Doorables ${summary.name} checklist: all ${summary.count} figures with rarity${
      top ? `, featuring ${top}` : ""
    }. Track what you have and need free on Adorable Vault.`,
    path: `/series/${summary.slug}`,
  });
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function describe(s: SeriesSummary, list: CatalogFigure[]) {
  const paras: string[] = [];
  const isMain = mainSeriesNumber(s.name) !== null;

  let first = `${s.name} has ${s.count} figure${s.count === 1 ? "" : "s"} in the Adorable Vault catalog.`;
  if (isMain && s.subcategories.length === 1) first += ` Its theme is ${s.subcategories[0]}.`;
  else if (s.subcategories.length > 1) first += ` The catalog groups them as ${joinList(s.subcategories)}.`;

  const known = s.rarityCounts.filter((r) => r.rarity !== "Unknown");
  if (known.length) {
    first += ` The checklist breaks down as ${joinList(known.map((r) => `${r.count} ${r.rarity}`))}.`;
  }
  const unknown = s.rarityCounts.find((r) => r.rarity === "Unknown");
  if (unknown) {
    first += ` ${unknown.count} figure${unknown.count === 1 ? " has" : "s have"} no confirmed rarity yet, so ${
      unknown.count === 1 ? "it shows" : "they show"
    } as Unknown until a reliable checklist is published.`;
  }
  paras.push(first);

  if (s.topMovies.length) {
    const lead = s.topMovies.slice(0, 4).map((m) => `${m.movie} (${m.count})`);
    paras.push(
      `Characters come from ${s.movieCount} different ${s.movieCount === 1 ? "movie or franchise" : "movies and franchises"}${
        s.movieCount > 1 ? `, led by ${joinList(lead)}` : `: ${s.topMovies[0].movie}`
      }.`
    );
  }

  const groupText: Record<SeriesSummary["group"], string> = {
    main: `As one of the main numbered series, ${s.name} was sold in blind packaging, so most collectors complete it through a mix of opening boxes and trading duplicates for the figures they still need. The rarest figures, usually the Ultra Rares, Special Editions and any Limited Edition, tend to be the last ones missing.`,
    "starwars-marvel": `${s.name} is part of the Star Wars and Marvel side of Doorables, which uses its own series numbering separate from the main Doorables series.`,
    lines: `${s.name} is a themed line with its own checklist and rarity tiers, separate from the main numbered series. Smaller lines like this are a popular way to complete a full set without the cost of a large main series.`,
    sets: `Its figures are labeled ${joinList(
      s.rarityCounts.map((r) => r.rarity)
    )}, which in Doorables checklists usually means they came in a fixed set, such as a Collection Peek, calendar or store exclusive, rather than regular blind boxes. Fixed sets can be hard to find once they leave stores.`,
  };
  paras.push(groupText[s.group]);

  const withPhotos = list.filter((f) => f.image).length;
  paras.push(
    withPhotos === list.length
      ? "Every figure on this page has a catalog photo to help you identify it."
      : withPhotos > 0
      ? `${withPhotos} of the ${list.length} figures have a catalog photo so far. Collectors can submit photos for the rest from the tracker.`
      : "Photos for this release have not been added yet. Collectors can submit photos from the tracker, and the figure names, rarities and movies below are still complete."
  );
  return paras;
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const { all, summary, list } = await load(slug);
  if (!summary) notFound();

  const figures = [...list].sort(
    (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.movie.localeCompare(b.movie) || a.name.localeCompare(b.name)
  );
  const note = SERIES_NOTES[summary.name];
  const paras = describe(summary, list);

  const groupPeers = all.filter((s) => s.group === summary.group && s.slug !== summary.slug);
  const idx = all.findIndex((s) => s.slug === summary.slug);
  const isMain = summary.group === "main";
  const prev = isMain ? all[idx - 1] && all[idx - 1].group === "main" ? all[idx - 1] : null : null;
  const next = isMain ? all[idx + 1] && all[idx + 1].group === "main" ? all[idx + 1] : null : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Disney Doorables ${summary.name} checklist`,
      numberOfItems: figures.length,
      itemListElement: figures.slice(0, 100).map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Series", item: `${SITE_URL}/series` },
        { "@type": "ListItem", position: 3, name: summary.name, item: `${SITE_URL}/series/${summary.slug}` },
      ],
    },
  ];

  return (
    <div className="cvPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="cvCrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link href="/series">Series & sets</Link>
        <span aria-hidden="true">›</span>
        <span>{summary.name}</span>
      </nav>

      <header className="cvHero">
        <div className="cvEyebrow">🗂️ {SERIES_GROUP_LABELS[summary.group].title}</div>
        <h1 className="cvTitle">{seriesTitle(summary).replace(/ Checklist$/, "")}</h1>
        <div className="cvStats">
          <div className="cvStat"><strong>{summary.count}</strong><span>Figures</span></div>
          {summary.rarityCounts.slice(0, 5).map((r) => (
            <div key={r.rarity} className="cvStat"><strong>{r.count}</strong><span>{r.rarity}</span></div>
          ))}
        </div>
      </header>

      <div className="cvLayout">
        <article className="cvArticle">
          <div className="cvProse">
            {note && <p>{note}</p>}
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p>
              Want to know what the rarity labels mean? See <Link href="/guides/doorables-rarity-explained">Doorables rarity explained</Link>.
              Not sure which version of a character you have? Try <Link href="/guides/how-to-identify-doorables">how to identify your Doorables</Link>.
            </p>

            {summary.topMovies.length > 1 && (
              <>
                <h2 id="movies">Movies and franchises</h2>
                <div className="cvChips">
                  {summary.topMovies.map((m) => (
                    <span key={m.movie} className="cvChip">{m.movie} · {m.count}</span>
                  ))}
                </div>
              </>
            )}

            <h2 id="checklist">Full {summary.name} checklist</h2>
            <p>All {figures.length} figures, sorted by rarity and then by movie.</p>
          </div>

          <div className="cvFigures">
            {figures.map((f) => (
              <div key={f.id} className="cvFigure">
                <div className="cvFigureImg">
                  {f.image ? <img src={f.image} alt={`${f.name} Doorable`} loading="lazy" decoding="async" /> : <span aria-hidden="true">💜</span>}
                </div>
                <span className="cvRarity" data-r={f.rarity}>{f.rarity}</span>
                <div className="cvFigureName">{f.name}</div>
                <div className="cvFigureMeta">
                  {[f.movie, summary.subcategories.length > 1 ? f.subcategory : ""].filter(Boolean).join(" · ") || "\u00a0"}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="cvSide">
          <div className="cvBox">
            <div className="cvBoxTitle">Track {summary.name}</div>
            <div className="cvBoxText">
              Mark what you have, need and can trade from this series, and watch your progress bar fill up. Free for every collector.
            </div>
            <div className="cvBtnRow">
              <Link href={`/collection?series=${encodeURIComponent(summary.name)}`} className="cvBtn">Open in tracker</Link>
              <Link href="/demo" className="cvBtn cvBtnGhost">Free demo</Link>
            </div>
          </div>
          {(prev || next) && (
            <div className="cvBox">
              <div className="cvBoxTitle">Main series</div>
              <div className="cvChips">
                {prev && <Link className="cvChip" href={`/series/${prev.slug}`}>← {prev.name}</Link>}
                {next && <Link className="cvChip" href={`/series/${next.slug}`}>{next.name} →</Link>}
              </div>
            </div>
          )}
          {groupPeers.length > 0 && (
            <div className="cvBox">
              <div className="cvBoxTitle">More {SERIES_GROUP_LABELS[summary.group].title.toLowerCase()}</div>
              <div className="cvChips">
                {groupPeers.slice(0, 12).map((s) => (
                  <Link key={s.slug} className="cvChip" href={`/series/${s.slug}`}>{s.name}</Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <p className="cvFine">
        Checklist data comes from the Adorable Vault catalog and published collector checklists. Spot a mistake or a
        missing figure? Let us know on the <Link className="cvLink" href="/feedback">feedback page</Link>. Adorable Vault is
        fan-made and not affiliated with Disney or Just Play.
      </p>
    </div>
  );
}
