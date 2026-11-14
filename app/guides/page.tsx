import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_URL } from "../../lib/seo";
import { GUIDES, type GuideMeta } from "../../lib/guides";
import "../content.css";

export const metadata: Metadata = pageMetadata({
  title: "Disney Doorables Collector Guides",
  description:
    "Free, in-depth Disney Doorables guides: what Doorables are, identifying figures, rarity explained, every series and set, display ideas, trading safely, spotting fakes and more.",
  path: "/guides",
});

const CATEGORIES: GuideMeta["category"][] = ["Getting started", "Collecting", "Buying & trading", "Using the vault"];

export default function GuidesHub() {
  const featured = GUIDES[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Disney Doorables Collector Guides",
    url: `${SITE_URL}/guides`,
    hasPart: GUIDES.map((g) => ({
      "@type": "Article",
      headline: g.title,
      url: `${SITE_URL}/guides/${g.slug}`,
    })),
  };

  return (
    <div className="cvPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="cvCrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span>Guides</span>
      </nav>

      <header className="cvHero">
        <div className="cvEyebrow">📖 Collector guides</div>
        <h1 className="cvTitle">Everything you need to know about collecting Doorables</h1>
        <p className="cvLead">
          Practical, collector-written guides to Disney Doorables, from figuring out what you have and what rarity
          labels mean to trading safely, displaying your figures and spotting fakes. Every guide is free, and the
          series facts come straight from the same catalog that powers the Adorable Vault tracker.
        </p>
        <div className="cvMeta">
          <span className="cvPill">📚 {GUIDES.length} guides</span>
          <span className="cvPill">🗂️ Every series & set</span>
          <span className="cvPill">💜 Fan-made & free</span>
        </div>
      </header>

      <Link href={`/guides/${featured.slug}`} className="cvFeatured">
        <span className="cvCardEmoji" aria-hidden="true">{featured.emoji}</span>
        <span>
          <span className="cvEyebrow">Start here</span>
          <span className="cvCardTitle" style={{ display: "block", marginTop: 4 }}>{featured.title}</span>
          <span className="cvCardText" style={{ display: "block", marginTop: 6 }}>{featured.description}</span>
        </span>
      </Link>

      {CATEGORIES.map((cat) => {
        const list = GUIDES.filter((g) => g.category === cat && g.slug !== featured.slug);
        if (!list.length) return null;
        return (
          <section key={cat}>
            <h2 className="cvSectionTitle">{cat}</h2>
            <div className="cvGrid">
              {list.map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="cvCard">
                  <span className="cvCardEmoji" aria-hidden="true">{g.emoji}</span>
                  <span className="cvCardTitle">{g.title}</span>
                  <span className="cvCardText">{g.description}</span>
                  <span className="cvCardMeta">{g.readMinutes} min read →</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <h2 className="cvSectionTitle">Browse every series</h2>
        <p className="cvSectionText">
          Looking for a specific checklist? Every Doorables series and set in the catalog has its own page with the
          full figure list, rarity breakdown and the movies it draws from.
        </p>
        <div className="cvBtnRow">
          <Link href="/series" className="cvBtn">See all series & sets</Link>
          <Link href="/demo" className="cvBtn cvBtnGhost">Try the free tracker demo</Link>
        </div>
      </section>

      <p className="cvFine">
        Adorable Vault is a fan-made site and is not affiliated with, sponsored by, or endorsed by Disney or Just Play.
        Product facts in these guides come from manufacturer descriptions, published collector checklists and the
        Adorable Vault catalog.
      </p>
    </div>
  );
}
