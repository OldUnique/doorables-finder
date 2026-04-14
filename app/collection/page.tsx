"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type DoorableRow = {
  id: string;
  name?: string | null;
  series?: string | null;
  subcategory?: string | null;
  rarity?: string | null;
  image_url?: string | null;
  [key: string]: any;
};

type UserDoorableRow = {
  id?: string;
  user_id?: string;
  doorable_id?: string;
  qty_owned?: number | null;
  wanted?: boolean | null;
  favorited?: boolean | null;
  custom_tag?: string | null;
  personal_message?: string | null;
  notes?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type CollectionCard = {
  id: string;
  name: string;
  series: string;
  subcategory: string;
  rarity: string;
  imageUrl: string | null;
  qtyOwned: number;
  wanted: boolean;
  favorited: boolean;
  customTag: string;
  notes: string;
  userRowId?: string;
};

function rarityColors(rarity: string) {
  const value = rarity.toLowerCase();
  if (value.includes("ultra")) return { bg: "#ede9fe", fg: "#6d28d9", card: "#faf5ff", border: "#ddd6fe" };
  if (value.includes("rare")) return { bg: "#dbeafe", fg: "#1d4ed8", card: "#eff6ff", border: "#bfdbfe" };
  if (value.includes("special")) return { bg: "#fef3c7", fg: "#b45309", card: "#fffbeb", border: "#fde68a" };
  return { bg: "#e5e7eb", fg: "#111827", card: "#f9fafb", border: "#e5e7eb" };
}

export default function CollectionPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "owned" | "need" | "favorites">("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [savingId, setSavingId] = useState<string>("");

  useEffect(() => {
    async function loadCollection() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const [{ data: doorables, error: doorablesError }, { data: userDoorables, error: userDoorablesError }] =
        await Promise.all([
          supabase
            .from("doorables")
            .select("*")
            .order("series", { ascending: true })
            .order("name", { ascending: true }),
          supabase.from("user_doorables").select("*").eq("user_id", user.id),
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
      (userDoorables || []).forEach((row: UserDoorableRow) => {
        if (row.doorable_id) userMap.set(String(row.doorable_id), row);
      });

      const merged: CollectionCard[] = (doorables || []).map((doorable: DoorableRow) => {
        const userRow = userMap.get(String(doorable.id));

        return {
          id: String(doorable.id),
          name: doorable.name || "Unnamed",
          series: doorable.series || "Unknown Series",
          subcategory: doorable.subcategory || doorable.movie || "Unknown Group",
          rarity: doorable.rarity || "Common",
          imageUrl: userRow?.image_url || doorable.image_url || null,
          qtyOwned: Number(userRow?.qty_owned || 0),
          wanted: Boolean(userRow?.wanted) || Number(userRow?.qty_owned || 0) <= 0,
          favorited: Boolean(userRow?.favorited),
          customTag: userRow?.custom_tag || "",
          notes: userRow?.notes || userRow?.personal_message || "",
          userRowId: userRow?.id ? String(userRow.id) : undefined,
        };
      });

      setCards(merged);
      setLoading(false);
    }

    loadCollection();
  }, [router, supabase]);

  const seriesOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((card) => card.series))).sort()],
    [cards]
  );

  const rarityOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((card) => card.rarity))).sort()],
    [cards]
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesSearch =
        !q ||
        [card.name, card.series, card.subcategory, card.rarity, card.customTag, card.notes]
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

  const ownedCount = cards.filter((card) => card.qtyOwned > 0).length;
  const needCount = cards.filter((card) => card.qtyOwned <= 0 || card.wanted).length;
  const completion = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0;

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
      .sort((a, b) => a.series.localeCompare(b.series));
  }, [cards]);

  async function updateQuantity(card: CollectionCard, delta: number) {
    if (!userId) return;

    const nextQty = Math.max(0, card.qtyOwned + delta);
    setSavingId(card.id);

    const optimistic = cards.map((item) =>
      item.id === card.id
        ? {
            ...item,
            qtyOwned: nextQty,
            wanted: nextQty <= 0 ? true : false,
          }
        : item
    );
    setCards(optimistic);

    let errorMessage = "";

    if (card.userRowId) {
      const { error } = await supabase
        .from("user_doorables")
        .update({
          qty_owned: nextQty,
          wanted: nextQty <= 0,
        })
        .eq("id", card.userRowId);

      if (error) errorMessage = error.message;
    } else {
      const { data, error } = await supabase
        .from("user_doorables")
        .insert([
          {
            user_id: userId,
            doorable_id: card.id,
            qty_owned: nextQty,
            wanted: nextQty <= 0,
            favorited: card.favorited,
            custom_tag: card.customTag || null,
          },
        ])
        .select()
        .single();

      if (error) {
        errorMessage = error.message;
      } else if (data) {
        setCards((prev) =>
          prev.map((item) =>
            item.id === card.id ? { ...item, userRowId: String(data.id) } : item
          )
        );
      }
    }

    if (errorMessage) {
      alert("Save failed: " + errorMessage);
      setCards(cards);
    }

    setSavingId("");
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
            { label: "Total Doorables", value: cards.length },
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
              onChange={(e) => setStatusFilter(e.target.value as "all" | "owned" | "need" | "favorites")}
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
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{entry.series}</div>
                <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
                  {entry.owned}/{entry.total} collected
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
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {filteredCards.map((item) => {
              const rarity = rarityColors(item.rarity);

              return (
                <div
                  key={item.id}
                  style={{
                    background: rarity.card,
                    color: "#111827",
                    borderRadius: 22,
                    padding: 14,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                    border: `2px solid ${rarity.border}`,
                  }}
                >
                  <div
                    style={{
                      height: 170,
                      borderRadius: 16,
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
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
                      <div style={{ color: "#9ca3af", fontWeight: 700, fontSize: 14 }}>
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
                      <div style={{ fontWeight: 900, fontSize: 20 }}>{item.name}</div>
                      <div style={{ color: "#6b7280", fontSize: 14 }}>{item.series}</div>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        background: rarity.bg,
                        color: rarity.fg,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.rarity}
                    </div>
                  </div>

                  <div style={{ color: "#4b5563", fontSize: 14, marginBottom: 10 }}>
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
                      onClick={() => updateQuantity(item, -1)}
                      disabled={savingId === item.id}
                      style={qtyButtonStyle}
                    >
                      –
                    </button>

                    <div
                      style={{
                        minWidth: 68,
                        textAlign: "center",
                        fontWeight: 900,
                        fontSize: 20,
                        color: "#111827",
                      }}
                    >
                      {item.qtyOwned}
                    </div>

                    <button
                      onClick={() => updateQuantity(item, 1)}
                      disabled={savingId === item.id}
                      style={qtyButtonStyle}
                    >
                      +
                    </button>
                  </div>

                  <div
                    style={{
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      color: item.qtyOwned > 0 ? "#166534" : "#b91c1c",
                    }}
                  >
                    {item.qtyOwned > 0 ? "Owned" : "Need"}
                  </div>

                  {item.customTag ? (
                    <div
                      style={{
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#1d4ed8",
                      }}
                    >
                      Tag: {item.customTag}
                    </div>
                  ) : null}

                  <div style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.45 }}>
                    {item.notes || "No personal notes yet."}
                  </div>
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
  background: "#e5e7eb",
  color: "#111827",
};
