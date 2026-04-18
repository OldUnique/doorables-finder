"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

type Card = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  subcategory: string;
  movie: string;
  image: string;
  qty: number;
  note: string;
  rowId: string | null;
};

type Theme = {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
};

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

function seriesSort(a: string, b: string) {
  const aStr = String(a || "");
  const bStr = String(b || "");
  const aMatch = aStr.match(/\d+/);
  const bMatch = bStr.match(/\d+/);

  if (aMatch && bMatch) {
    const aNum = Number(aMatch[0]);
    const bNum = Number(bMatch[0]);
    if (aNum !== bNum) return aNum - bNum;
  }

  return aStr.localeCompare(bStr, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function collectionStatus(qty: number) {
  if (qty > 1) return "Extra";
  if (qty > 0) return "Have";
  return "Need";
}

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [movieFilter, setMovieFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 920);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter, isMobile]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be signed in.");
        setLoading(false);
        return;
      }

      setUserId(String(user.id));

      const { data: profile } = await supabase
        .from("users")
        .select("is_subscribed")
        .eq("id", user.id)
        .maybeSingle();

      setIsSubscribed(!!profile?.is_subscribed);

      const { data: doorables, error: doorablesError } = await supabase
        .from("doorables")
        .select("*");

      if (doorablesError) {
        setError(doorablesError.message);
        setLoading(false);
        return;
      }

      const { data: userDoorables, error: userDoorablesError } = await supabase
        .from("user_doorables")
        .select("*")
        .eq("user_id", user.id);

      if (userDoorablesError) {
        setError(userDoorablesError.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, any>();
      (userDoorables || []).forEach((row: any) => {
        userMap.set(String(row.doorable_id), row);
      });

      const merged: Card[] = (doorables || [])
        .map((d: any) => {
          const row = userMap.get(String(d.id));
          return {
            id: String(d.id ?? ""),
            name: String(d.name ?? "Unknown"),
            series: String(d.series ?? "Unknown Series"),
            rarity: String(d.rarity ?? "Common"),
            subcategory: String(d.subcategory ?? ""),
            movie: String(d.movie ?? ""),
            image: String(d.image_url ?? ""),
            qty: Number(row?.qty_owned ?? 0),
            note: String(row?.custom_tag ?? ""),
            rowId: row?.id ? String(row.id) : null,
          };
        })
        .sort((a, b) => {
          const bySeries = seriesSort(a.series, b.series);
          if (bySeries !== 0) return bySeries;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

      setCards(merged);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection page crashed while loading.");
      setLoading(false);
    }
  }

  async function saveCard(card: Card, nextQty: number, nextNote: string) {
    try {
      const supabase = getSupabase();
      const qty = Math.max(0, Number(nextQty ?? card.qty ?? 0));
      const note = String(nextNote ?? card.note ?? "");
      const ownedCount = cards.filter((c) => c.qty > 0).length;
      const isAddingNewOwned = card.qty <= 0 && qty > 0;

      if (!isSubscribed && isAddingNewOwned && ownedCount >= 50) {
        setError("Free accounts can save up to 50 Doorables. Upgrade to unlock unlimited collection 💜");
        return;
      }

      setSavingId(card.id);
      setError("");

      const payload = {
        user_id: userId,
        doorable_id: card.id,
        qty_owned: qty,
        wanted: qty <= 0,
        custom_tag: note,
      };

      if (card.rowId) {
        const { error } = await supabase
          .from("user_doorables")
          .update(payload)
          .eq("id", card.rowId);

        if (error) {
          alert("Save failed: " + error.message);
          setSavingId("");
          return;
        }

        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  qty,
                  note,
                }
              : c
          )
        );
      } else {
        const { data, error } = await supabase
          .from("user_doorables")
          .insert([payload])
          .select()
          .single();

        if (error) {
          alert("Save failed: " + error.message);
          setSavingId("");
          return;
        }

        const newRowId = data?.id ? String(data.id) : null;

        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  qty,
                  note,
                  rowId: newRowId,
                }
              : c
          )
        );
      }

      setSavingId("");
    } catch (err) {
      setSavingId("");
      alert("Save failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  const seriesOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.series).filter(Boolean))).sort(seriesSort)],
    [cards]
  );

  const subcategoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.subcategory).filter(Boolean))).sort()],
    [cards]
  );

  const rarityOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.rarity).filter(Boolean))).sort()],
    [cards]
  );

  const movieOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.movie).filter(Boolean))).sort()],
    [cards]
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const detailText = [card.subcategory, card.movie].filter(Boolean).join(" ");

      const matchesSearch =
        !q ||
        [card.name, card.series, card.rarity, detailText, card.note]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesSeries = seriesFilter === "all" || card.series === seriesFilter;
      const matchesSubcategory = subcategoryFilter === "all" || card.subcategory === subcategoryFilter;
      const matchesRarity = rarityFilter === "all" || card.rarity === rarityFilter;
      const matchesMovie = movieFilter === "all" || card.movie === movieFilter;
      const matchesCollection =
        collectionFilter === "all"
          ? true
          : collectionFilter === "have"
            ? card.qty > 0
            : collectionFilter === "need"
              ? card.qty <= 0
              : card.qty > 1;

      return (
        matchesSearch &&
        matchesSeries &&
        matchesSubcategory &&
        matchesRarity &&
        matchesMovie &&
        matchesCollection
      );
    });
  }, [cards, search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter]);

  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;

  const seriesProgress = useMemo(() => {
    const grouped = new Map<
      string,
      { total: number; owned: number; subcategories: string[] }
    >();

    cards.forEach((card) => {
      const key = card.series || "Unknown Series";
      const current = grouped.get(key) || { total: 0, owned: 0, subcategories: [] };

      current.total += 1;
      if (card.qty > 0) current.owned += 1;

      if (card.subcategory && !current.subcategories.includes(card.subcategory)) {
        current.subcategories.push(card.subcategory);
      }

      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([series, value]) => ({
        series,
        total: value.total,
        owned: value.owned,
        percent: value.total ? Math.round((value.owned / value.total) * 100) : 0,
        subcategoryLabel: value.subcategories.join(", "),
      }))
      .sort((a, b) => seriesSort(a.series, b.series));
  }, [cards]);

  function jumpToSeries(seriesName: string) {
    setSeriesFilter(seriesName);
    requestAnimationFrame(() => {
      document.getElementById("cards-grid")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const cardsPerPage = isMobile ? 15 : 30;
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedCards = filteredCards.slice(
    (safePage - 1) * cardsPerPage,
    safePage * cardsPerPage
  );

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: "100vh", background: "radial-gradient(circle at top, #312e81 0%, #0f172a 45%, #020617 100%)", color: "white" }}>
        Loading collection...
      </div>
    );
  }

  if (error && !cards.length) {
    return (
      <div style={{ padding: 24, minHeight: "100vh", background: "radial-gradient(circle at top, #312e81 0%, #0f172a 45%, #020617 100%)", color: "white" }}>
        <h1>Collection Error</h1>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), radial-gradient(circle at 70% 70%, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0) 20%), linear-gradient(180deg, #09090f 0%, #111827 38%, #0f172a 65%, #020617 100%)",
      }}
    >
      <style jsx>{`
        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        @media (min-width: 900px) {
          .cardsGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        .floatCard {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .floatCard:hover {
          transform: translateY(-6px);
        }

        .galaxyStars {
          position: relative;
        }

        .galaxyStars::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.95) 40%, transparent 41%),
            radial-gradient(1.5px 1.5px at 25% 80%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.8px 1.8px at 40% 15%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(2px 2px at 55% 70%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.6px 1.6px at 72% 35%, rgba(255,255,255,0.95) 40%, transparent 41%),
            radial-gradient(2px 2px at 85% 60%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.5px 1.5px at 92% 25%, rgba(255,255,255,0.85) 40%, transparent 41%);
          opacity: 0.65;
          z-index: 0;
        }

        .cardImageWrap {
          height: 170px;
          background: rgba(255,255,255,0.92);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          overflow: hidden;
          padding: 14px;
        }

        .cardImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        .cardImageWrap:hover .cardImage {
          transform: scale(1.08);
        }

        .pager {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .pagerButton {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.08);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .pagerButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .upgradeBox {
          margin-top: 12px;
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 18px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
        }

        @media (max-width: 920px) {
          main {
            padding: 16px !important;
          }

          .cardsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .cardImageWrap {
            height: 138px;
            padding: 10px;
          }

          .floatCard {
            border-radius: 18px !important;
            padding: 10px !important;
          }
        }
      `}</style>

      <div className="galaxyStars" style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <section
          style={{
            background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
            marginBottom: 18,
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.1rem)", fontWeight: 900, letterSpacing: -1 }}>
                My Collection 💜
              </h1>
              <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
                It only gets better in this galaxy 💜
              </div>
            </div>

            <div
              style={{
                minWidth: 250,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 22,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 8 }}>Collection Completion</div>
              <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>{completion}%</div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${completion}%`,
                    height: "100%",
                    background: "linear-gradient(90deg,#60a5fa,#c084fc)",
                  }}
                />
              </div>
            </div>
          </div>

          {!isSubscribed && (
            <div className="upgradeBox">
              <div style={{ fontWeight: 900, marginBottom: 4 }}>
                Free plan: up to 50 saved Doorables
              </div>
              <div style={{ fontSize: 14, color: "#4b5563" }}>
                You are using {ownedCount}/50 saved Doorables. Upgrade to unlock unlimited collection, marketplace, and selling.
              </div>
              <div style={{ marginTop: 10 }}>
                <Link
                  href="/pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "#4f46e5",
                    color: "white",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            { label: "Total Doorables", value: totalCount, action: "all" },
            { label: "Owned", value: ownedCount, action: "have" },
            { label: "Still Need", value: needCount, action: "need" },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => {
                setCollectionFilter(stat.action);
                document.getElementById("cards-grid")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              style={{
                background: "rgba(255,255,255,0.94)",
                color: "#111827",
                borderRadius: 20,
                padding: 18,
                boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.35)",
                cursor: "pointer",
                textAlign: "left",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{stat.value}</div>
            </button>
          ))}
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.94)",
            color: "#111827",
            borderRadius: 24,
            padding: 16,
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
            marginBottom: 18,
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, series, rarity, movie, notes..."
              style={{
                flex: "1 1 280px",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 6, borderRadius: 14, background: "#eef2ff", border: "1px solid #c7d2fe", flexWrap: "wrap" }}>
              {[
                { value: "all", label: "All" },
                { value: "have", label: "Have" },
                { value: "need", label: "Need" },
                { value: "extra", label: "+Extra" },
              ].map((option) => {
                const active = collectionFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setCollectionFilter(option.value)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 800,
                      background: active ? "#4f46e5" : "transparent",
                      color: active ? "white" : "#3730a3",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} style={{ padding: 14, borderRadius: 14, border: "1px solid #d1d5db", fontSize: 15, minWidth: 180 }}>
              {seriesOptions.map((series) => (
                <option key={series} value={series}>
                  {series === "all" ? "All Series" : series}
                </option>
              ))}
            </select>

            <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} style={{ padding: 14, borderRadius: 14, border: "1px solid #d1d5db", fontSize: 15, minWidth: 180 }}>
              {subcategoryOptions.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {subcategory === "all" ? "All Subcategories" : subcategory}
                </option>
              ))}
            </select>

            <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} style={{ padding: 14, borderRadius: 14, border: "1px solid #d1d5db", fontSize: 15, minWidth: 180 }}>
              {movieOptions.map((movie) => (
                <option key={movie} value={movie}>
                  {movie === "all" ? "All Movies" : movie}
                </option>
              ))}
            </select>

            <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: 14, borderRadius: 14, border: "1px solid #d1d5db", fontSize: 15, minWidth: 180 }}>
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity === "all" ? "All Rarities" : rarity}
                </option>
              ))}
            </select>

            <div style={{ fontSize: 14, color: "#4b5563", fontWeight: 700 }}>
              Showing {pagedCards.length} of {filteredCards.length}
            </div>
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.94)",
            color: "#111827",
            borderRadius: 24,
            padding: 16,
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
            marginBottom: 18,
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Series Progress
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {seriesProgress.map((entry) => (
              <button
                key={entry.series}
                onClick={() => jumpToSeries(entry.series)}
                style={{
                  borderRadius: 18,
                  border: "1px solid #e5e7eb",
                  padding: 14,
                  background: "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {entry.series}
                  {entry.subcategoryLabel && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: "#6366f1",
                        fontWeight: 700,
                      }}
                    >
                      • {entry.subcategoryLabel}
                    </span>
                  )}
                </div>

                <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
                  {entry.owned}/{entry.total} collected • {entry.percent}%
                </div>

                <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${entry.percent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="cards-grid" className="cardsGrid">
          {pagedCards.map((item) => {
            const rarity = rarityTheme(item.rarity);
            const subtleOverlay =
              item.qty > 0
                ? "linear-gradient(rgba(34,197,94,0.08), rgba(34,197,94,0.08))"
                : "linear-gradient(rgba(168,85,247,0.08), rgba(168,85,247,0.08))";

            const statusText = collectionStatus(item.qty);

            return (
              <div
                key={item.id}
                className="floatCard"
                style={{
                  background: `${subtleOverlay}, linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), ${rarity.bg}`,
                  color: rarity.text,
                  borderRadius: 22,
                  padding: 12,
                  border: `5px solid ${rarity.border}`,
                  boxShadow: `0 12px 28px rgba(0,0,0,0.14), 0 0 18px ${rarity.glow}`,
                  filter: item.qty > 0 ? "saturate(1.02)" : "saturate(0.98)",
                }}
              >
                <div className="cardImageWrap">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="cardImage"
                    />
                  ) : (
                    <div>No Image</div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 20 }}>{item.name}</div>
                    <div style={{ opacity: 0.8, fontSize: 14 }}>{item.series}</div>
                  </div>
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      background: rarity.badgeBg,
                      color: rarity.badgeText,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.rarity}
                  </div>
                </div>

                <div style={{ opacity: 0.86, fontSize: 14, marginBottom: 10 }}>
                  {item.subcategory && <div>{item.subcategory}</div>}
                  {item.movie && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden="true">🎬</span>
                      <span>{item.movie}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    onClick={() => void saveCard(item, item.qty - 1, item.note)}
                    disabled={savingId === item.id}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: "1px solid " + rarity.border,
                      background: "rgba(255,255,255,0.84)",
                      cursor: "pointer",
                    }}
                  >
                    -
                  </button>

                  <div style={{ fontWeight: 900, fontSize: 22 }}>{item.qty}</div>

                  <button
                    onClick={() => void saveCard(item, item.qty + 1, item.note)}
                    disabled={savingId === item.id}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: "1px solid " + rarity.border,
                      background: "rgba(255,255,255,0.84)",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    fontWeight: 800,
                    color:
                      statusText === "Need"
                        ? "#7c3aed"
                        : statusText === "Extra"
                          ? "#2563eb"
                          : "#166534",
                  }}
                >
                  {savingId === item.id ? "Saving..." : statusText}
                </div>

                <textarea
                  value={item.note}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, note: value } : c)));
                  }}
                  placeholder="Notes..."
                  style={{
                    width: "100%",
                    marginTop: 8,
                    minHeight: 70,
                    borderRadius: 12,
                    border: "1px solid " + rarity.border,
                    background: "rgba(255,255,255,0.82)",
                    padding: 10,
                    color: "#111827",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  onClick={() => void saveCard(item, item.qty, item.note)}
                  disabled={savingId === item.id}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 800,
                    background: rarity.badgeBg,
                    color: rarity.badgeText,
                  }}
                >
                  {savingId === item.id ? "Saving Note..." : "Save Note"}
                </button>
              </div>
            );
          })}
        </section>

        {totalPages > 1 && (
          <div className="pager">
            <button
              type="button"
              className="pagerButton"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>

            <div style={{ fontWeight: 800 }}>
              Page {safePage} of {totalPages}
            </div>

            <button
              type="button"
              className="pagerButton"
              disabled={safePage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
