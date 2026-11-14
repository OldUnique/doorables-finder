import Link from "next/link";
import {
  SERIES_GROUP_LABELS,
  rarityRank,
  type CatalogFigure,
  type SeriesGroup,
  type SeriesSummary,
} from "../lib/catalog";

const fmt = (n: number) => n.toLocaleString("en-US");

export function RarityTable({ figures }: { figures: CatalogFigure[] }) {
  if (!figures.length) return null;
  const counts = new Map<string, number>();
  for (const f of figures) counts.set(f.rarity, (counts.get(f.rarity) || 0) + 1);
  const rows = Array.from(counts, ([rarity, count]) => ({ rarity, count })).sort(
    (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity)
  );
  const total = figures.length;

  return (
    <div className="cvTableWrap">
      <table className="cvTable">
        <thead>
          <tr>
            <th>Rarity label</th>
            <th className="num">Figures</th>
            <th className="num">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rarity}>
              <td>{r.rarity}</td>
              <td className="num">{fmt(r.count)}</td>
              <td className="num">{((r.count / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>All figures in the catalog</strong>
            </td>
            <td className="num">{fmt(total)}</td>
            <td className="num">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const GROUP_ORDER: SeriesGroup[] = ["main", "starwars-marvel", "lines", "sets"];

export function SeriesTable({ series }: { series: SeriesSummary[] }) {
  if (!series.length) {
    return (
      <p>
        The live list is temporarily unavailable. You can still browse every series on the <Link href="/series">series page</Link>.
      </p>
    );
  }
  return (
    <>
      {GROUP_ORDER.map((group) => {
        const rows = series.filter((s) => s.group === group);
        if (!rows.length) return null;
        const label = SERIES_GROUP_LABELS[group];
        return (
          <section key={group}>
            <h3 className="cvGroupTitle">{label.title}</h3>
            <p className="cvGroupText">{label.text}</p>
            <div className="cvTableWrap">
              <table className="cvTable">
                <thead>
                  <tr>
                    <th>Series or set</th>
                    <th>Theme / waves</th>
                    <th className="num">Figures</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.slug}>
                      <td>
                        <Link href={`/series/${s.slug}`}>{s.name}</Link>
                      </td>
                      <td>{s.subcategories.slice(0, 3).join(", ") || "—"}</td>
                      <td className="num">{fmt(s.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
