"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

type PublicCard = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  image: string;
  qty: number;
  note: string;
};

type VisibilityMode = "private" | "extras_only" | "full";
type ViewFilter = "all" | "owned" | "extras" | "wishlist";

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

export default function PublicCollectorPage() {
  const params = useParams();
  const rawUsername = String(params?.username || "");
  const username = rawUsername.toLowerCase();

  const [cards, setCards] = useState<PublicCard[]>([]);
  const [visibility, setVisibility] = useState<VisibilityMode>("private");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(username);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [collectorUserId, setCollectorUserId] = useState("");
  const [startingChatId, setStartingChatId] = useState("");

  useEffect(() => {
    void loadPage();
  }, [username]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, username, collection_visibility")
        .ilike("username", username)
        .maybeSingle();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!userRow?.id) {
        setError("Collector not found.");
        setLoading(false);
        return;
      }

      const mode = (userRow.collection_visibility || "private") as VisibilityMode;
      setVisibility(mode);
      setDisplayName(String(userRow.username || username));
      setCollectorUserId(String(userRow.id));

      if (mode === "private") {
        setCards([]);
        setLoading(false);
        return;
      }

      const { data: doorables, error: doorablesError } = await supabase
        .from("doorables")
        .select("id, name, series, rarity, image_url");

      if (doorablesError) {
        setError(doorablesError.message);
        setLoading(false);
        return;
      }

      const { data: userDoorables, error: userDoorablesError } = await supabase
        .from("user_doorables")
        .select("doorable_id, qty_owned, custom_tag, wanted")
        .eq("user_id", userRow.id);

      if (userDoorablesError) {
        setError(userDoorablesError.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, any>();
      (userDoorables || []).forEach((row: any) => {
        userMap.set(String(row.doorable_id), row);
      });

      let merged: PublicCard[] = ((doorables || []) as any[]).map((d) => {
        const row = userMap.get(String(d.id));
        return {
          id: String(d.id ?? ""),
          name: String(d.name ?? "Unknown"),
          series: String(d.series ?? "Unknown Series"),
          rarity: String(d.rarity ?? "Common"),
          image: String(d.image_url ?? ""),
          qty: Number(row?.qty_owned ?? 0),
          note: String(row?.custom_tag ?? ""),
        };
      });

      if (mode === "extras_only") {
        merged = merged.filter((item) => item.qty > 1 || item.qty <= 0);
      }

      merged.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );

      setCards(merged);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
      setLoading(false);
    }
  }

  async function messageAboutDoorable(card: PublicCard) {
    try {
      setError("");
      setStartingChatId(card.id);

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (!collectorUserId) {
        setError("Collector account could not be found.");
        setStartingChatId("");
        return;
      }

      if (String(user.id) === collectorUserId) {
        setError("You cannot message yourself.");
        setStartingChatId("");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_conversations")
        .select("id")
        .eq("conversation_type", "collector")
        .or(
          `and(buyer_id.eq.${user.id},seller_id.eq.${collectorUserId}),and(buyer_id.eq.${collectorUserId},seller_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existingError) {
        setError(existingError.message);
        setStartingChatId("");
        return;
      }

      let conversationId = "";

      if (existing?.id) {
        conversationId = String(existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("marketplace_conversations")
          .insert([
            {
              listing_id: null,
              buyer_id: user.id,
              seller_id: collectorUserId,
              listing_title: null,
              conversation_type: "collector",
              collector_name: displayName,
            },
          ])
          .select("id")
          .single();

        if (createError) {
          setError(createError.message);
          setStartingChatId("");
          return;
        }

        conversationId = String(created.id);
      }

      let body = `Hi! I saw your collection and wanted to ask about ${card.name}.`;

      if (card.qty > 1) {
        body = `Hi! I saw that you have an extra of ${card.name} in your collection and wanted to ask about it.`;
      } else if (card.qty <= 0) {
        body = `Hi! I saw that ${card.name} is on your wishlist and wanted to message you about it.`;
      }

      const { error: messageError } = await supabase
        .from("marketplace_messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_id: user.id,
            body,
            read_at: null,
          },
        ]);

      if (messageError) {
        setError(messageError.message);
        setStartingChatId("");
        return;
      }

      window.location.href = `/messages?conversation=${conversationId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start message.");
      setStartingChatId("");
    }
  }

  const stats = useMemo(() => {
    const extras = cards.filter((c) => c.qty > 1).length;
    const wishlist = cards.filter((c) => c.qty <= 0).length;
    const owned = cards.filter((c) => c.qty > 0).length;
    return { extras, wishlist, owned, total: cards.length };
  }, [cards]);

  const displayedCards = useMemo(() => {
    if (viewFilter === "owned") {
      return cards.filter((c) => c.qty > 0);
    }
    if (viewFilter === "extras") {
      return cards.filter((c) => c.qty > 1);
    }
    if (viewFilter === "wishlist") {
      return cards.filter((c) => c.qty <= 0);
    }
    return cards;
  }, [cards, viewFilter]);

  function getStatusLabel(card: PublicCard) {
    if (card.qty > 1) return "Extra";
    if (card.qty > 0) return "Owned";
    return "Wishlist";
  }

  function getStatusColor(card: PublicCard) {
    if (card.qty > 1) return "#2563eb";
    if (card.qty > 0) return "#166534";
    return "#7c3aed";
  }

  function getFilterTitle() {
    if (viewFilter === "owned") return "Owned";
    if (viewFilter === "extras") return "Extras";
    if (viewFilter === "wishlist") return "Wishlist";
    return visibility === "extras_only" ? "Wishlist + Extras" : "Full Collection";
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          background:
            "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
          color: "white",
        }}
      >
        Loading collector page...
      </main>
    );
  }

  if (error && !cards.length && visibility !== "private") {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          background:
            "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 22,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Oops 💜</div>
            <div>{error}</div>
          </div>
        </div>
      </main>
    );
  }

  if (visibility === "private") {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          background:
            "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <section
            style={{
              background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
              marginBottom: 18,
            }}
          >
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
              @{displayName}'s Collection 💜
            </h1>
            <div style={{ marginTop: 8, opacity: 0.92 }}>
              This collection is private.
            </div>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,0.96)",
              color: "#111827",
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>🔒 Private Collection</div>
            <div style={{ color: "#4b5563", lineHeight: 1.6 }}>
              This collector has chosen not to publicly show their Doorables right now.
            </div>
          </section>
        </div>
      </main>
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
        .shell {
          max-width: 1380px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero {
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.35);
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .statCardActive {
          outline: 3px solid #4f46e5;
        }

        .collectionCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.35);
        }

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

      <div className="shell">
        <section className="hero">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
                @{displayName}'s Collection 💜
              </h1>
              <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
                {visibility === "extras_only"
                  ? "Showing public wishlist and extras."
                  : "Showing full public collection."}
              </div>
            </div>

            <Link
              href="/collection"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 14,
                textDecoration: "none",
                color: "white",
                fontWeight: 800,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Back to My Collection
            </Link>
          </div>
        </section>

        {!!error && (
          <div
            style={{
              marginBottom: 18,
              background: "rgba(255,255,255,0.94)",
              color: "#b91c1c",
              borderRadius: 18,
              padding: 14,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <section className="statsGrid">
          {[
            { key: "all", label: "Visible Items", value: stats.total },
            { key: "owned", label: "Owned", value: stats.owned },
            { key: "extras", label: "Extras", value: stats.extras },
            { key: "wishlist", label: "Wishlist", value: stats.wishlist },
          ].map((stat) => {
            const active = viewFilter === stat.key;
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setViewFilter(stat.key as ViewFilter)}
                className={`statCard ${active ? "statCardActive" : ""}`}
              >
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 30, fontWeight: 900 }}>{stat.value}</div>
              </button>
            );
          })}
        </section>

        <section className="collectionCard">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>{getFilterTitle()}</div>
            <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 700 }}>
              Showing {displayedCards.length} item{displayedCards.length === 1 ? "" : "s"}
            </div>
          </div>

          {displayedCards.length === 0 ? (
            <div style={{ color: "#6b7280", padding: 10 }}>
              Nothing to show in this section yet.
            </div>
          ) : (
            <section className="cardsGrid">
              {displayedCards.map((item) => {
                const rarity = rarityTheme(item.rarity);
                const status = getStatusLabel(item);
                const statusColor = getStatusColor(item);

                return (
                  <div
                    key={item.id}
                    className="floatCard"
                    style={{
                      background: rarity.bg,
                      color: rarity.text,
                      borderRadius: 22,
                      padding: 12,
                      border: `4px solid ${rarity.border}`,
                      boxShadow: `0 12px 28px rgba(0,0,0,0.14), 0 0 18px ${rarity.glow}`,
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
                        <div style={{ color: "#6b7280", fontWeight: 700 }}>No Image</div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "start",
                        marginBottom: 6,
                      }}
                    >
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

                    <div
                      style={{
                        marginTop: 8,
                        marginBottom: 6,
                        fontWeight: 800,
                        color: statusColor,
                      }}
                    >
                      {status}
                    </div>

                    <div style={{ fontSize: 14, color: "#4b5563", fontWeight: 700 }}>
                      Qty: {item.qty}
                    </div>

                    {item.note ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          lineHeight: 1.5,
                          background: "rgba(255,255,255,0.62)",
                          borderRadius: 12,
                          padding: 10,
                          color: "#374151",
                        }}
                      >
                        {item.note}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void messageAboutDoorable(item)}
                      disabled={startingChatId === item.id}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "none",
                        cursor: startingChatId === item.id ? "wait" : "pointer",
                        fontWeight: 800,
                        background:
                          item.qty > 1
                            ? "#2563eb"
                            : item.qty <= 0
                              ? "#7c3aed"
                              : "#4f46e5",
                        color: "white",
                        opacity: startingChatId === item.id ? 0.7 : 1,
                      }}
                    >
                      {startingChatId === item.id
                        ? "Opening..."
                        : item.qty > 1
                          ? "Ask About Trade"
                          : item.qty <= 0
                            ? "I Have This"
                            : "Send Message"}
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
