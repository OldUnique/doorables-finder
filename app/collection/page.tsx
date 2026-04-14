// COLLECTION PAGE REPLACEMENT
// - 4 cards per row on desktop
// - 2 cards per row on smaller screens
// - movie shown on its own row with a little movie icon
// - keeps rarity colors, filters, series progress, notes, and qty saving

"use client";

import { useEffect, useMemo, useState } from "react";
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

function rarityTheme(rarity: string) {
  const value = String(rarity || "").toLowerCase().trim();

  if (value === "exclusive" || value.includes("exclusive")) {
    return {
      bg: "#fff7d6",
      border: "#d4a017",
      text: "#2b2110",
      badgeBg: "#f4cf61",
      badgeText: "#6b4f00",
    };
  }

  if (value.includes("special edition")) {
    return {
      bg: "#f4e8ff",
      border: "#8b5cf6",
      text: "#2f144f",
      badgeBg: "#d8b4fe",
      badgeText: "#5b21b6",
    };
  }

  if (value.includes("limited edition")) {
    return {
      bg: "#fffbd1",
      border: "#eab308",
      text: "#3f2d05",
      badgeBg: "#fde047",
      badgeText: "#854d0e",
    };
  }

  if (value.includes("ultra rare")) {
    return {
      bg: "#e8f1ff",
      border: "#3b82f6",
      text: "#102a56",
      badgeBg: "#93c5fd",
      badgeText: "#1d4ed8",
    };
  }

  if (value === "rare" || (value.includes("rare") && !value.includes("ultra"))) {
    return {
      bg: "#eafaf0",
      border: "#22c55e",
      text: "#12351f",
      badgeBg: "#86efac",
      badgeText: "#15803d",
    };
  }

  return {
    bg: "#ffffff",
    border: "#d1d5db",
    text: "#111827",
    badgeBg: "#f3f4f6",
    badgeText: "#111827",
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

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    void load();
  }, []);

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
          const seriesCmp = seriesSort(a.series, b.series);
          if (seriesCmp !== 0) return seriesCmp;
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

      setSavingId(card.id);

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

        card.rowId = data?.id ? String(data.id) : null;
      }

      setSavingId("");
      await load();
    } catch (err) {
      setSavingId("");
      alert("Save failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  const seriesOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(cards.map((c) => c.series))).sort(seriesSort)];
  }, [cards]);

  const rarityOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(cards.map((c) => c.rarity))).sort()];
  }, [cards]);

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

      const matchesSeries = seriesFilter === "all" ? true : card.series === seriesFilter;
      const matchesRarity = rarityFilter === "all" ? true : card.rarity === rarityFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "owned"
          ? card.qty > 0
          : card.qty <= 0;

      return matchesSearch && matchesSeries && matchesRarity && matchesStatus;
    });
  }, [cards, search, seriesFilter, rarityFilter, statusFilter]);

  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;

  const seriesProgress = useMemo(() => {
    const grouped = new Map<string, { total: number; owned: number }>();

    cards.forEach((card) => {
      const current = grouped.get(card.series) || { total: 0, owned: 0 };
      current.total += 1;
      if (card.qty > 0) current.owned += 1;
      grouped.set(card.series, current);
    });

    return Array.from(grouped.entries())
      .map(([series, value]) => ({
        series,
        total: value.total,
        owned: value.owned,
        percent: value.total ? Math.round((value.owned / value.total) * 100) : 0,
      }))
      .sort((a, b) => seriesSort(a.series, b.series));
  }, [cards]);

  if (loading) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #2563eb)", color: "white" }}>
        Loading collection...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #2563eb)", color: "white" }}>
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
        background: "linear-gradient(135deg, #0f172a, #2563eb)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #111827, #4338ca)",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.24)",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.1rem)", fontWeight: 900, letterSpacing: -1 }}>
                My Collection 💜
              </h1>
              <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
                It only gets better 💜
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
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
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
            { label: "Total Doorables", value: totalCount },
            { label: "Owned", value: ownedCount },
            { label: "Still Need", value: needCount },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.97)",
                color: "#111827",
                borderRadius: 20,
                padding: 18,
                boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{stat.value}</div>
            </div>
          ))}
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.97)",
            color: "#111827",
            borderRadius: 24,
            padding: 16,
            boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
            marginBottom: 18,
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
                minWidth: 160,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="owned">Owned</option>
              <option value="need">Need</option>
            </select>

            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
                minWidth: 180,
              }}
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
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                fontSize: 15,
                minWidth: 180,
              }}
            >
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity === "all" ? "All Rarities" : rarity}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.97)",
            color: "#111827",
            borderRadius: 24,
            padding: 16,
            boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Series Progress
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {seriesProgress.map((entry) => (
              <div
                key={entry.series}
                style={{
                  borderRadius: 18,
                  border: "1px solid #e5e7eb",
                  padding: 14,
                  background: "#ffffff",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{entry.series}</div>

                <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
                  {entry.owned}/{entry.total} collected • {entry.percent}%
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
                      width: `${entry.percent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

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
        `}</style>

        <section className="cardsGrid">
          {filteredCards.map((item) => {
            const rarity = rarityTheme(item.rarity);

            return (
              <div
                key={item.id}
                style={{
                  background: rarity.bg,
                  color: "#111827",
                  borderRadius: 22,
                  padding: 12,
                  border: `5px solid ${rarity.border}`,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                }}
              >
                <div
                  style={{
                    height: 170,
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    overflow: "hidden",
                    padding: 14,
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
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

                <div style={{ opacity: 0.8, fontSize: 14, marginBottom: 10 }}>
                  {item.subcategory && (
                    <div>{item.subcategory}</div>
                  )}

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
                      background: "rgba(255,255,255,0.8)",
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
                      background: "rgba(255,255,255,0.8)",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 800, color: item.qty > 0 ? "#166534" : "#b91c1c" }}>
                  {savingId === item.id ? "Saving..." : item.qty > 0 ? "Owned" : "Need"}
                </div>

                <textarea
                  value={item.note}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCards((prev) =>
                      prev.map((c) => (c.id === item.id ? { ...c, note: value } : c))
                    );
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
      </div>
    </main>
  );
}
