"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Listing = Record<string, any>;

type EditState = {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  seller_name: string;
  contact_info: string;
  hasContactColumn: boolean;
};

function formatPrice(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "Offer";
}

export default function MarketplacePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
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
      setUserEmail(String(user.email ?? ""));

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      setListings(data || []);
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
      contact_info: String(item.contact_info ?? ""),
      hasContactColumn: Object.prototype.hasOwnProperty.call(item, "contact_info"),
    });
  }

  async function saveEdit() {
    if (!editItem) return;

    try {
      setSaving(true);

      const payload: Record<string, any> = {
        title: editItem.title.trim(),
        description: editItem.description.trim(),
        price: editItem.price.trim() === "" ? null : Number(editItem.price),
        image_url: editItem.image_url.trim() || null,
        seller_name: editItem.seller_name.trim() || null,
      };

      if (editItem.hasContactColumn) {
        payload.contact_info = editItem.contact_info.trim() || null;
      }

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter((item) =>
      [item.title, item.description, item.seller_name, item.contact_info]
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

        .hero {
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
          gap: 16px;
        }

        .card {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 22px;
          padding: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
        }

        .field {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px;
          font-size: 15px;
          box-sizing: border-box;
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
      `}</style>

      <div className="shell">
        <section className="hero">
          <div style={{ display: "flex", gap: 14, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: -1 }}>
                Marketplace 🛒
              </div>
              <div style={{ marginTop: 8, opacity: 0.92 }}>
                Browse listings, edit your own posts, and contact sellers.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="field"
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 260 }}
              />
              <button
                onClick={() => router.push("/sell")}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  background: "#f59e0b",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                + Create Listing
              </button>
            </div>
          </div>

          {!!loadError && (
            <div style={{ marginTop: 12, color: "#fecaca", fontWeight: 700 }}>
              {loadError}
            </div>
          )}
        </section>

        {loading ? (
          <div style={{ padding: 20 }}>Loading marketplace...</div>
        ) : filtered.length === 0 ? (
          <div className="card">No active listings yet.</div>
        ) : (
          <section className="grid">
            {filtered.map((item) => {
              const isOwner = String(item.user_id ?? "") === userId;

              return (
                <div key={String(item.id)} className="card">
                  <div
                    style={{
                      height: 170,
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

                  <div style={{ fontSize: 20, fontWeight: 900 }}>{String(item.title ?? "Untitled")}</div>
                  <div style={{ marginTop: 6, color: "#4b5563", minHeight: 42 }}>
                    {String(item.description ?? "No description provided.")}
                  </div>
                  <div style={{ marginTop: 10, fontWeight: 900, fontSize: 24 }}>
                    {formatPrice(item.price)}
                  </div>

                  <div style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
                    Seller: {String(item.seller_name || "Unknown")}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      background: "#fafafa",
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Contact Seller</div>

                    {item.contact_info ? (
                      <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>
                        {String(item.contact_info)}
                      </div>
                    ) : (
                      <div style={{ color: "#6b7280" }}>
                        Contact details not added yet.
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={() =>
                          setExpandedContactId((prev) =>
                            prev === String(item.id) ? null : String(item.id)
                          )
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "white",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {expandedContactId === String(item.id) ? "Hide Contact Help" : "Show Contact Help"}
                      </button>

                      {userEmail && item.contact_info && String(item.contact_info).includes("@") && (
                        <a
                          href={`mailto:${String(item.contact_info).trim()}`}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "#4f46e5",
                            color: "white",
                            textDecoration: "none",
                            fontWeight: 800,
                          }}
                        >
                          Email Seller
                        </a>
                      )}
                    </div>

                    {expandedContactId === String(item.id) && (
                      <div style={{ marginTop: 10, color: "#6b7280", fontSize: 14 }}>
                        Use the seller's posted contact info to coordinate payment, shipping, or pickup.
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => openEditor(item)}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "none",
                          background: "#2563eb",
                          color: "white",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => void deleteListing(String(item.id))}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "none",
                          background: "#ef4444",
                          color: "white",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
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
                placeholder="Title"
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
                value={editItem.seller_name}
                onChange={(e) => setEditItem({ ...editItem, seller_name: e.target.value })}
                placeholder="Seller name"
              />

              <input
                className="field"
                value={editItem.image_url}
                onChange={(e) => setEditItem({ ...editItem, image_url: e.target.value })}
                placeholder="Image URL"
              />

              {editItem.hasContactColumn && (
                <textarea
                  className="field"
                  style={{ minHeight: 90 }}
                  value={editItem.contact_info}
                  onChange={(e) => setEditItem({ ...editItem, contact_info: e.target.value })}
                  placeholder="Contact info (email, Instagram, Whatnot name, pickup notes, etc.)"
                />
              )}

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
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
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
