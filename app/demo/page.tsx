"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type ViewMode = "cards" | "list";

type DemoCard = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  subcategory: string;
  movie: string;
  image: string;
  qty: number;
  note: string;
};

type Theme = {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
};

const STARTING_DEMO_CARDS: DemoCard[] = [
  {
    id: "1",
    name: "Blue Buddy",
    series: "Series 5",
    rarity: "Rare",
    subcategory: "Classic Finds",
    movie: "Sample Story",
    image: "🩵",
    qty: 2,
    note: "Extra available",
  },
  {
    id: "2",
    name: "Common Cutie",
    series: "Series 1",
    rarity: "Common",
    subcategory: "Original Vault",
    movie: "Sample Movie",
    image: "🌸",
    qty: 0,
    note: "Still needed",
  },
  {
    id: "3",
    name: "Exclusive Gem",
    series: "Princess Glitter & Gold Set",
    rarity: "Exclusive",
    subcategory: "Special Set",
    movie: "Collector Sample",
    image: "👑",
    qty: 3,
    note: "Two extras",
  },
  {
    id: "4",
    name: "Golden Sample",
    series: "Series 10",
    rarity: "Limited Edition",
    subcategory: "Celebrate 100 Years",
    movie: "Preview Dreams",
    image: "💎",
    qty: 0,
    note: "Wishlist example",
  },
  {
    id: "5",
    name: "Sparkle Sample",
    series: "Series 12",
    rarity: "Special Edition",
    subcategory: "Pixel Perfect",
    movie: "Preview Magic",
    image: "💜",
    qty: 1,
    note: "Sample owned card",
  },
  {
    id: "6",
    name: "Ultra Star",
    series: "Series 15",
    rarity: "Ultra Rare",
    subcategory: "In Full Bloom",
    movie: "Sample Adventure",
    image: "⭐",
    qty: 1,
    note: "Harder find example",
  },
];

function rarityTheme(rarity: string): Theme {
  const value = String(rarity || "").toLowerCase().trim();

  if (value.includes("exclusive")) {
    return {
      bg: "#f6e5a8",
      border: "#c89211",
      text: "#332400",
      badgeBg: "#e7bc44",
      badgeText: "#4c3500",
      glow: "rgba(200,146,17,0.22)",
    };
  }

  if (value.includes("special edition")) {
    return {
      bg: "#e6d2ff",
      border: "#7c3aed",
      text: "#2f1458",
      badgeBg: "#c084fc",
      badgeText: "#3b0764",
      glow: "rgba(124,58,237,0.20)",
    };
  }

  if (value.includes("limited edition")) {
    return {
      bg: "#f8ef9b",
      border: "#d4a500",
      text: "#403000",
      badgeBg: "#f2d64c",
      badgeText: "#5c4300",
      glow: "rgba(212,165,0,0.20)",
    };
  }

  if (value.includes("ultra rare")) {
    return {
      bg: "#cfe2ff",
      border: "#2563eb",
      text: "#102a56",
      badgeBg: "#7db7ff",
      badgeText: "#123d92",
      glow: "rgba(37,99,235,0.20)",
    };
  }

  if (value === "rare" || (value.includes("rare") && !value.includes("ultra"))) {
    return {
      bg: "#d5f5df",
      border: "#16a34a",
      text: "#13361d",
      badgeBg: "#7ee29c",
      badgeText: "#14532d",
      glow: "rgba(22,163,74,0.18)",
    };
  }

  return {
    bg: "#f2f4f7",
    border: "#cbd5e1",
    text: "#111827",
    badgeBg: "#e5e7eb",
    badgeText: "#111827",
    glow: "rgba(148,163,184,0.16)",
  };
}

function collectionStatus(qty: number) {
  if (qty > 1) return "Extra";
  if (qty > 0) return "Have";
  return "Need";
}

function seriesSort(a: string, b: string) {
  const aMatch = String(a || "").match(/\d+/);
  const bMatch = String(b || "").match(/\d+/);

  if (aMatch && bMatch) {
    const aNum = Number(aMatch[0]);
    const bNum = Number(bMatch[0]);
    if (aNum !== bNum) return aNum - bNum;
  }

  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function statusColor(status: string) {
  if (status === "Need") return "#7c3aed";
  if (status === "Extra") return "#2563eb";
  return "#166534";
}

export default function DemoVaultPage() {
  const [cards, setCards] = useState<DemoCard[]>(STARTING_DEMO_CARDS);
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [notice, setNotice] = useState("");

  const seriesOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((card) => card.series))).sort(seriesSort)],
    [cards]
  );

  const rarityOptions = useMemo(
    () =>
      ["all", ...Array.from(new Set(cards.map((card) => card.rarity))).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )],
    [cards]
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards
      .filter((card) => {
        const matchesSearch =
          !q ||
          [card.name, card.series, card.rarity, card.subcategory, card.movie, card.note]
            .join(" ")
            .toLowerCase()
            .includes(q);

        const matchesSeries = seriesFilter === "all" || card.series === seriesFilter;
        const matchesRarity = rarityFilter === "all" || card.rarity === rarityFilter;
        const matchesCollection =
          collectionFilter === "all"
            ? true
            : collectionFilter === "have"
              ? card.qty > 0
              : collectionFilter === "need"
                ? card.qty <= 0
                : card.qty > 1;

        return matchesSearch && matchesSeries && matchesRarity && matchesCollection;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [cards, search, seriesFilter, rarityFilter, collectionFilter]);

  const ownedCount = cards.filter((card) => card.qty > 0).length;
  const needCount = cards.filter((card) => card.qty <= 0).length;
  const extrasCount = cards.reduce((sum, card) => sum + Math.max(0, card.qty - 1), 0);
  const completion = Math.round((ownedCount / cards.length) * 100);

  const seriesProgress = useMemo(() => {
    const grouped = new Map<string, { owned: number; total: number; subcategories: string[] }>();

    cards.forEach((card) => {
      const current = grouped.get(card.series) || { owned: 0, total: 0, subcategories: [] };
      current.total += 1;
      if (card.qty > 0) current.owned += 1;
      if (card.subcategory && !current.subcategories.includes(card.subcategory)) {
        current.subcategories.push(card.subcategory);
      }
      grouped.set(card.series, current);
    });

    return Array.from(grouped.entries())
      .map(([series, value]) => ({
        name: series,
        label: value.subcategories.length ? `${series} • ${value.subcategories.join(", ")}` : series,
        owned: value.owned,
        total: value.total,
        percent: value.total ? Math.round((value.owned / value.total) * 100) : 0,
      }))
      .sort((a, b) => seriesSort(a.name, b.name));
  }, [cards]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (seriesFilter !== "all" ? 1 : 0) +
    (rarityFilter !== "all" ? 1 : 0) +
    (collectionFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setSeriesFilter("all");
    setRarityFilter("all");
    setCollectionFilter("all");
  }

  function jumpToSeries(seriesName: string) {
    setSeriesFilter(seriesName);
    window.setTimeout(() => {
      document.getElementById("sample-cards")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function changeQty(cardId: string, amount: number) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              qty: Math.max(0, card.qty + amount),
            }
          : card
      )
    );

    setNotice("Preview updated — your real vault will save changes to your account 💜");
    window.setTimeout(() => setNotice(""), 2800);
  }

  function updateNote(cardId: string, note: string) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, note } : card)));
  }

  function resetDemo() {
    setCards(STARTING_DEMO_CARDS);
    clearFilters();
    setViewMode("cards");
    setNotice("Demo reset to the original sample collection.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168,85,247,0.42) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(59,130,246,0.30) 0%, transparent 26%),
            radial-gradient(circle at 72% 96%, rgba(236,72,153,0.24) 0%, transparent 28%),
            linear-gradient(180deg, #030712 0%, #080b1f 44%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.72) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.58) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.48) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.7;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active,
        .heroLink,
        .primaryButton,
        .secondaryButton,
        .featureCard,
        .mobileSticky a {
          color: inherit;
          text-decoration: none !important;
          text-decoration-line: none !important;
          -webkit-text-decoration-line: none !important;
          border-bottom: none !important;
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1220px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 108px;
        }

        .previewRibbon {
          margin-bottom: 14px;
          border-radius: 999px;
          padding: 11px 16px;
          color: #fef3c7;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 30%),
            linear-gradient(135deg, rgba(236,72,153,0.32), rgba(79,70,229,0.32));
          border: 1px solid rgba(255,255,255,0.20);
          box-shadow: 0 18px 42px rgba(0,0,0,0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-align: center;
          font-weight: 1000;
          line-height: 1.35;
        }

        .previewRibbon span {
          color: rgba(255,255,255,0.9);
          font-weight: 900;
        }

        .notice {
          position: sticky;
          top: 76px;
          z-index: 20;
          margin-bottom: 12px;
          border-radius: 18px;
          padding: 12px 14px;
          color: #065f46;
          background: rgba(236,253,245,0.98);
          border: 1px solid #bbf7d0;
          font-weight: 950;
          box-shadow: 0 16px 32px rgba(0,0,0,0.24);
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: 18px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .samplePanel,
        .whiteCard,
        .marketplacePreview,
        .ctaCard,
        .featureCard,
        .stepCard {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroCard {
          padding: 34px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 32%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.18), transparent 38%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          display: grid;
          align-content: center;
        }

        .samplePanel {
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.18), transparent 34%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.18), transparent 36%),
            linear-gradient(135deg, rgba(15,23,42,0.78), rgba(88,28,135,0.80));
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.35rem, 5.6vw, 4.65rem);
          line-height: 0.93;
          letter-spacing: -2px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 18px;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          line-height: 1.65;
          max-width: 740px;
        }

        .trustRow {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 16px;
        }

        .trustPill {
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 1000;
          color: rgba(255,255,255,0.96);
          background: rgba(15,23,42,0.62);
          border: 1px solid rgba(255,255,255,0.24);
          box-shadow: 0 10px 20px rgba(0,0,0,0.18);
        }

        .trustPill.gold {
          color: #fef3c7;
          background: rgba(126,34,206,0.58);
          border-color: rgba(253,224,71,0.38);
        }

        .heroButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 24px;
        }

        .heroLink,
        .heroLink:visited {
          display: grid;
          grid-template-columns: 50px 1fr;
          gap: 12px;
          align-items: center;
          min-height: 88px;
          border-radius: 24px;
          padding: 14px;
          color: white !important;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,0.58), rgba(79,70,229,0.64));
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .heroLink:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.42);
          box-shadow: 0 22px 42px rgba(0,0,0,0.30), 0 0 26px rgba(168,85,247,0.20);
        }

        .heroLink.alt {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.16), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.66), rgba(15,23,42,0.66));
        }

        .heroLinkIcon {
          width: 50px;
          height: 50px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 27px;
          line-height: 1;
          color: #312e81;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          box-shadow: 0 12px 24px rgba(255,255,255,0.12);
        }

        .heroLinkTitle {
          display: block;
          color: white;
          font-weight: 1000;
          line-height: 1.12;
        }

        .heroLinkSub {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.25;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .statBox {
          border-radius: 22px;
          padding: 16px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
        }

        .statNumber {
          font-size: 34px;
          line-height: 1;
          font-weight: 1000;
          color: #fde68a;
          margin-bottom: 6px;
        }

        .statLabel {
          color: rgba(255,255,255,0.84);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
        }

        .progressPanel {
          border-radius: 24px;
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(236,72,153,0.24), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.88), rgba(15,23,42,0.95));
          border: 1px solid rgba(217,70,239,0.38);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 12px;
          margin-bottom: 12px;
        }

        .progressTrack {
          height: 11px;
          border-radius: 999px;
          background: rgba(255,255,255,0.16);
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #c084fc, #f0abfc);
        }

        .whiteCard {
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.18), transparent 34%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(255,255,255,0.60);
          padding: 20px;
          margin-bottom: 18px;
        }

        .toolbarTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .sectionHeader {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin: 26px 0 12px;
        }

        .eyebrow {
          color: #fef08a;
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .sectionTitle {
          margin: 0;
          font-size: clamp(1.45rem, 3vw, 2.2rem);
          line-height: 1.05;
          letter-spacing: -0.8px;
          font-weight: 1000;
          color: #111827;
        }

        .sectionTitle.light {
          color: white;
        }

        .muted {
          color: #64748b;
          line-height: 1.5;
          font-size: 14px;
          font-weight: 800;
        }

        .muted.light {
          color: rgba(255,255,255,0.80);
        }

        .filterWrap {
          display: grid;
          grid-template-columns: minmax(230px, 1.4fr) auto minmax(160px, 0.7fr) minmax(160px, 0.7fr);
          gap: 10px;
          align-items: center;
        }

        .searchBox,
        .selectBox,
        .noteInput {
          min-height: 50px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          background: white;
          color: #111827;
          padding: 12px 14px;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
        }

        .searchBox:focus,
        .selectBox:focus,
        .noteInput:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 950;
          padding: 9px 13px;
          cursor: pointer;
          font-family: inherit;
        }

        .chip.active {
          background: #4f46e5;
          color: white;
          border-color: transparent;
        }

        .clearButton {
          border: none;
          border-radius: 13px;
          padding: 10px 12px;
          background: #f1f5f9;
          color: #334155;
          font-weight: 950;
          min-height: 42px;
          cursor: pointer;
          font-family: inherit;
        }

        .viewToggle {
          display: inline-flex;
          gap: 6px;
          padding: 6px;
          border-radius: 15px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
        }

        .viewButton {
          min-height: 38px;
          border: none;
          border-radius: 11px;
          padding: 8px 12px;
          color: #3730a3;
          background: transparent;
          font-weight: 950;
          cursor: pointer;
          font-family: inherit;
        }

        .viewButton.active {
          color: white;
          background: #4f46e5;
        }

        .seriesPreviewInside {
          margin-bottom: 18px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e5e7eb;
        }

        .seriesGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .seriesCard {
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: white;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }

        .seriesCard:hover {
          transform: translateY(-2px);
          border-color: #a78bfa;
          box-shadow: 0 12px 24px rgba(124,58,237,0.14);
        }

        .seriesCard.active {
          border-color: #4f46e5;
          box-shadow: 0 12px 24px rgba(79,70,229,0.18);
          background: linear-gradient(180deg, #ffffff, #f5f3ff);
        }

        .seriesName {
          font-size: 14px;
          font-weight: 1000;
          color: #111827;
          margin-bottom: 7px;
          line-height: 1.2;
        }

        .seriesMeta {
          color: #64748b;
          font-size: 13px;
          font-weight: 850;
          margin-bottom: 8px;
        }

        .seriesTrack {
          height: 10px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
        }

        .seriesFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .cardsList {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .demoCard {
          border-radius: 22px;
          padding: 12px;
          border: 4px solid;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
        }

        .imageWrap {
          height: 178px;
          background: rgba(255,255,255,0.90);
          border-radius: 18px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          overflow: hidden;
          padding: 14px;
          font-size: 54px;
        }

        .cardHeader {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: start;
          margin-bottom: 7px;
        }

        .cardTitle {
          font-weight: 1000;
          font-size: 20px;
          line-height: 1.08;
          word-break: break-word;
        }

        .cardSeries {
          opacity: 0.82;
          font-size: 13px;
          font-weight: 850;
          margin-top: 4px;
        }

        .rarityBadge {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 1000;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .cardDetails {
          opacity: 0.86;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
          margin-bottom: 10px;
        }

        .qtyControls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
        }

        .qtyButton {
          width: 46px;
          height: 46px;
          min-width: 46px;
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,0.14);
          background: rgba(255,255,255,0.90);
          color: inherit;
          font-size: 22px;
          font-weight: 1000;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: inherit;
        }

        .qtyValue {
          min-width: 44px;
          text-align: center;
          font-weight: 1000;
          font-size: 22px;
        }

        .statusLine {
          margin-top: 9px;
          margin-bottom: 9px;
          font-weight: 1000;
        }

        .noteInput {
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
        }

        .sampleButton {
          margin-top: 8px;
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          border: none;
          font-weight: 1000;
          font-family: inherit;
        }

        .listCard {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          border-radius: 18px;
          padding: 10px;
          background: rgba(255,255,255,0.96);
          color: #111827;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 18px rgba(0,0,0,0.10);
        }

        .listIcon {
          width: 76px;
          height: 76px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 34px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .listTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
        }

        .listName {
          font-size: 16px;
          font-weight: 1000;
          line-height: 1.15;
        }

        .listMeta {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          margin-top: 3px;
          line-height: 1.35;
        }

        .listControls {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          margin-top: 9px;
        }

        .miniQty {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .miniQty button {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #111827;
          font-size: 20px;
          font-weight: 1000;
          cursor: pointer;
          font-family: inherit;
        }

        .stepsGrid,
        .marketGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .stepCard {
          min-height: 170px;
          padding: 18px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(255,255,255,0.62);
        }

        .stepNumber {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #ec4899, #7c3aed);
          font-weight: 1000;
          margin-bottom: 12px;
          box-shadow: 0 12px 22px rgba(124,58,237,0.24);
        }

        .stepTitle {
          color: #312e81;
          font-size: 19px;
          font-weight: 1000;
          margin-bottom: 7px;
          line-height: 1.08;
        }

        .stepText {
          color: #475569;
          line-height: 1.5;
          font-size: 14px;
          font-weight: 800;
        }

        .marketplacePreview {
          padding: 22px;
          margin-bottom: 18px;
          color: white;
          background:
            radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 32%),
            linear-gradient(135deg, rgba(15,23,42,0.92), rgba(49,46,129,0.88));
        }

        .marketCard {
          border-radius: 21px;
          padding: 14px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
        }

        .marketImage {
          height: 116px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.16);
          font-size: 42px;
          margin-bottom: 10px;
        }

        .marketTitle {
          font-weight: 1000;
          line-height: 1.15;
          margin-bottom: 5px;
        }

        .marketMeta {
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 800;
        }

        .ctaCard {
          text-align: center;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 32%),
            linear-gradient(135deg, rgba(79,70,229,0.88), rgba(147,51,234,0.86));
          border: 1px solid rgba(255,255,255,0.16);
        }

        .ctaTitle {
          margin: 0;
          font-size: clamp(1.9rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -1.2px;
          font-weight: 1000;
        }

        .ctaText {
          margin: 12px auto 0;
          max-width: 720px;
          color: rgba(255,255,255,0.86);
          line-height: 1.6;
          font-weight: 800;
        }

        .ctaButtons {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
        }

        .primaryButton,
        .secondaryButton,
        .primaryButton:visited,
        .secondaryButton:visited {
          min-height: 52px;
          border-radius: 999px;
          padding: 14px 20px;
          font-weight: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .primaryButton {
          color: #312e81 !important;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton {
          color: white !important;
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .mobileSticky {
          display: none;
        }

        @media (max-width: 1100px) {
          .filterWrap {
            grid-template-columns: 1fr;
          }

          .seriesGrid,
          .stepsGrid,
          .marketGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .shell {
            padding: 12px;
            padding-bottom: 92px;
          }

          .previewRibbon {
            border-radius: 20px;
            padding: 10px 12px;
            font-size: 12px;
            display: grid;
            gap: 3px;
          }

          .previewRibbon span {
            display: block;
            font-size: 11px;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }

          .heroCard,
          .samplePanel,
          .whiteCard,
          .marketplacePreview,
          .ctaCard,
          .featureCard,
          .stepCard {
            border-radius: 22px;
          }

          .heroCard {
            padding: 18px;
          }

          .badge {
            margin-bottom: 11px;
            padding: 7px 10px;
            font-size: 12px;
          }

          .headline {
            font-size: clamp(1.85rem, 9.4vw, 2.75rem);
            line-height: 0.98;
            letter-spacing: -1.3px;
          }

          .heroText {
            margin-top: 12px;
            font-size: 14px;
            line-height: 1.45;
          }

          .trustRow {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }

          .trustRow::-webkit-scrollbar {
            display: none;
          }

          .trustPill {
            flex: 0 0 auto;
            font-size: 11px;
            padding: 7px 10px;
          }

          .heroButtons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 14px;
          }

          .heroLink,
          .heroLink:visited {
            aspect-ratio: 1 / 1;
            min-height: 0;
            padding: 12px 10px;
            border-radius: 20px;
            grid-template-columns: 1fr;
            gap: 8px;
            text-align: center;
            align-content: center;
            justify-items: center;
          }

          .heroLinkIcon {
            width: 50px;
            height: 50px;
            border-radius: 16px;
            font-size: 26px;
          }

          .heroLinkTitle {
            font-size: 14px;
            line-height: 1.2;
          }

          .heroLinkSub {
            display: none;
          }

          .samplePanel {
            padding: 13px;
          }

          .statsGrid {
            gap: 8px;
          }

          .statBox {
            padding: 11px;
            border-radius: 17px;
            text-align: center;
          }

          .statNumber {
            font-size: 24px;
          }

          .statLabel {
            font-size: 11px;
          }

          .progressPanel {
            padding: 13px;
            border-radius: 18px;
          }

          .toolbarTop,
          .sectionHeader {
            display: grid;
            gap: 8px;
            margin-bottom: 10px;
          }

          .whiteCard {
            padding: 14px;
            margin-bottom: 12px;
          }

          .sectionTitle {
            font-size: clamp(1.28rem, 6vw, 1.6rem);
            letter-spacing: -0.5px;
          }

          .muted {
            font-size: 12.5px;
            line-height: 1.45;
          }

          .searchBox,
          .selectBox {
            min-height: 46px;
            padding: 10px 12px;
            border-radius: 14px;
            font-size: 14px;
          }

          .chipRow {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 7px;
          }

          .chip {
            min-height: 42px;
            padding: 8px 7px;
            font-size: 12px;
          }

          .viewToggle {
            width: 100%;
            box-sizing: border-box;
          }

          .viewButton {
            flex: 1;
          }

          .seriesPreviewInside {
            margin-bottom: 14px;
            padding-bottom: 14px;
          }

          .seriesGrid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .seriesCard {
            padding: 11px;
            border-radius: 15px;
          }

          .cardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .demoCard {
            border-radius: 18px;
            padding: 9px;
            border-width: 3px;
          }

          .imageWrap {
            height: 112px;
            border-radius: 15px;
            font-size: 40px;
            padding: 8px;
          }

          .cardTitle {
            font-size: 14px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .cardSeries,
          .cardDetails {
            font-size: 11px;
          }

          .rarityBadge {
            font-size: 10px;
            padding: 5px 8px;
          }

          .qtyButton {
            width: 36px;
            height: 36px;
            min-width: 36px;
            border-radius: 12px;
          }

          .qtyValue {
            font-size: 19px;
          }

          .noteInput {
            min-height: 38px;
            font-size: 12px;
            padding: 8px 9px;
          }

          .sampleButton {
            min-height: 38px;
            font-size: 12px;
          }

          .listControls {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .listControls .sampleButton {
            grid-column: 1 / -1;
          }

          .stepsGrid,
          .marketGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .stepCard {
            min-height: 0;
            padding: 14px;
            display: grid;
            grid-template-columns: 44px 1fr;
            gap: 11px;
            align-items: start;
          }

          .stepNumber {
            margin-bottom: 0;
          }

          .stepTitle {
            font-size: 16px;
            margin-bottom: 5px;
          }

          .stepText {
            font-size: 12.5px;
            line-height: 1.45;
          }

          .marketplacePreview {
            padding: 15px;
            margin-bottom: 12px;
          }

          .marketImage {
            height: 96px;
          }

          .ctaCard {
            display: none;
          }

          .mobileSticky {
            position: fixed;
            z-index: 60;
            left: 12px;
            right: 12px;
            bottom: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-radius: 18px;
            background: rgba(15,23,42,0.9);
            border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 40px rgba(0,0,0,0.36);
          }

          .mobileSticky a {
            min-height: 42px;
            border-radius: 15px;
            padding: 10px 12px;
            font-size: 12.5px;
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          }

          .mobileSticky .primaryButton {
            background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.38);
            box-shadow: 0 12px 28px rgba(124,58,237,0.44);
          }

          .mobileSticky .secondaryButton {
            background: linear-gradient(135deg, #f59e0b, #f97316);
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.38);
            box-shadow: 0 12px 28px rgba(249,115,22,0.34);
          }
        }

        @media (max-width: 560px) {
          .cardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .heroButtons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .listCard {
            grid-template-columns: 64px minmax(0, 1fr);
            padding: 9px;
          }

          .listIcon {
            width: 64px;
            height: 64px;
            font-size: 30px;
          }

          .listTop {
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
            box-sizing: border-box;
          }

          .ctaButtons {
            display: grid;
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 390px) {
          .headline {
            font-size: 1.72rem;
          }

          .heroLinkTitle {
            font-size: 13px;
          }

          .cardsGrid {
            grid-template-columns: 1fr;
          }

          .imageWrap {
            height: 140px;
          }

          .chipRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mobileSticky {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <div className="previewRibbon">
          👀 Preview mode
          <span>Tap around, test filters, change quantities, and see the vibe. Nothing here saves to an account.</span>
        </div>

        {notice ? <div className="notice">{notice}</div> : null}

        <section className="hero">
          <div className="heroCard">
            <div className="badge">✨ No signup preview ✨</div>
            <h1 className="headline">Try the vault before you start your real collection.</h1>
            <div className="heroText">
              This sample page shows what Adorable Vault feels like: colorful rarity cards, quick filters,
              Have / Need / Extras tracking, series progress, notes, and a cleaner marketplace-style flow.
            </div>

            <div className="trustRow">
              <span className="trustPill gold">No ads. Ever.</span>
              <span className="trustPill">Free up to 50 saves</span>
              <span className="trustPill">A–Z browsing</span>
              <span className="trustPill">Mobile-friendly</span>
              <span className="trustPill">Marketplace tools</span>
            </div>

            <div className="heroButtons">
              <Link href="/collection" className="heroLink">
                <span className="heroLinkIcon">💜</span>
                <span>
                  <span className="heroLinkTitle">Start your real vault</span>
                  <span className="heroLinkSub">Save up to 50 Doorables free</span>
                </span>
              </Link>

              <Link href="/pricing" className="heroLink alt">
                <span className="heroLinkIcon">👑</span>
                <span>
                  <span className="heroLinkTitle">Unlock full access</span>
                  <span className="heroLinkSub">Unlimited tracking + marketplace tools</span>
                </span>
              </Link>
            </div>
          </div>

          <aside className="samplePanel">
            <div className="statsGrid">
              <div className="statBox">
                <div className="statNumber">{ownedCount}</div>
                <div className="statLabel">sample owned</div>
              </div>
              <div className="statBox">
                <div className="statNumber">{needCount}</div>
                <div className="statLabel">sample needed</div>
              </div>
              <div className="statBox">
                <div className="statNumber">{extrasCount}</div>
                <div className="statLabel">sample extras</div>
              </div>
              <div className="statBox">
                <div className="statNumber">{completion}%</div>
                <div className="statLabel">sample complete</div>
              </div>
            </div>

            <div className="progressPanel">
              <div className="progressTop">
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 19 }}>Preview collection progress</div>
                  <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                    Your real vault starts fresh and saves to your account.
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#fde68a" }}>{completion}%</div>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </aside>
        </section>

        <section className="whiteCard">
          <div className="seriesPreviewInside">
            <div className="toolbarTop">
              <div>
                <h2 className="sectionTitle">Series progress preview</h2>
                <div className="muted">
                  Click a series to jump into matching sample cards, just like the real collection page.
                </div>
              </div>

              <button type="button" className="clearButton" onClick={resetDemo}>
                Reset Demo
              </button>
            </div>

            <div className="seriesGrid">
              {seriesProgress.map((series) => (
                <button
                  key={series.name}
                  type="button"
                  onClick={() => jumpToSeries(series.name)}
                  className={`seriesCard ${seriesFilter === series.name ? "active" : ""}`}
                >
                  <div className="seriesName">{series.label}</div>
                  <div className="seriesMeta">
                    {series.owned}/{series.total} collected • {series.percent}%
                  </div>
                  <div className="seriesTrack">
                    <div className="seriesFill" style={{ width: `${series.percent}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div id="sample-cards" className="toolbarTop">
            <div>
              <h2 className="sectionTitle">Sample tracker cards</h2>
              <div className="muted">
                Showing {filteredCards.length} of {cards.length}
                {activeFilterCount ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
                {viewMode === "list" ? " • List view" : " • Card view"}
              </div>
            </div>

            <div className="viewToggle" aria-label="Demo view mode">
              <button
                type="button"
                className={`viewButton ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                Cards
              </button>
              <button
                type="button"
                className={`viewButton ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
          </div>

          <div className="filterWrap">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample name, series, rarity, movie..."
              className="searchBox"
            />

            <div className="chipRow">
              {[
                { value: "all", label: "All" },
                { value: "have", label: "Have" },
                { value: "need", label: "Need" },
                { value: "extra", label: "Extras" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip ${collectionFilter === option.value ? "active" : ""}`}
                  onClick={() => setCollectionFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="selectBox"
            >
              {seriesOptions.map((series) => (
                <option key={series} value={series}>
                  {series === "all" ? "All Series" : series}
                </option>
              ))}
            </select>

            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="selectBox"
            >
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity === "all" ? "All Rarities" : rarity}
                </option>
              ))}
            </select>
          </div>

          {activeFilterCount > 0 ? (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="clearButton" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : null}

          <div className={viewMode === "list" ? "cardsList" : "cardsGrid"}>
            {filteredCards.length === 0 ? (
              <div className="muted" style={{ gridColumn: "1 / -1", padding: 18 }}>
                No sample cards match that filter yet. Try clearing filters.
              </div>
            ) : (
              filteredCards.map((card) => {
                const theme = rarityTheme(card.rarity);
                const status = collectionStatus(card.qty);

                if (viewMode === "list") {
                  return (
                    <div key={card.id} className="listCard" style={{ borderLeft: `6px solid ${theme.border}` }}>
                      <div className="listIcon">{card.image}</div>

                      <div style={{ minWidth: 0 }}>
                        <div className="listTop">
                          <div>
                            <div className="listName">{card.name}</div>
                            <div className="listMeta">
                              {card.series} • {card.subcategory} • {card.movie}
                            </div>
                          </div>
                          <div
                            className="rarityBadge"
                            style={{ background: theme.badgeBg, color: theme.badgeText }}
                          >
                            {card.rarity}
                          </div>
                        </div>

                        <div className="statusLine" style={{ color: statusColor(status) }}>
                          {status}
                        </div>

                        <div className="listControls">
                          <div className="miniQty">
                            <button type="button" onClick={() => changeQty(card.id, -1)}>
                              −
                            </button>
                            <strong>{card.qty}</strong>
                            <button type="button" onClick={() => changeQty(card.id, 1)}>
                              +
                            </button>
                          </div>

                          <input
                            value={card.note}
                            onChange={(e) => updateNote(card.id, e.target.value)}
                            className="noteInput"
                            placeholder="Sample note..."
                          />

                          <button type="button" className="sampleButton" onClick={() => setNotice("Sample note updated — real notes save in your vault 💜")}>
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={card.id}
                    className="demoCard"
                    style={
                      {
                        background: `linear-gradient(rgba(0,0,0,0.07), rgba(0,0,0,0.07)), ${theme.bg}`,
                        borderColor: theme.border,
                        color: theme.text,
                        boxShadow: `0 12px 28px rgba(0,0,0,0.14), 0 0 18px ${theme.glow}`,
                      } as CSSProperties
                    }
                  >
                    <div className="imageWrap">{card.image}</div>

                    <div className="cardHeader">
                      <div>
                        <div className="cardTitle">{card.name}</div>
                        <div className="cardSeries">{card.series}</div>
                      </div>
                      <div
                        className="rarityBadge"
                        style={{ background: theme.badgeBg, color: theme.badgeText }}
                      >
                        {card.rarity}
                      </div>
                    </div>

                    <div className="cardDetails">
                      <div>{card.subcategory}</div>
                      <div>🎬 {card.movie}</div>
                    </div>

                    <div className="qtyControls">
                      <button type="button" className="qtyButton" onClick={() => changeQty(card.id, -1)}>
                        −
                      </button>
                      <div className="qtyValue">{card.qty}</div>
                      <button type="button" className="qtyButton" onClick={() => changeQty(card.id, 1)}>
                        +
                      </button>
                    </div>

                    <div className="statusLine" style={{ color: statusColor(status) }}>
                      {status}
                    </div>

                    <input
                      value={card.note}
                      onChange={(e) => updateNote(card.id, e.target.value)}
                      className="noteInput"
                      placeholder="Sample note..."
                    />

                    <button
                      type="button"
                      className="sampleButton"
                      style={{ background: theme.badgeBg, color: theme.badgeText }}
                      onClick={() => {
                        setNotice("Sample note updated — real notes save in your vault 💜");
                        window.setTimeout(() => setNotice(""), 2600);
                      }}
                    >
                      Save Note
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="sectionHeader">
          <div>
            <div className="eyebrow">How the real vault works</div>
            <h2 className="sectionTitle light">Simple enough for your phone. Useful enough for serious collectors.</h2>
          </div>
          <div className="muted light">
            The demo is sample data, but the workflow is the same idea you will use in your real account.
          </div>
        </section>

        <section className="stepsGrid">
          <div className="stepCard">
            <div className="stepNumber">1</div>
            <div>
              <div className="stepTitle">Search fast</div>
              <div className="stepText">
                Search by name, series, rarity, movie, or notes when you are shopping, watching a live sale, or trading.
              </div>
            </div>
          </div>

          <div className="stepCard">
            <div className="stepNumber">2</div>
            <div>
              <div className="stepTitle">Tap to track</div>
              <div className="stepText">
                Use quantity buttons to move items between Need, Have, and Extras without a spreadsheet.
              </div>
            </div>
          </div>

          <div className="stepCard">
            <div className="stepNumber">3</div>
            <div>
              <div className="stepTitle">Share or sell</div>
              <div className="stepText">
                Use public profiles, extras, and marketplace tools to make collecting easier with other collectors.
              </div>
            </div>
          </div>
        </section>

        <section className="marketplacePreview">
          <div className="toolbarTop">
            <div>
              <h2 className="sectionTitle light">Marketplace preview</h2>
              <div className="muted light">
                A quick look at how extras and listings can feel organized without turning into chaos.
              </div>
            </div>
          </div>

          <div className="marketGrid">
            {[
              { icon: "💜", title: "Sparkle Sample Extra", price: "$4.00", meta: "Shipping or local pickup • Message seller" },
              { icon: "💎", title: "Golden Sample ISO", price: "Message for price", meta: "Wishlist style listing • Collector to collector" },
              { icon: "👑", title: "Exclusive Gem Bundle", price: "$8.00", meta: "Sample marketplace card • Full access feature" },
            ].map((item) => (
              <div key={item.title} className="marketCard">
                <div className="marketImage">{item.icon}</div>
                <div className="marketTitle">{item.title}</div>
                <div style={{ color: "#fde68a", fontWeight: 1000, marginBottom: 6 }}>
                  {item.price}
                </div>
                <div className="marketMeta">{item.meta}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ctaCard">
          <h2 className="ctaTitle">Ready to make your real vault? 💜</h2>
          <div className="ctaText">
            This preview is just sample data. Start free to save up to 50 Doorables, or upgrade for unlimited
            tracking, selling tools, marketplace access, and full collector features.
          </div>

          <div className="ctaButtons">
            <Link href="/collection" className="primaryButton">
              Start Free Tracking
            </Link>
            <Link href="/pricing" className="secondaryButton">
              View Plans + Founding Bundle
            </Link>
          </div>
        </section>
      </div>

      <div className="mobileSticky">
        <Link href="/collection" className="primaryButton">
          💜 Start Free
        </Link>
        <Link href="/pricing" className="secondaryButton">
          👑 Plans
        </Link>
      </div>
    </main>
  );
}
