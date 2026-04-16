"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Listing = {
  id: string;
  user_id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
  seller_name: string | null;
  status: string | null;
  sold_at: string | null;
  created_at: string | null;
};

type EditState = {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  seller_name: string;
};

function formatPrice(value: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toFixed(2)}`
    : "Offer";
}

function daysSince(dateString: string | null) {
  if (!dateString) return 0;
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return 0;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

export default function MarketplacePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<EditState | null>(null);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setLoadError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setLoadError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(String(user.id));

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      const visibleListings = ((data || []) as Listing[]).filter((item) => {
        if (item.status !== "sold") return true;
        return daysSince(item.sold_at) <= 3;
      });

      setListings(visibleListings);
      setLoading(false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load marketplace.");
      setLoading(false);
    }
  }

  function openEditor(item: Listing) {
    setEditItem({
      id: String(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      price: item.price == null ? "" : String(item.price),
      image_url: String(item.image_url ?? ""),
      seller_name: String(item.seller_name ?? ""),
    });
  }

  async function saveEdit() {
    if (!editItem) return;

    try {
      setSaving(true);
      setLoadError("");

      const payload = {
        title: editItem.title.trim(),
        description: editItem.description.trim() || null,
        price: editItem.price.trim() === "" ? null : Number(editItem.price),
        image_url: editItem.image_url.trim() || null,
        seller_name: editItem.seller_name.trim() || null,
      };

      const { error } = await supabase
        .from("marketplace_listings")
        .update(payload)
        .eq("id", editItem.id)
        .eq("user_id", userId);

      if (error) {
        setLoadError(error.message);
        setSaving(false);
        return;
      }

      setEditItem(null);
      setSaving(false);
      await loadPage();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not save listing.");
      setSaving(false);
    }
  }

  async function deleteListing(id: string) {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    setListings((prev) => prev.filter((item) => String(item.id) !== id));
  }

  async function setListingStatus(item: Listing, nextStatus: "active" | "pending" | "sold") {
    const payload: Record<string, string | null> = {
      status: nextStatus,
      sold_at: nextStatus === "sold" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("marketplace_listings")
      .update(payload)
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      setLoadError(error.message);
      return;
    }

    await loadPage();
  }

  const filteredListings = useMemo(() => {
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
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <style jsx>{`
        .shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .nav {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .navLinks {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .navButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 16px;
          text-decoration: none;
          color: white;
          font-weight: 800;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
        }

        .navButton:hover {
          background: rgba(255,255,255,0.14);
        }

        .hero {
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .field {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px;
          font-size: 15px;
          box-sizing: border-box;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 22px;
          padding: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 34px rgba(0,0,0,0.18);
        }

        .badge {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(2,6,23,0.62);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .modalCard {
          width: min(720px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: white;
          color: #111827;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.26);
        }

        .primaryButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          background: #4f46e5;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }
      `}</style>

      <div className="shell">
        <nav className="nav">
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
            Doorables Finder
          </div>

          <div className="navLinks">
            <Link href="/" className="navButton">🏠 Home</Link>
            <Link href="/collection" className="navButton">Collection</Link>
            <Link href="/marketplace" className="navButton">Marketplace</Link>
            <Link href="/sell" className="navButton">Sell</Link>
            <Link href="/subscription" className="navButton">Subscription</Link>
            <Link href="/feedback" className="navButton">💙 Feedback</Link>
          </div>
        </nav>

        <section className="hero">
          <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: -1 }}>
            Marketplace 🛒
          </div>
          <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
            Search listings, message sellers, and manage your own items.
          </div>

          <div className="toolbar">
            <input
              className="field"
              placeholder="Search by Doorable title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260, flex: "1 1 280px" }}
            />

            <button
              onClick={() => router.push("/sell")}
              className="primaryButton"
            >
              + Create Listing
            </button>

            <button
              onClick={() => router.push("/messages")}
              className="primaryButton"
              style={{ background: "#7c3aed" }}
            >
              Messages
            </button>
          </div>

          {!!loadError && (
            <div style={{ marginTop: 12, color: "#fecaca", fontWeight: 700 }}>
              {loadError}
            </div>
          )}
        </section>

        {loading ? (
          <div style={{ padding: 20 }}>Loading marketplace...</div>
        ) : filteredListings.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: 28 }}
          >
            No listings found.
          </div>
        ) : (
          <section className="grid">
            {filteredListings.map((item) => {
              const isOwner = String(item.user_id ?? "") === userId;
              const status = String(item.status ?? "active");

              const badgeStyles =
                status === "sold"
                  ? { background: "#fee2e2", color: "#991b1b" }
                  : status === "pending"
                  ? { background: "#fef3c7", color: "#92400e" }
                  : { background: "#dcfce7", color: "#166534" };

              return (
                <div key={String(item.id)} className="card">
                  <div
                    style={{
                      height: 180,
                      borderRadius: 16,
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: 12,
                    }}
                  >
                    {item.image_url ? (
                      <img
                        src={String(item.image_url)}
                        alt={String(item.title ?? "Listing image")}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ color: "#6b7280", fontWeight: 700 }}>No Image</div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>
                      {String(item.title ?? "Untitled")}
                    </div>

                    <div className="badge" style={badgeStyles}>
                      {status.toUpperCase()}
                    </div>
                  </div>

                  <div style={{ marginTop: 6, color: "#4b5563", minHeight: 46 }}>
                    {String(item.description ?? "No description provided.")}
                  </div>

                  <div style={{ marginTop: 10, fontWeight: 900, fontSize: 24 }}>
                    {formatPrice(item.price)}
                  </div>

                  <div style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
                    Seller: {String(item.seller_name || "Unknown")}
                  </div>

                  {!isOwner && (
                    <button
                      onClick={() => router.push(`/messages?listing=${item.id}`)}
                      className="primaryButton"
                      style={{ marginTop: 12, width: "100%" }}
                    >
                      Message Seller
                    </button>
                  )}

                  {isOwner && (
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => openEditor(item)}
                          className="primaryButton"
                          style={{ flex: 1, background: "#2563eb" }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => void deleteListing(String(item.id))}
                          className="primaryButton"
                          style={{ flex: 1, background: "#ef4444" }}
                        >
                          Delete
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => void setListingStatus(item, "active")}
                          className="primaryButton"
                          style={{
                            flex: 1,
                            background: status === "active" ? "#10b981" : "#d1d5db",
                            color: status === "active" ? "white" : "#111827",
                          }}
                        >
                          Active
                        </button>

                        <button
                          onClick={() => void setListingStatus(item, "pending")}
                          className="primaryButton"
                          style={{
                            flex: 1,
                            background: status === "pending" ? "#f59e0b" : "#d1d5db",
                            color: status === "pending" ? "white" : "#111827",
                          }}
                        >
                          Pending
                        </button>

                        <button
                          onClick={() => void setListingStatus(item, "sold")}
                          className="primaryButton"
                          style={{
                            flex: 1,
                            background: status === "sold" ? "#ef4444" : "#d1d5db",
                            color: status === "sold" ? "white" : "#111827",
                          }}
                        >
                          Sold
                        </button>
                      </div>

                      {status === "sold" && item.sold_at && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Sold listings stay visible for up to 3 days.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>

      {editItem && (
        <div className="modalBackdrop">
          <div className="modalCard">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Edit Listing</div>

              <button
                onClick={() => setEditItem(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 28,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <input
                className="field"
                value={editItem.title}
                onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                placeholder="Doorable title"
              />

              <input
                className="field"
                value={editItem.seller_name}
                onChange={(e) => setEditItem({ ...editItem, seller_name: e.target.value })}
                placeholder="Seller name"
              />

              <textarea
                className="field"
                style={{ minHeight: 120 }}
                value={editItem.description}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                placeholder="Description"
              />

              <input
                className="field"
                value={editItem.price}
                onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                placeholder="Price"
              />

              <input
                className="field"
                value={editItem.image_url}
                onChange={(e) => setEditItem({ ...editItem, image_url: e.target.value })}
                placeholder="Image URL"
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "end", marginTop: 6 }}>
                <button
                  onClick={() => setEditItem(null)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="primaryButton"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
