"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";

type DoorableRow = {
  id: string;
  name?: string | null;
  series?: string | null;
  subcategory?: string | null;
  movie?: string | null;
  rarity?: string | null;
  image_url?: string | null;
};

type UserDoorableRow = {
  id: string;
  user_id: string;
  doorable_id: string;
  qty_owned?: number | null;
  wanted?: boolean | null;
  favorited?: boolean | null;
  custom_tag?: string | null;
  created_at?: string | null;
};

type Card = {
  id: string;
  name: string;
  series: string;
  subcategory: string;
  rarity: string;
  imageUrl: string | null;
  qtyOwned: number;
  wanted: boolean;
  favorited: boolean;
  note: string;
  userRowId: string | null;
};

function rarityTheme(rarity: string) {
  const value = (rarity || "").toLowerCase().trim();

  // exclusive -> gold
  if (value === "exclusive" || value.includes("exclusive")) {
    return {
      card: "#fff7d6",
      border: "#d4a017",
      badgeBg: "#f4cf61",
      badgeText: "#6b4f00",
      text: "#2b2110",
      subtext: "#5b4a21",
    };
  }

  // special edition -> purple
  if (value.includes("special edition")) {
    return {
      card: "#f4e8ff",
      border: "#8b5cf6",
      badgeBg: "#d8b4fe",
      badgeText: "#5b21b6",
      text: "#2f144f",
      subtext: "#5b3b8a",
    };
  }

  // limited edition -> yellow
  if (value.includes("limited edition")) {
    return {
      card: "#fffbd1",
      border: "#eab308",
      badgeBg: "#fde047",
      badgeText: "#854d0e",
      text: "#3f2d05",
      subtext: "#7c650e",
    };
  }

  // ultra rare -> blue
  if (value.includes("ultra rare")) {
    return {
      card: "#e8f1ff",
      border: "#3b82f6",
      badgeBg: "#93c5fd",
      badgeText: "#1d4ed8",
      text: "#102a56",
      subtext: "#33538a",
    };
  }

  // rare -> green
  if (value == "rare" || value.endswith(" rare") || value.includes("rare")) {
    return {
      card: "#eafaf0",
      border: "#22c55e",
      badgeBg: "#86efac",
      badgeText: "#15803d",
      text: "#12351f",
      subtext: "#3e6a4b",
    };
  }

  // common -> white
  return {
    card: "#ffffff",
    border: "#d1d5db",
    badgeBg: "#f3f4f6",
    badgeText: "#111827",
    text: "#111827",
    subtext: "#4b5563",
  };
}

function seriesSort(a: string, b: string) {
  const aMatch = a.match(/\d+/);
  const bMatch = b.match(/\d+/);

  if (aMatch && bMatch) {
    const aNum = Number(aMatch[0]);
    const bNum = Number(bMatch[0]);
    if (aNum !== bNum) return aNum - bNum;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function CollectionPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [userId, setUserId] = useState<string>("");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingId, setSavingId] = useState<string>("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "owned" | "need" | "favorites">("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoadError(authError?.message || "You must be signed in.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [{ data: doorables, error: doorablesError }, { data: userDoorables, error: userDoorablesError }] =
        await Promise.all([
          supabase
            .from("doorables")
            .select("id,name,series,subcategory,movie,rarity,image_url"),
          supabase
            .from("user_doorables")
            .select("id,user_id,doorable_id,qty_owned,wanted,favorited,custom_tag,created_at")
            .eq("user_id", user.id),
        ]);

      if (doorablesError) {
        setLoadError(doorablesError.message);
        setLoading(false);
        return;
      }

      if (userDoorablesError) {
        setLoadError(userDoorablesError.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, UserDoorableRow>();
      (userDoorables || []).forEach((row) => {
        userMap.set(String(row.doorable_id), row);
      });

      const merged: Card[] = (doorables || [])
        .map((doorable: DoorableRow) => {
          const userRow = userMap.get(String(doorable.id));

          return {
            id: String(doorable.id),
            name: doorable.name || "Unnamed",
            series: doorable.series || "Unknown Series",
            subcategory: doorable.subcategory || doorable.movie || "Unknown Group",
            rarity: doorable.rarity || "Common",
            imageUrl: doorable.image_url || null,
            qtyOwned: Number(userRow?.qty_owned || 0),
            wanted: Boolean(userRow?.wanted) || Number(userRow?.qty_owned || 0) <= 0,
            favorited: Boolean(userRow?.favorited),
            note: userRow?.custom_tag || "",
            userRowId: userRow?.id || null,
          };
        })
        .sort((a, b) => {
          const seriesCmp = seriesSort(a.series, b.series);
          if (seriesCmp !== 0) return seriesCmp;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

      setCards(merged);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const seriesOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(cards.map((card) => card.series))).sort(seriesSort)];
  }, [cards]);

  const rarityOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(cards.map((card) => card.rarity))).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesSearch =
        !q ||
        [card.name, card.series, card.subcategory, card.rarity, card.note]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "owned"
          ? card.qtyOwned > 0
          : statusFilter === "need"
          ? card.qtyOwned <= 0 || card.wanted
          : card.favorited;

      const matchesSeries = seriesFilter === "all" ? true : card.series === seriesFilter;
      const matchesRarity = rarityFilter === "all" ? true : card.rarity === rarityFilter;

      return matchesSearch && matchesStatus && matchesSeries && matchesRarity;
    });
  }, [cards, search, statusFilter, seriesFilter, rarityFilter]);

  const totalCount = cards.length;
  const ownedCount = cards.filter((card) => card.qtyOwned > 0).length;
  const needCount = cards.filter((card) => card.qtyOwned <= 0 || card.wanted).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;

  const seriesProgress = useMemo(() => {
    const grouped = new Map<string, { total: number; owned: number }>();

    cards.forEach((card) => {
      const current = grouped.get(card.series) || { total: 0, owned: 0 };
      current.total += 1;
      if (card.qtyOwned > 0) current.owned += 1;
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

  async function persistCard(nextCard: Card) {
    if (!userId) return false;

    setSavingId(nextCard.id);

    let errorMessage = "";

    if (nextCard.userRowId) {
      const { error } = await supabase
        .from("user_doorables")
        .update({
          qty_owned: nextCard.qtyOwned,
          wanted: nextCard.qtyOwned <= 0,
          favorited: nextCard.favorited,
          custom_tag: nextCard.note ?? "",
        })
        .eq("id", nextCard.userRowId);

      if (error) errorMessage = error.message;
    } else {
      const { data, error } = await supabase
        .from("user_doorables")
        .insert([
          {
            user_id: userId,
            doorable_id: nextCard.id,
            qty_owned: nextCard.qtyOwned,
            wanted: nextCard.qtyOwned <= 0,
            favorited: nextCard.favorited ?? false,
            custom_tag: nextCard.note ?? "",
          },
        ])
        .select("id")
        .single();

      if (error) {
        errorMessage = error.message;
      } else if (data?.id) {
        setCards((prev) =>
          prev.map((card) =>
            card.id === nextCard.id ? { ...card, userRowId: String(data.id) } : card
          )
        );
      }
    }

    setSavingId("");

    if (errorMessage) {
      alert("Save failed: " + errorMessage);
      return false;
    }

    return true;
  }

  async function updateQuantity(cardId: string, delta: number) {
    const current = cards.find((card) => card.id === cardId);
    if (!current) return;

    const nextQty = Math.max(0, current.qtyOwned + delta);
    const nextCard: Card = {
      ...current,
      qtyOwned: nextQty,
      wanted: nextQty <= 0,
      note: current.note ?? "",
    };

    setCards((prev) => prev.map((card) => (card.id === cardId ? nextCard : card)));
    const success = await persistCard(nextCard);

    if (!success) {
      setCards((prev) => prev.map((card) => (card.id === cardId ? current : card)));
    }
  }

  async function saveNote(cardId: string) {
    const current = cards.find((card) => card.id === cardId);
    if (!current) return;
    await persistCard({ ...current, note: current.note ?? "" });
  }

  function updateLocalNote(cardId: string, value: string) {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, note: value } : card))
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
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #111827, #4338ca)",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.24)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2rem, 5vw, 3.1rem)",
                  fontWeight: 900,
                  letterSpacing: -1,
                }}
              >
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
              <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 8 }}>
                Collection Completion
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
                {completion}%
              </div>
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
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>
                {stat.label}
              </div>
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
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, series, rarity, notes..."
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
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "owned" | "need" | "favorites")
              }
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
              <option value="favorites">Favorites</option>
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

        {loading ? (
          <div
            style={{
              background: "rgba(255,255,255,0.97)",
              color: "#111827",
              borderRadius: 22,
              padding: 24,
            }}
          >
            Loading collection...
          </div>
        ) : loadError ? (
          <div
            style={{
              background: "rgba(255,255,255,0.97)",
              color: "#991b1b",
              borderRadius: 22,
              padding: 24,
            }}
          >
            {loadError}
          </div>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))",
              gap: 16,
            }}
          >
            {filteredCards.map((item) => {
              const theme = rarityTheme(item.rarity);

              return (
                <div
                  key={item.id}
                  style={{
                    background: theme.card,
                    color: theme.text,
                    borderRadius: 22,
                    padding: 14,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                    border: `2px solid ${theme.border}`,
                  }}
                >
                  <div
                    style={{
                      height: 170,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.06)",
                      padding: 10,
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ color: theme.subtext, fontWeight: 700, fontSize: 14 }}>
                        No Image
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 20, color: theme.text }}>
                        {item.name}
                      </div>
                      <div style={{ color: theme.subtext, fontSize: 14 }}>
                        {item.series}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        background: theme.badgeBg,
                        color: theme.badgeText,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.rarity}
                    </div>
                  </div>

                  <div style={{ color: theme.subtext, fontSize: 14, marginBottom: 10 }}>
                    {item.subcategory}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={savingId === item.id}
                      style={{
                        ...qtyButtonStyle,
                        background: "rgba(255,255,255,0.8)",
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      –
                    </button>

                    <div
                      style={{
                        minWidth: 68,
                        textAlign: "center",
                        fontWeight: 900,
                        fontSize: 20,
                        color: theme.text,
                      }}
                    >
                      {item.qtyOwned}
                    </div>

                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      disabled={savingId === item.id}
                      style={{
                        ...qtyButtonStyle,
                        background: "rgba(255,255,255,0.8)",
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div
                    style={{
                      marginBottom: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      color: item.qtyOwned > 0 ? "#166534" : "#b91c1c",
                    }}
                  >
                    {savingId === item.id
                      ? "Saving..."
                      : item.qtyOwned > 0
                      ? "Owned"
                      : "Need"}
                  </div>

                  <textarea
                    value={item.note}
                    onChange={(e) => updateLocalNote(item.id, e.target.value)}
                    placeholder="Add personal notes..."
                    style={{
                      width: "100%",
                      minHeight: 78,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "rgba(255,255,255,0.82)",
                      padding: 10,
                      fontSize: 14,
                      color: theme.text,
                      resize: "vertical",
                      boxSizing: "border-box",
                      marginBottom: 10,
                    }}
                  />

                  <button
                    onClick={() => saveNote(item.id)}
                    disabled={savingId === item.id}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 800,
                      background: theme.badgeBg,
                      color: theme.badgeText,
                    }}
                  >
                    {savingId === item.id ? "Saving Note..." : "Save Note"}
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

const qtyButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 22,
  fontWeight: 900,
};
