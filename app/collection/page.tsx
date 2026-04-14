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
  owned?: number | boolean | null;
  need_status?: string | boolean | null;
  custom_tag?: string | null;
  notes?: string | null;
  personal_message?: string | null;
  image_url?: string | null;
  [key: string]: any;
};

type CollectionCard = {
  id: string;
  name: string;
  series: string;
  subcategory: string;
  rarity: string;
  imageUrl: string | null;
  ownedCount: number;
  need: boolean;
  customTag: string;
  notes: string;
};

function toOwnedCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
    return value.toLowerCase() === "true" ? 1 : 0;
  }
  return 0;
}

function toNeed(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    return ["need", "needed", "wanted", "want", "true", "yes"].includes(normalized);
  }
  return false;
}

function rarityColors(rarity: string) {
  const value = rarity.toLowerCase();
  if (value.includes("ultra")) return { bg: "#ede9fe", fg: "#6d28d9" };
  if (value.includes("rare")) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (value.includes("special")) return { bg: "#fef3c7", fg: "#b45309" };
  return { bg: "#e5e7eb", fg: "#111827" };
}

export default function CollectionPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "owned" | "need">("all");
  const [seriesFilter, setSeriesFilter] = useState("all");

  useEffect(() => {
    async function loadCollection() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: doorables, error: doorablesError }, { data: userDoorables, error: userDoorablesError }] =
        await Promise.all([
          supabase.from("doorables").select("*").order("series", { ascending: true }).order("name", { ascending: true }),
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
        const key =
          row.doorable_id ||
          row.doorables_id ||
          row.item_id ||
          row.catalog_id ||
          row.id;

        if (key) {
          userMap.set(String(key), row);
        }
      });

      const merged: CollectionCard[] = (doorables || []).map((doorable: DoorableRow) => {
        const userRow = userMap.get(String(doorable.id));

        const ownedCount = toOwnedCount(
          userRow?.owned ?? userRow?.owned_count ?? userRow?.quantity ?? 0
        );

        const need = toNeed(
          userRow?.need_status ?? userRow?.needed ?? userRow?.want ?? false
        ) || ownedCount <= 0;

        return {
          id: String(doorable.id),
          name: doorable.name || "Unnamed",
          series: doorable.series || "Unknown Series",
          subcategory: doorable.subcategory || doorable.movie || "Unknown Group",
          rarity: doorable.rarity || "Common",
          imageUrl: userRow?.image_url || doorable.image_url || null,
          ownedCount,
          need,
          customTag: userRow?.custom_tag || "",
          notes: userRow?.notes || userRow?.personal_message || "",
        };
      });

      setCards(merged);
      setLoading(false);
    }

    loadCollection();
  }, [router, supabase]);

  const seriesOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(cards.map((card) => card.series))).sort()];
  }, [cards]);

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
          ? card.ownedCount > 0
          : card.need;

      const matchesSeries = seriesFilter === "all" ? true : card.series === seriesFilter;

      return matchesSearch && matchesStatus && matchesSeries;
    });
  }, [cards, search, statusFilter, seriesFilter]);

  const ownedCount = cards.filter((card) => card.ownedCount > 0).length;
  const needCount = cards.filter((card) => card.need).length;
  const completion = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0;

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
                Powered by your Supabase Doorables database.
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
              onChange={(e) => setStatusFilter(e.target.value as "all" | "owned" | "need")}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {filteredCards.map((item) => {
              const rarity = rarityColors(item.rarity);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "rgba(255,255,255,0.98)",
                    color: "#111827",
                    borderRadius: 22,
                    padding: 14,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                  }}
                >
                  <div
                    style={{
                      height: 170,
                      borderRadius: 16,
                      background: "#f3f4f6",
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
                        background: item.ownedCount > 0 ? "#dcfce7" : "#fee2e2",
                        color: item.ownedCount > 0 ? "#166534" : "#b91c1c",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.ownedCount > 0 ? `Owned: ${item.ownedCount}` : "Need"}
                    </div>
                  </div>

                  <div style={{ color: "#4b5563", fontSize: 14, marginBottom: 10 }}>
                    {item.subcategory}
                  </div>

                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      background: rarity.bg,
                      color: rarity.fg,
                      marginBottom: 10,
                    }}
                  >
                    {item.rarity}
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
