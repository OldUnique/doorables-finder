"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

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

const demoCards: DemoCard[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
    name: "Ultra Star",
    series: "Series 15",
    rarity: "Ultra Rare",
    subcategory: "In Full Bloom",
    movie: "Sample Adventure",
    image: "⭐",
    qty: 1,
    note: "Harder find example",
  },
  {
    id: "5",
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
    id: "6",
    name: "Exclusive Gem",
    series: "Princess Glitter & Gold Set",
    rarity: "Exclusive",
    subcategory: "Special Set",
    movie: "Collector Sample",
    image: "👑",
    qty: 3,
    note: "Two extras",
  },
];

function rarityTheme(rarity: string): Theme {
  const value = String(rarity || "").toLowerCase().trim();

  if (value === "exclusive" || value.includes("exclusive")) {
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

export default function DemoVaultPage() {
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");

  const seriesOptions = useMemo(
    () => ["all", ...Array.from(new Set(demoCards.map((card) => card.series))).sort(seriesSort)],
    []
  );

  const rarityOptions = useMemo(
    () => ["all", ...Array.from(new Set(demoCards.map((card) => card.rarity))).sort()],
    []
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return demoCards.filter((card) => {
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
    });
  }, [search, seriesFilter, rarityFilter, collectionFilter]);

  const ownedCount = demoCards.filter((card) => card.qty > 0).length;
  const needCount = demoCards.filter((card) => card.qty <= 0).length;
  const extrasCount = demoCards.reduce((sum, card) => sum + Math.max(0, card.qty - 1), 0);
  const completion = Math.round((ownedCount / demoCards.length) * 100);

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

  const previewSeriesProgress = [
    { name: "Series 12", label: "Series 12 • Pixel Perfect", owned: 1, total: 1, percent: 100 },
    { name: "Series 10", label: "Series 10 • Celebrate 100 Years", owned: 0, total: 1, percent: 0 },
    { name: "Princess Glitter & Gold Set", label: "Princess Glitter & Gold Set", owned: 1, total: 1, percent: 100 },
    { name: "Series 5", label: "Series 5 • Classic Finds", owned: 1, total: 1, percent: 100 },
    { name: "Series 15", label: "Series 15 • In Full Bloom", owned: 1, total: 1, percent: 100 },
    { name: "Series 1", label: "Series 1 • Original Vault", owned: 0, total: 1, percent: 0 },
  ];

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168,85,247,0.44) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(59,130,246,0.32) 0%, transparent 26%),
            radial-gradient(circle at 72% 96%, rgba(236,72,153,0.26) 0%, transparent 28%),
            linear-gradient(180deg, #030712 0%, #080b1f 44%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.84) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.72) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.62) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.7;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1220px;
          margin: 0 auto;
          padding: 20px 22px 96px;
        }

        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          min-width: 0;
        }

        .brandIcon {
          width: 62px;
          height: 62px;
          border-radius: 21px;
          display: grid;
          place-items: center;
          font-size: 34px;
          background: radial-gradient(circle at top left, #fef3c7, #a855f7 48%, #020617);
          box-shadow: 0 18px 38px rgba(168,85,247,0.42);
          flex: 0 0 auto;
        }

        .brandTitle {
          display: block;
          font-size: clamp(1.55rem, 4vw, 2.35rem);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -1px;
          background: linear-gradient(90deg, #fef3c7, #f0abfc, #bfdbfe);
          -webkit-background-clip: text;
          color: transparent;
        }

        .brandSub {
          display: block;
          margin-top: 5px;
          color: #d8b4fe;
          font-weight: 950;
          font-size: 14px;
        }

        .navActions {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .navPill,
        .navPill:visited {
          color: white;
          text-decoration: none;
          font-weight: 950;
          padding: 11px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 10px 24px rgba(0,0,0,0.15);
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
        .ctaCard {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroCard {
          padding: 32px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 32%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
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
          font-size: clamp(2.25rem, 5.6vw, 4.3rem);
          line-height: 0.94;
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

        .heroButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 22px;
        }

        .heroLink,
        .heroLink:visited {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 12px;
          align-items: center;
          min-height: 80px;
          border-radius: 23px;
          padding: 13px;
          color: white;
          text-decoration: none;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,0.58), rgba(79,70,229,0.58));
          border: 1px solid rgba(255,255,255,0.20);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .heroLink.alt {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.14), transparent 34%),
            linear-gradient(135deg, rgba(88,28,135,0.68), rgba(15,23,42,0.58));
        }

        .heroLinkIcon {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          font-size: 25px;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          color: #312e81;
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
          background: linear-gradient(180deg, #ffffff, #f8fafc);
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

        .sectionTitle {
          font-size: clamp(1.45rem, 3vw, 2.15rem);
          line-height: 1.05;
          letter-spacing: -0.8px;
          font-weight: 1000;
          color: #111827;
          margin: 0;
        }

        .muted {
          color: #64748b;
          line-height: 1.5;
          font-size: 14px;
          font-weight: 800;
        }

        .filterWrap {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .searchBox,
        .selectBox {
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

        .searchBox {
          flex: 1 1 300px;
          min-width: 260px;
        }

        .searchBox:focus,
        .selectBox:focus {
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
        }

        .chip.active {
          background: #4f46e5;
          color: white;
        }

        .clearButton {
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          background: #f1f5f9;
          color: #334155;
          font-weight: 900;
          min-height: 42px;
          cursor: pointer;
        }

        .seriesPreviewInside {
          margin-bottom: 18px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e5e7eb;
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .demoCard {
          border-radius: 22px;
          padding: 12px;
          border: 4px solid var(--border);
          background:
            linear-gradient(rgba(0,0,0,0.07), rgba(0,0,0,0.07)),
            var(--bg);
          color: var(--text);
          box-shadow:
            0 12px 28px rgba(0,0,0,0.14),
            0 0 18px var(--glow);
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
          background: var(--badge-bg);
          color: var(--badge-text);
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
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.90);
          color: var(--text);
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: default;
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

        .notePreview {
          width: 100%;
          box-sizing: border-box;
          margin-top: 8px;
          min-height: 56px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.82);
          padding: 10px;
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
        }

        .sampleButton {
          margin-top: 8px;
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          border: none;
          font-weight: 1000;
          background: var(--badge-bg);
          color: var(--badge-text);
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

        .marketplacePreview {
          padding: 22px;
          margin-bottom: 18px;
          color: white;
          background:
            radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 32%),
            linear-gradient(135deg, rgba(15,23,42,0.92), rgba(49,46,129,0.88));
        }

        .marketGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
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
          padding: 28px;
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
          max-width: 700px;
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
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .primaryButton {
          color: #312e81;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton {
          color: white;
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .page a,
        .page a:visited {
          color: inherit;
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 76px;
          }

          .topNav {
            align-items: flex-start;
          }

          .navPill:not(.homePill) {
            display: none;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .heroCard,
          .samplePanel,
          .whiteCard,
          .marketplacePreview,
          .ctaCard {
            border-radius: 24px;
          }

          .heroCard {
            padding: 22px;
          }

          .heroButtons {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .seriesGrid,
          .marketGrid {
            grid-template-columns: 1fr;
          }

          .searchBox,
          .selectBox {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 560px) {
          .brandIcon {
            width: 54px;
            height: 54px;
            border-radius: 18px;
            font-size: 29px;
          }

          .brandTitle {
            font-size: 1.55rem;
          }

          .brandSub {
            font-size: 13px;
          }

          .headline {
            font-size: clamp(2rem, 11vw, 3.05rem);
          }

          .statsGrid,
          .cardsGrid {
            grid-template-columns: 1fr;
          }

          .imageWrap {
            height: 150px;
          }

          .ctaButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="shell">
        <nav className="topNav">
          <Link href="/" className="brand">
            <span className="brandIcon">💎</span>
            <span>
              <span className="brandTitle">Adorable Vault</span>
              <span className="brandSub">track • trade • showcase</span>
            </span>
          </Link>

          <div className="navActions">
            <Link href="/" className="navPill homePill">
              Home
            </Link>
            <Link href="/pricing" className="navPill">
              Plans
            </Link>
            <Link href="/collection" className="navPill">
              Start Tracking
            </Link>
          </div>
        </nav>

        <section className="hero">
          <div className="heroCard">
            <div className="badge">👀 No signup preview</div>
            <h1 className="headline">Peek inside the vault before making an account.</h1>
            <div className="heroText">
              This sample page shows what Adorable Vault feels like: colorful rarity cards, have/need/extras,
              quick filters, series progress, and marketplace-style organization. Nothing saves here — it is just a preview.
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
                <div className="statLabel">sample completion</div>
              </div>
            </div>

            <div className="progressPanel">
              <div className="progressTop">
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 19 }}>Preview collection progress</div>
                  <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                    Sample only — your real vault starts fresh.
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

              {seriesFilter !== "all" && (
                <button type="button" className="clearButton" onClick={() => setSeriesFilter("all")}>
                  Show All Series
                </button>
              )}
            </div>

            <div className="seriesGrid">
              {previewSeriesProgress.map((series) => (
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
                Showing {filteredCards.length} of {demoCards.length}
                {activeFilterCount ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button type="button" className="clearButton" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
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

          <div className="cardsGrid">
            {filteredCards.map((card) => {
              const theme = rarityTheme(card.rarity);
              const status = collectionStatus(card.qty);
              const statusColor =
                status === "Need" ? "#7c3aed" : status === "Extra" ? "#2563eb" : "#166534";

              return (
                <div
                  key={card.id}
                  className="demoCard"
                  style={
                    {
                      "--bg": theme.bg,
                      "--border": theme.border,
                      "--text": theme.text,
                      "--badge-bg": theme.badgeBg,
                      "--badge-text": theme.badgeText,
                      "--glow": theme.glow,
                    } as CSSProperties
                  }
                >
                  <div className="imageWrap">{card.image}</div>

                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">{card.name}</div>
                      <div className="cardSeries">{card.series}</div>
                    </div>
                    <div className="rarityBadge">{card.rarity}</div>
                  </div>

                  <div className="cardDetails">
                    <div>{card.subcategory}</div>
                    <div>🎬 {card.movie}</div>
                  </div>

                  <div className="qtyControls">
                    <button type="button" className="qtyButton" aria-label="Preview minus">
                      −
                    </button>
                    <div className="qtyValue">{card.qty}</div>
                    <button type="button" className="qtyButton" aria-label="Preview plus">
                      +
                    </button>
                  </div>

                  <div className="statusLine" style={{ color: statusColor }}>
                    {status}
                  </div>

                  <div className="notePreview">Save note here...</div>
                  <button type="button" className="sampleButton">
                    Save Note
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="marketplacePreview">
          <div className="toolbarTop">
            <div>
              <h2 className="sectionTitle" style={{ color: "white" }}>
                Marketplace preview
              </h2>
              <div className="muted" style={{ color: "rgba(255,255,255,0.78)" }}>
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
    </main>
  );
}
