import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_URL } from "../../lib/seo";
import { getCatalog, summarizeSeries, SERIES_GROUP_LABELS, type SeriesGroup } from "../../lib/catalog";
import "../content.css";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Every Disney Doorables Series & Set: Checklists",
  description:
    "Browse every Disney Doorables series and set with full checklists: main series 1 to 16, Star Wars Galaxy Peek, Marvel, themed lines, seasonal releases and Collection Peeks.",
  path: "/series",
});

const GROUPS: SeriesGroup[] = ["main", "starwars-marvel", "lines", "sets"];
const fmt = (n: number) => n.toLocaleString("en-US");

export default async function SeriesHub() {
  const figures = await getCatalog();
  const series = summarizeSeries(figures);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Disney Doorables series and sets",
    url: `${SITE_URL}/series`,
    hasPart: series.map((s) => ({ "@type": "WebPage", name: s.name, url: `${SITE_URL}/series/${s.slug}` })),
  };

  return (
    <div className="cvPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="cvCrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span>Series & sets</span>
      </nav>

      <header className="cvHero">
        <div className="cvEyebrow">🗂️ Doorables checklists</div>
        <h1 className="cvTitle">Every Doorables series and set</h1>
        <p className="cvLead">
          Full checklists for every Disney Doorables release in the Adorable Vault catalog, from the original 2018
          Series 1 to the newest releases. Each page lists every figure with its rarity and movie, so you can check
          what you have and what you still need.
        </p>
        {figures.length > 0 && (
          <div className="cvStats">
            <div className="cvStat"><strong>{fmt(figures.length)}</strong><span>Figures in the catalog</span></div>
            <div className="cvStat"><strong>{fmt(series.length)}</strong><span>Series & sets</span></div>
            <div className="cvStat"><strong>{fmt(series.filter((s) => s.group === "main").length)}</strong><span>Main numbered series</span></div>
          </div>
        )}
        <p className="cvSectionText" style={{ marginTop: 16 }}>
          New to the line? Read the <Link className="cvLink" href="/guides/doorables-series-list">complete series overview</Link>{" "}
          or <Link className="cvLink" href="/guides/doorables-rarity-explained">how rarity works</Link>.
        </p>
      </header>

      {series.length === 0 && (
        <p className="cvSectionText">The catalog is temporarily unavailable. Please check back in a few minutes.</p>
      )}

      {GROUPS.map((group) => {
        const list = series.filter((s) => s.group === group);
        if (!list.length) return null;
        const label = SERIES_GROUP_LABELS[group];
        return (
          <section key={group}>
            <h2 className="cvSectionTitle">{label.title}</h2>
            <p className="cvSectionText">{label.text}</p>
            <div className="cvGrid">
              {list.map((s) => (
                <Link key={s.slug} href={`/series/${s.slug}`} className="cvCard" style={{ flexDirection: "row", alignItems: "center" }}>
                  <span className="cvFigureImg" style={{ width: 64, flex: "0 0 64px", fontSize: 26 }}>
                    {s.image ? <img src={s.image} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">💜</span>}
                  </span>
                  <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <span className="cvCardTitle" style={{ fontSize: 16 }}>{s.name}</span>
                    <span className="cvCardText" style={{ fontSize: 13 }}>
                      {fmt(s.count)} figures{s.subcategories.length === 1 ? ` · ${s.subcategories[0]}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <p className="cvFine">
        Adorable Vault is a fan-made collection tracker and is not affiliated with, sponsored by, or endorsed by Disney
        or Just Play. Character names are used only to help collectors identify figures.
      </p>
    </div>
  );
}
