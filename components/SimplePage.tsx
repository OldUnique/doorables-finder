import Link from "next/link";
import Prose from "./Prose";
import "../app/content.css";

// Server-rendered text page (privacy, terms, contact) sharing the guide typography.
export default function SimplePage({
  eyebrow,
  title,
  lead,
  body,
  updated,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  updated?: string;
}) {
  return (
    <div className="cvPage" style={{ maxWidth: 880 }}>
      <nav className="cvCrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span>{title}</span>
      </nav>
      <header className="cvHero">
        <div className="cvEyebrow">{eyebrow}</div>
        <h1 className="cvTitle">{title}</h1>
        <p className="cvLead">{lead}</p>
        {updated && (
          <div className="cvMeta">
            <span className="cvPill">🗓️ Last updated {updated}</span>
          </div>
        )}
      </header>
      <article className="cvArticle" style={{ marginTop: 24 }}>
        <div className="cvProse">
          <Prose source={body} />
        </div>
      </article>
    </div>
  );
}
