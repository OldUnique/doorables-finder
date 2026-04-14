"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { computeLocalAccess } from "../../lib/access";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  seller_name: string | null;
  status: string | null;
  created_at: string | null;
};

async function ensureUserExists(user: { id: string; email?: string | null }) {
  const supabase = getSupabase();

  const { data: existing, error } = await supabase
    .from("users")
    .select("id, is_subscribed")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    alert("LOOKUP ERROR: " + error.message);
    return { is_subscribed: false };
  }

  const bypassAccess = computeLocalAccess(user.email, false).accessGranted;

  if (!existing) {
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? null,
      is_subscribed: bypassAccess,
    });

    if (insertError) {
      alert("INSERT ERROR: " + insertError.message);
    }

    return { is_subscribed: bypassAccess };
  }

  return {
    ...existing,
    is_subscribed: computeLocalAccess(
      user.email,
      !!existing.is_subscribed
    ).accessGranted,
  };
}

export default function MarketplacePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function initAccessAndLoad() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await ensureUserExists({
        id: user.id,
        email: user.email,
      });

      const access = computeLocalAccess(
        user.email,
        profile?.is_subscribed === true
      );

      setIsSubscribed(access.accessGranted);

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("id,title,description,price,image_url,seller_name,status,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      setListings(data || []);
      setLoading(false);
    }

    initAccessAndLoad();
  }, [router, supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter((item) =>
      [item.title, item.description, item.seller_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [listings, search]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {!isSubscribed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 20, 0.45)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "linear-gradient(135deg, #111827, #4338ca)",
              color: "white",
              borderRadius: 24,
              padding: 28,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div style={{ fontSize: 38, fontWeight: 900, marginBottom: 10 }}>
              Marketplace Access 💜
            </div>

            <div style={{ fontSize: 18, opacity: 0.95, lineHeight: 1.5 }}>
              Upgrade to browse listings, buy, and sell in the Doorables marketplace.
            </div>

            <a
              href="/pricing"
              style={{
                display: "inline-block",
                marginTop: 20,
                padding: "12px 20px",
                borderRadius: 14,
                background: "#facc15",
                color: "#111827",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Go to Pricing
            </a>
          </div>
        </div>
      )}

      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #111827, #4338ca)",
              borderRadius: 24,
              padding: 28,
              marginBottom: 20,
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900 }}>
              Doorables Marketplace 🛒
            </h1>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.95 }}>
              Buy, browse, and list your Doorables
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <input
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: "1 1 300px",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
              }}
            />

            <button
              onClick={() => router.push("/sell")}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#f59e0b",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              + Create Listing
            </button>
          </div>

          {loading ? (
            <div style={panelStyle}>Loading marketplace...</div>
          ) : loadError ? (
            <div style={{ ...panelStyle, color: "#991b1b" }}>{loadError}</div>
          ) : filtered.length === 0 ? (
            <div style={panelStyle}>No active listings yet.</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, 280px)",
                justifyContent: "center",
                gap: 18,
              }}
            >
              {filtered.map((item) => (
                <div key={item.id} style={cardStyle}>
                  <div
                    style={{
                      width: "100%",
                      height: 160,
                      borderRadius: 12,
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: 12,
                      padding: 10,
                    }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ color: "#6b7280", fontWeight: 700 }}>
                        No Image
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      lineHeight: 1.25,
                      color: "#111827",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#374151",
                      minHeight: 44,
                      lineHeight: 1.45,
                      fontSize: 14,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.description || "No description provided."}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 900,
                      fontSize: 24,
                      color: "#111827",
                    }}
                  >
                    {item.price != null
                      ? `$${Number(item.price).toFixed(2)}`
                      : "Offer"}
                  </div>

                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
                    Seller: {item.seller_name || "Unknown"}
                  </div>

                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from("marketplace_listings")
                        .delete()
                        .eq("id", item.id);

                      if (error) {
                        alert("Delete failed: " + error.message);
                        return;
                      }

                      setListings((prev) =>
                        prev.filter((listing) => listing.id !== item.id)
                      );
                    }}
                    style={{
                      marginTop: 10,
                      background: "#ff4d4d",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const panelStyle = {
  background: "white",
  color: "#111827",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.1)",
};

const cardStyle = {
  width: 280,
  background: "white",
  color: "#111827",
  borderRadius: 18,
  padding: 14,
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.1)",
  boxSizing: "border-box" as const,
};
