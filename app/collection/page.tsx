"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { getSupabase } from "../../lib/supabase";

type Card = {
  id: string;
  name: string;
  series: string;
  subcategory: string;
  rarity: string;
  movie: string;
  image_url: string;
  qty: number;
  note: string;
};

type SeriesProgress = {
  name: string;
  subcategories: string[];
  total: number;
  collected: number;
  percent: number;
};

function rarityTheme(rarity: string) {
  const key = rarity.toLowerCase();

  if (key.includes("ultra")) {
    return {
      bg: "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(249,115,22,0.25))",
      border: "#f59e0b",
    };
  }

  if (key.includes("rare")) {
    return {
      bg: "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(16,185,129,0.18))",
      border: "#22c55e",
    };
  }

  if (key.includes("special")) {
    return {
      bg: "linear-gradient(135deg, rgba(168,85,247,0.24), rgba(59,130,246,0.20))",
      border: "#8b5cf6",
    };
  }

  return {
    bg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.16))",
    border: "#60a5fa",
  };
}

export default function CollectionPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [movieFilter, setMovieFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view your collection.");
        setLoading(false);
        return;
      }

      const { data: doorables, error: doorablesError } = await supabase
        .from("doorables")
        .select("id, name, series, subcategory, rarity, movie, image_url")
        .order("series", { ascending: true })
        .order("name", { ascending: true });

      if (doorablesError) {
        setError(doorablesError.message);
        setLoading(false);
        return;
      }

      const { data: userDoorables, error: userDoorablesError } = await supabase
        .from("user_doorables")
        .select("doorable_id, qty, note")
        .eq("user_id", user.id);

      if (userDoorablesError) {
        setError(userDoorablesError.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, { qty: number; note: string }>();
      (userDoorables || []).forEach((row: any) => {
        userMap.set(String(row.doorable_id), {
          qty: typeof row.qty === "number" ? row.qty : 0,
          note: row.note ?? "",
        });
      });

      const merged: Card[] = ((doorables || []) as any[]).map((row) => {
        const saved = userMap.get(String(row.id));
        return {
          id: String(row.id),
          name: String(row.name ?? "Unnamed"),
          series: String(row.series ?? "Unknown Series"),
          subcategory: String(row.subcategory ?? ""),
          rarity: String(row.rarity ?? "Common"),
          movie: String(row.movie ?? ""),
          image_url: String(row.image_url ?? ""),
          qty: saved?.qty ?? 0,
          note: saved?.note ?? "",
        };
      });

      setCards(merged);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
      setLoading(false);
    }
  }

  async function saveCard(cardId: string, qty: number, note: string) {
    try {
      setSavingId(cardId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in first.");
        setSavingId("");
        return;
      }

      const payload = {
        user_id: user.id,
        doorable_id: cardId,
        qty,
        note,
      };

      const { error } = await supabase
        .from("user_doorables")
        .upsert(payload, { onConflict: "user_id,doorable_id" });

      if (error) {
        setError(error.message);
      }

      setSavingId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save card.");
      setSavingId("");
    }
  }

  function updateQty(cardId: string, delta: number) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, qty: Math.max(0, (card.qty || 0) + delta) }
          : card
      )
    );
  }

  function updateNote(cardId: string, note: string) {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, note } : card))
    );
  }

  const searchLower = search.trim().toLowerCase();

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      !searchLower ||
      [
        card.name,
        card.series,
        card.subcategory,
        card.rarity,
        card.movie,
        card.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);

    const matchesSeries = seriesFilter === "all" || card.series === seriesFilter;
    const matchesSubcategory =
      subcategoryFilter === "all" || card.subcategory === subcategoryFilter;
    const matchesRarity =
      rarityFilter === "all" || card.rarity === rarityFilter;
    const matchesMovie = movieFilter === "all" || card.movie === movieFilter;
    const matchesCollection =
      collectionFilter === "all"
        ? true
        : collectionFilter === "have"
          ? card.qty > 0
          : card.qty <= 0;

    return (
      matchesSearch &&
      matchesSeries &&
      matchesSubcategory &&
      matchesRarity &&
      matchesMovie &&
      matchesCollection
    );
  });

  const seriesOptions = Array.from(new Set(cards.map((c) => c.series))).sort();
  const subcategoryOptions = Array.from(
    new Set(
      cards
        .filter((c) => seriesFilter === "all" || c.series === seriesFilter)
        .map((c) => c.subcategory)
        .filter(Boolean)
    )
  ).sort();
  const rarityOptions = Array.from(new Set(cards.map((c) => c.rarity))).sort();
  const movieOptions = Array.from(
    new Set(cards.map((c) => c.movie).filter(Boolean))
  ).sort();

  const seriesProgress: SeriesProgress[] = useMemo(() => {
    const grouped = new Map<string, Card[]>();

    cards.forEach((card) => {
      const key = card.series || "Unknown Series";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(card);
    });

    return Array.from(grouped.entries())
      .map(([name, items]) => {
        const total = items.length;
        const collected = items.filter((item) => item.qty > 0).length;
        const percent = total ? Math.round((collected / total) * 100) : 0;
        const subcategories = Array.from(
          new Set(items.map((item) => item.subcategory).filter(Boolean))
        ) as string[];

        return {
          name,
          subcategories,
          total,
          collected,
          percent,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);

  function jumpToSeries(seriesName: string) {
    setSeriesFilter(seriesName);
    setSubcategoryFilter("all");

    requestAnimationFrame(() => {
      document.getElementById("collection-grid")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <AppHeader />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: 24 }}>
        <section
          style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 28,
            padding: 20,
            boxShadow: "0 16px 34px rgba(0,0,0,0.18)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr repeat(5, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, series, rarity, movie, notes..."
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <select
              value={seriesFilter}
              onChange={(e) => {
                setSeriesFilter(e.target.value);
                setSubcategoryFilter("all");
              }}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            >
              <option value="all">All Series</option>
              {seriesOptions.map((series) => (
                <option key={series} value={series}>
                  {series}
                </option>
              ))}
            </select>

            <select
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            >
              <option value="all">All Subcategories</option>
              {subcategoryOptions.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>

            <select
              value={movieFilter}
              onChange={(e) => setMovieFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            >
              <option value="all">All Movies</option>
              {movieOptions.map((movie) => (
                <option key={movie} value={movie}>
                  {movie}
                </option>
              ))}
            </select>

            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            >
              <option value="all">All Rarities</option>
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>

            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            >
              <option value="all">All</option>
              <option value="have">Have</option>
              <option value="need">Need</option>
            </select>
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 28,
            padding: 20,
            boxShadow: "0 16px 34px rgba(0,0,0,0.18)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            Series Progress
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {seriesProgress.map((series) => (
              <button
                key={series.name}
                type="button"
                onClick={() => jumpToSeries(series.name)}
                style={{
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  background: "linear-gradient(180deg, #fffdf7 0%, #f8fafc 100%)",
                  borderRadius: 18,
                  padding: 16,
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontWeight: 900, color: "#111827", marginBottom: 6 }}>
                  {series.name}
                  {series.subcategories.length > 0 && (
                    <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>
                      {" "}
                      • {series.subcategories.join(" • ")}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                  {series.collected}/{series.total} collected • {series.percent}%
                </div>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: ${series.percent}%,
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #60a5fa, #8b5cf6)",
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        {!!error && (
          <div
            style={{
              background: "rgba(254,226,226,0.98)",
              color: "#991b1b",
              borderRadius: 18,
              padding: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: "white", fontWeight: 800, padding: 18 }}>
            Loading collection...
          </div>
        ) : (
          <section
            id="collection-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {filteredCards.map((card) => {
              const rarity = rarityTheme(card.rarity);
              const haveIt = card.qty > 0;

              return (
                <div
                  key={card.id}
                  style={{
                    background: `linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), ${rarity.bg}`,
                    color: "#111827",
                    borderRadius: 24,
                    padding: 14,
                    border: `4px solid ${rarity.border}`,
                    boxShadow: "0 14px 30px rgba(0,0,0,0.14)",
                    opacity: haveIt ? 1 : 0.94,
                  }}
                >
                  <div
                    style={{
                      height: 180,
                      background: "#ffffff",
                      borderRadius: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: 12,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div style={{ color: "#9ca3af", fontWeight: 800 }}>
                        No image
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{card.name}</div>
                      <div style={{ color: "#6b7280", marginTop: 2 }}>{card.series}</div>
                      {!!card.subcategory && (
                        <div style={{ color: "#94a3b8", fontSize: 14 }}>{card.subcategory}</div>
                      )}
                      {!!card.movie && (
                        <div style={{ color: "#94a3b8", fontSize: 14 }}>{card.movie}</div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", fontWeight: 900 }}>
                      {card.rarity}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px 1fr 56px",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 16,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateQty(card.id, -1)}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: "1px solid #d1d5db",
                        background: "#fffdf7",
                        fontSize: 24,
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 38, fontWeight: 900 }}>{card.qty}</div>
                      <div
                        style={{
                          color: haveIt ? "#16a34a" : "#dc2626",
                          fontWeight: 900,
                          fontSize: 15,
                        }}
                      >
                        {haveIt ? "Have" : "Need"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateQty(card.id, 1)}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: "1px solid #d1d5db",
                        background: "#fffdf7",
                        fontSize: 24,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>

                  <textarea
                    value={card.note}
                    onChange={(e) => updateNote(card.id, e.target.value)}
                    placeholder="Notes..."
                    style={{
                      width: "100%",
                      minHeight: 82,
                      marginTop: 14,
                      borderRadius: 14,
                      border: "1px solid #d1d5db",
                      padding: 12,
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => void saveCard(card.id, card.qty, card.note)}
                    disabled={savingId === card.id}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      border: "none",
                      borderRadius: 14,
                      padding: "13px 16px",
                      background: "linear-gradient(135deg, #60a5fa, #8b5cf6)",
                      color: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {savingId === card.id ? "Saving..." : "Save"}
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
