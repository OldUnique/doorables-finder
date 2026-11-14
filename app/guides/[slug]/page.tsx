import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Prose, { headingsOf } from "../../../components/Prose";
import { RarityTable, SeriesTable } from "../../../components/CatalogTables";
import { getCatalog, summarizeSeries } from "../../../lib/catalog";
import { GUIDES, getGuide } from "../../../lib/guides";
import { GUIDE_BODIES } from "../../../lib/guides/content";
import { pageMetadata, SITE_NAME, SITE_URL } from "../../../lib/seo";
import "../../content.css";

// Live catalog tables refresh at most once an hour.
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const base = pageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}` });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", modifiedTime: guide.updated },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const body = GUIDE_BODIES[slug];
  if (!guide || !body) notFound();

  const needsCatalog = body.includes("[[rarity-table]]") || body.includes("[[series-table]]");
  const figures = needsCatalog ? await getCatalog() : [];
  const slots = {
    "rarity-table": <RarityTable figures={figures} />,
    "series-table": <SeriesTable series={summarizeSeries(figures)} />,
  };

  const toc = headingsOf(body);
  const index = GUIDES.findIndex((g) => g.slug === slug);
  const related = [...GUIDES.slice(index + 1), ...GUIDES.slice(0, index)].slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      dateModified: guide.updated,
      datePublished: "2026-11-14",
      mainEntityOfPage: `${SITE_URL}/guides/${guide.slug}`,
      author: { "@type": "Person", name: "Josh, Adorable Vault" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
        { "@type": "ListItem", position: 3, name: guide.title, item: `${SITE_URL}/guides/${guide.slug}` },
      ],
    },
  ];

  return (
    <div className="cvPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="cvCrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link href="/guides">Guides</Link>
        <span aria-hidden="true">›</span>
        <span>{guide.shortTitle}</span>
      </nav>

      <header className="cvHero">
        <div className="cvEyebrow">
          {guide.emoji} {guide.category}
        </div>
        <h1 className="cvTitle">{guide.title}</h1>
        <p className="cvLead">{guide.description}</p>
        <div className="cvMeta">
          <span className="cvPill">⏱️ {guide.readMinutes} min read</span>
          <span className="cvPill">✍️ By Josh, Adorable Vault</span>
          <span className="cvPill">🗓️ Updated {formatDate(guide.updated)}</span>
        </div>
      </header>

      <div className="cvLayout">
        <article className="cvArticle">
          <div className="cvProse">
            <Prose source={body} slots={slots} />
          </div>
        </article>

        <aside className="cvSide">
          {toc.length > 2 && (
            <div className="cvBox cvTocBox">
              <div className="cvBoxTitle">In this guide</div>
              <ul className="cvToc">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="cvBox">
            <div className="cvBoxTitle">Track your Doorables</div>
            <div className="cvBoxText">
              Mark what you have, need and can trade, and watch every series fill up. Free for every collector.
            </div>
            <div className="cvBtnRow">
              <Link href="/demo" className="cvBtn">Try the free demo</Link>
            </div>
          </div>
        </aside>
      </div>

      <section>
        <h2 className="cvSectionTitle">Keep reading</h2>
        <div className="cvGrid">
          {related.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="cvCard">
              <span className="cvCardEmoji" aria-hidden="true">{g.emoji}</span>
              <span className="cvCardTitle">{g.title}</span>
              <span className="cvCardText">{g.description}</span>
              <span className="cvCardMeta">{g.readMinutes} min read →</span>
            </Link>
          ))}
        </div>
        <div className="cvBtnRow" style={{ marginTop: 14 }}>
          <Link href="/guides" className="cvBtn cvBtnGhost">All guides</Link>
          <Link href="/series" className="cvBtn cvBtnGhost">All series & sets</Link>
        </div>
      </section>
    </div>
  );
}
