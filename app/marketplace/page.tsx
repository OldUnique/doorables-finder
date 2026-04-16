"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  seller_name: string | null;
  user_id: string | null;
  status: string | null;
  sold_at: string | null;
  shipping_available: boolean | null;
  shipping_price: number | null;
  local_pickup_available: boolean | null;
  pickup_location: string | null;
  created_at?: string | null;
};

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) return "No price listed";
  return `$${Number(value).toFixed(2)}`;
}

export default function MarketplacePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? "");

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select(`
          id,
          title,
          description,
          price,
          image_url,
          seller_name,
          user_id,
          status,
          sold_at,
          shipping_available,
          shipping_price,
          local_pickup_available,
          pickup_location,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setListings((data || []) as Listing[]);
      setLoading(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load marketplace.");
      setLoading(false);
    }
  }

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings.filter((item) => {
      const isMine = !!userId && item.user_id === userId;

      const matchesSearch =
        !q ||
        [
          item.title,
          item.description,
          item.seller_name,
          item.pickup_location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesDelivery =
        deliveryFilter === "all"
          ? true
          : deliveryFilter === "shipping"
            ? !!item.shipping_available
            : deliveryFilter === "pickup"
              ? !!item.local_pickup_available
              : !!item.shipping_available && !!item.local_pickup_available;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : isMine
            ? (item.status || "active") === statusFilter
            : (item.status || "active") === "active";

      return matchesSearch && matchesDelivery && matchesStatus;
    });
  }, [listings, search, deliveryFilter, statusFilter, userId]);

  async function handleStartConversation(listing: Listing) {
    try {
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!listing.user_id) {
        setMessage("This listing is missing a seller account.");
        return;
      }

      if (listing.user_id === user.id) {
        router.push("/messages");
        return;
      }

      let conversationId = "";

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .eq("seller_id", listing.user_id)
        .maybeSingle();

      if (existingError) {
        setMessage(existingError.message);
        return;
      }

      if (existing?.id) {
        conversationId = String(existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("marketplace_conversations")
          .insert([
            {
              listing_id: listing.id,
              buyer_id: user.id,
              seller_id: listing.user_id,
              listing_title: listing.title,
            },
          ])
          .select("id")
          .single();

        if (createError) {
          setMessage(createError.message);
          return;
        }

        conversationId = String(created.id);
      }

      router.push(`/messages?conversation=${conversationId}&listing=${listing.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open messages.");
    }
  }

  async function updateListingStatus(listingId: string, nextStatus: "active" | "pending" | "sold") {
    try {
      setBusyId(listingId);
      setMessage("");

      const payload: any = {
        status: nextStatus,
        sold_at: nextStatus === "sold" ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("marketplace_listings")
        .update(payload)
        .eq("id", listingId)
        .eq("user_id", userId);

      if (error) {
        setMessage(error.message);
        setBusyId("");
        return;
      }

      setListings((prev) =>
        prev.map((item) =>
          item.id === listingId
            ? {
                ...item,
                status: nextStatus,
                sold_at: nextStatus === "sold" ? new Date().toISOString() : null,
              }
            : item
        )
      );

      setBusyId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update listing.");
      setBusyId("");
    }
  }

  async function deleteListing(listingId: string) {
    const confirmed = typeof window === "undefined" ? True : window.confirm("Delete this listing?");
    if (!confirmed) return;

    try {
      setBusyId(listingId);
      setMessage("");

      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId)
        .eq("user_id", userId);

      if (error) {
        setMessage(error.message);
        setBusyId("");
        return;
      }

      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setBusyId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete listing.");
      setBusyId("");
    }
  }

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
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .filterCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          margin-bottom: 18px;
        }

        .field {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
        }

        .listingGrid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }

        @media (min-width: 800px) {
          .listingGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1120px) {
          .listingGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .card {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .imageBox {
          height: 240px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .primaryButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          background: #f3f4f6;
          color: #111827;
          text-decoration: none;
          font-weight: 800;
        }

        .dangerButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          font-weight: 800;
          cursor: pointer;
        }

        .pillRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }

        .toggleWrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .toggleButton {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 800;
          cursor: pointer;
        }

        .toggleButtonActive {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white;
          border-color: transparent;
        }

        .ownerActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <h1 style={{ margin: 0, fontSize: 46, fontWeight: 900 }}>Marketplace</h1>
          <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
            Browse listings, check shipping or pickup options, and message sellers directly.
          </div>
        </section>

        <section className="filterCard">
          <div style={{ display: "grid", gap: 12 }}>
            <input
              className="field"
              placeholder="Search by title, description, seller, or pickup location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="toggleWrap">
              {[
                { value: "all", label: "All Delivery" },
                { value: "shipping", label: "Shipping" },
                { value: "pickup", label: "Local Pickup" },
                { value: "both", label: "Both" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDeliveryFilter(option.value)}
                  className={`toggleButton ${deliveryFilter === option.value ? "toggleButtonActive" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {!!userId && (
              <div className="toggleWrap">
                {[
                  { value: "active", label: "Active" },
                  { value: "pending", label: "Pending" },
                  { value: "sold", label: "Sold" },
                  { value: "all", label: "All Statuses" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`toggleButton ${statusFilter === option.value ? "toggleButtonActive" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/sell" className="secondaryButton">
                Create Listing
              </Link>
              {userId ? (
                <Link href="/messages" className="secondaryButton">
                  Open Messages
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {!!message && (
          <div
            style={{
              background: "rgba(255,255,255,0.96)",
              color: "#b91c1c",
              borderRadius: 18,
              padding: 14,
              marginBottom: 18,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div style={{ fontWeight: 800 }}>Loading marketplace...</div>
        ) : filteredListings.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.96)",
              color: "#111827",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            }}
          >
            No listings found yet.
          </div>
        ) : (
          <section className="listingGrid">
            {filteredListings.map((listing) => {
              const isOwnListing = !!userId && listing.user_id === userId;
              const listingStatus = listing.status || "active";

              return (
                <article key={listing.id} className="card">
                  <div className="imageBox">
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ color: "#6b7280", fontWeight: 700 }}>No image</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{listing.title}</div>
                    <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: "#1d4ed8" }}>
                      {formatMoney(listing.price)}
                    </div>
                  </div>

                  <div className="pillRow">
                    <span className="pill">
                      {listingStatus === "sold" ? "✅ Sold" : listingStatus === "pending" ? "⏳ Pending" : "🟢 Active"}
                    </span>

                    {listing.shipping_available ? (
                      <span className="pill">
                        🚚 Shipping {listing.shipping_price !== null ? `• ${formatMoney(listing.shipping_price)}` : ""}
                      </span>
                    ) : null}

                    {listing.local_pickup_available ? (
                      <span className="pill">
                        📍 Pickup{listing.pickup_location ? ` • ${listing.pickup_location}` : ""}
                      </span>
                    ) : null}
                  </div>

                  {listing.description ? (
                    <div style={{ color: "#4b5563", lineHeight: 1.5 }}>{listing.description}</div>
                  ) : null}

                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    Seller: <strong>{listing.seller_name || "Unknown seller"}</strong>
                  </div>

                  {isOwnListing ? (
                    <div style={{ display: "grid", gap: 10, marginTop: "auto" }}>
                      <div className="ownerActions">
                        <button
                          type="button"
                          className="primaryButton"
                          disabled={busyId === listing.id}
                          onClick={() => void updateListingStatus(listing.id, "active")}
                        >
                          Active
                        </button>

                        <button
                          type="button"
                          className="secondaryButton"
                          style={{ cursor: "pointer" }}
                          disabled={busyId === listing.id}
                          onClick={() => void updateListingStatus(listing.id, "pending")}
                        >
                          Pending
                        </button>

                        <button
                          type="button"
                          className="secondaryButton"
                          style={{ cursor: "pointer" }}
                          disabled={busyId === listing.id}
                          onClick={() => void updateListingStatus(listing.id, "sold")}
                        >
                          Sold
                        </button>

                        <button
                          type="button"
                          className="dangerButton"
                          disabled={busyId === listing.id}
                          onClick={() => void deleteListing(listing.id)}
                        >
                          Delete
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href="/messages" className="secondaryButton">
                          Open Messages
                        </Link>

                        <Link href="/sell" className="secondaryButton">
                          New Listing
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
                      <button
                        type="button"
                        className="primaryButton"
                        onClick={() => void handleStartConversation(listing)}
                      >
                        Message Seller
                      </button>

                      <Link href="/sell" className="secondaryButton">
                        Sell Similar
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
