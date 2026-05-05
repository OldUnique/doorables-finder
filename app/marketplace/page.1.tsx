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
  created_at: string | null;
};

const MARKETPLACE_SAFETY_NOTE =
  "Adorable Vault helps collectors connect, but buyers and sellers are responsible for their own purchases, payments, shipping, pickup, item condition, refunds, returns, and completed transactions. Adorable Vault does not process payments, hold funds, guarantee items, verify sellers, insure packages, or take responsibility for private buyer/seller agreements.";

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) return "No price listed";
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MarketplacePage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 920);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, deliveryFilter, statusFilter, isMobile]);

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? "");

      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("is_subscribed")
          .eq("id", user.id)
          .maybeSingle();

        setIsSubscribed(!!profile?.is_subscribed);
      } else {
        setIsSubscribed(false);
      }

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
      const listingStatus = item.status || "active";

      // Visitors only see active listings. Owners can still see their own pending/sold listings.
      if (!isMine && listingStatus !== "active") return false;

      const matchesSearch =
        !q ||
        [item.title, item.description, item.seller_name, item.pickup_location]
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

      const matchesStatus = statusFilter === "all" ? true : listingStatus === statusFilter;

      return matchesSearch && matchesDelivery && matchesStatus;
    });
  }, [listings, search, deliveryFilter, statusFilter, userId]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (deliveryFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const cardsPerPage = isMobile ? 6 : 12;
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedListings = filteredListings.slice(
    (safePage - 1) * cardsPerPage,
    safePage * cardsPerPage
  );

  function clearFilters() {
    setSearch("");
    setDeliveryFilter("all");
    setStatusFilter("all");
  }

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
              conversation_type: "marketplace",
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

      const payload = {
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
    const confirmed =
      typeof window === "undefined" ? true : window.confirm("Delete this listing?");
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

  if (loading) {
    return (
      <main className="loadingPage">
        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            color: white;
            background:
              radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
              radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
              linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%);
          }

          .loadingCard {
            width: min(520px, 100%);
            text-align: center;
            padding: 28px;
            border-radius: 28px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 22px 52px rgba(0,0,0,0.35);
            font-weight: 900;
          }
        `}</style>

        <div className="loadingCard">Loading marketplace...</div>
      </main>
    );
  }

  if (!isSubscribed) {
    return (
      <main className="gatePage">
        <style jsx>{`
          .gatePage {
            min-height: 100vh;
            padding: 24px;
            color: white;
            background:
              radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
              radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
              linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%);
          }

          .gateShell {
            max-width: 900px;
            margin: 0 auto;
          }

          .gateHero {
            background:
              radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
              linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
            border-radius: 28px;
            padding: 24px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.30);
            margin-bottom: 18px;
            border: 1px solid rgba(255,255,255,0.12);
          }

          .gateCard {
            background: rgba(255,255,255,0.96);
            color: #111827;
            border-radius: 24px;
            padding: 22px;
            box-shadow: 0 12px 28px rgba(0,0,0,0.14);
            margin-bottom: 14px;
          }

          .safetyGate {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 14px;
            color: #475569;
            line-height: 1.55;
            font-size: 14px;
            margin-top: 14px;
          }

          .buttonRow {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 14px;
          }

          .primaryLink,
          .secondaryLink,
          .primaryLink:visited,
          .secondaryLink:visited {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 16px;
            border-radius: 999px;
            text-decoration: none !important;
            font-weight: 900;
            min-height: 46px;
          }

          .primaryLink,
          .primaryLink:visited {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white !important;
            box-shadow: 0 12px 22px rgba(79,70,229,0.28);
          }

          .secondaryLink,
          .secondaryLink:visited {
            background: #eef2ff;
            color: #3730a3 !important;
            border: 1px solid #c7d2fe;
          }

          @media (max-width: 720px) {
            .gatePage {
              padding: 14px;
            }

            .gateHero,
            .gateCard {
              border-radius: 22px;
              padding: 18px;
            }

            .primaryLink,
            .secondaryLink {
              width: 100%;
            }
          }
        `}</style>

        <div className="gateShell">
          <section className="gateHero">
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 2.9rem)", fontWeight: 1000 }}>
              Marketplace
            </h1>
            <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
              Browse collector listings, message sellers, and find pieces your vault still needs.
            </div>
          </section>

          <section className="gateCard">
            <div style={{ fontSize: 24, fontWeight: 1000, marginBottom: 8 }}>
              Upgrade to unlock Marketplace 💜
            </div>
            <div style={{ color: "#4b5563", lineHeight: 1.6 }}>
              Free accounts can save up to 50 Doorables in collection. Upgrade to browse Marketplace,
              message through listings, and unlock selling.
            </div>

            <div className="buttonRow">
              <Link href="/pricing" className="primaryLink">
                Upgrade Now
              </Link>

              {!userId && (
                <Link href="/login" className="secondaryLink">
                  Log In / Sign Up
                </Link>
              )}
            </div>

            <div className="safetyGate">
              <strong>Marketplace safety note:</strong> {MARKETPLACE_SAFETY_NOTE}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="marketplacePage">
      <style jsx>{`
        .marketplacePage {
          min-height: 100vh;
          padding: 24px;
          color: white;
          background:
            radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
            radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
            radial-gradient(circle at 75% 88%, rgba(236,72,153,0.16) 0%, rgba(236,72,153,0) 24%),
            linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%);
        }

        .marketplacePage a,
        .marketplacePage a:visited {
          text-decoration: none !important;
        }

        .shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
            linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .heroBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          font-weight: 1000;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .heroAction,
        .heroAction:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 13px 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          color: #312e81 !important;
          text-decoration: none !important;
          font-weight: 1000;
          box-shadow:
            0 18px 34px rgba(255,255,255,0.18),
            0 10px 24px rgba(0,0,0,0.22);
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.58);
        }

        .safetyCard {
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 28%),
            rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.50);
        }

        .safetyTitle {
          font-size: 18px;
          font-weight: 1000;
          margin-bottom: 7px;
          color: #312e81;
        }

        .safetyText {
          color: #475569;
          line-height: 1.6;
          font-size: 14px;
        }

        .safetyTips {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .safetyTip {
          border-radius: 16px;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.4;
        }

        .filterCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.45);
        }

        .filterTop {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
        }

        .filterToggle {
          display: none;
          border: none;
          border-radius: 999px;
          padding: 12px 14px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
          min-height: 46px;
        }

        .filterBody {
          display: grid;
          gap: 12px;
          margin-top: 12px;
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
          border: 1px solid rgba(255,255,255,0.45);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 38px rgba(0,0,0,0.20);
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

        .listingImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        .imageBox:hover .listingImage {
          transform: scale(1.08);
        }

        .bubbleRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .bubbleButton,
        .bubbleButton:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 46px;
          padding: 11px 15px;
          border-radius: 999px;
          border: 1px solid transparent;
          text-decoration: none !important;
          font-weight: 950;
          cursor: pointer;
          box-sizing: border-box;
          line-height: 1.1;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .bubbleButton:hover {
          transform: translateY(-2px);
        }

        .bubblePrimary,
        .bubblePrimary:visited {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white !important;
          box-shadow: 0 12px 22px rgba(79,70,229,0.28);
        }

        .bubbleLight,
        .bubbleLight:visited {
          background: #eef2ff;
          color: #3730a3 !important;
          border-color: #c7d2fe;
          box-shadow: 0 8px 18px rgba(99,102,241,0.10);
        }

        .bubbleNeutral,
        .bubbleNeutral:visited {
          background: #f8fafc;
          color: #111827 !important;
          border-color: #d1d5db;
          box-shadow: 0 8px 18px rgba(15,23,42,0.08);
        }

        .bubbleWarn,
        .bubbleWarn:visited {
          background: #fff7ed;
          color: #9a3412 !important;
          border-color: #fed7aa;
          box-shadow: 0 8px 18px rgba(234,88,12,0.10);
        }

        .bubbleDanger {
          background: #fef2f2;
          color: #b91c1c !important;
          border-color: #fecaca;
          box-shadow: 0 8px 18px rgba(185,28,28,0.08);
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
          border-radius: 999px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 800;
          cursor: pointer;
          min-height: 42px;
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

        .pager {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .pagerButton {
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.08);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .pagerButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .messageBox {
          background: rgba(255,255,255,0.96);
          color: #b91c1c;
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 18px;
          font-weight: 700;
        }

        .emptyBox {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
        }

        .cardSafetyNote {
          margin-top: auto;
          padding: 10px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        @media (max-width: 920px) {
          .marketplacePage {
            padding: 14px;
          }

          .hero {
            grid-template-columns: 1fr;
            padding: 18px;
            border-radius: 22px;
          }

          .heroAction {
            width: 100%;
            box-sizing: border-box;
          }

          .safetyCard,
          .filterCard,
          .card,
          .emptyBox {
            border-radius: 20px;
          }

          .safetyCard,
          .filterCard,
          .card {
            padding: 14px;
          }

          .safetyTips {
            grid-template-columns: 1fr;
          }

          .filterTop {
            grid-template-columns: 1fr auto;
          }

          .filterToggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .filterBody {
            display: none;
          }

          .filterBody.open {
            display: grid;
          }

          .field {
            min-height: 50px;
          }

          .imageBox {
            height: 210px;
          }

          .ownerActions {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }

          .toggleWrap {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .bubbleRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .bubbleButton,
          .heroAction {
            width: 100%;
            white-space: normal;
          }
        }

        @media (max-width: 440px) {
          .toggleWrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="heroBadge">🛍️ Collector marketplace</div>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 2.9rem)", fontWeight: 1000 }}>
              Marketplace
            </h1>
            <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16, lineHeight: 1.5 }}>
              Browse listings, check shipping or pickup options, and message sellers directly.
            </div>
          </div>

          <Link href="/sell" className="heroAction">
            ✨ Create Listing
          </Link>
        </section>

        <section className="safetyCard">
          <div className="safetyTitle">Marketplace safety note</div>
          <div className="safetyText">{MARKETPLACE_SAFETY_NOTE}</div>

          <div className="safetyTips">
            <div className="safetyTip">💬 Keep deal details clear in messages before paying.</div>
            <div className="safetyTip">📦 Confirm shipping, pickup, condition, and price first.</div>
            <div className="safetyTip">⚠️ Report suspicious listings or behavior through Feedback.</div>
          </div>
        </section>

        <section className="filterCard">
          <div className="filterTop">
            <div>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>Find listings</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3, fontWeight: 750 }}>
                Showing {pagedListings.length} of {filteredListings.length}
                {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
              </div>
            </div>

            <button
              type="button"
              className="filterToggle"
              onClick={() => setShowMobileFilters((prev) => !prev)}
            >
              {showMobileFilters ? "Hide" : "Filters"}
            </button>
          </div>

          <div className={`filterBody ${showMobileFilters || !isMobile ? "open" : ""}`}>
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
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "pending", label: "Pending" },
                  { value: "sold", label: "Sold" },
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

            <div className="bubbleRow">
              <Link href="/sell" className="bubbleButton bubblePrimary">
                ✨ Create Listing
              </Link>

              {userId ? (
                <Link href="/messages" className="bubbleButton bubbleLight">
                  💬 Open Messages
                </Link>
              ) : (
                <Link href="/login" className="bubbleButton bubbleLight">
                  🔐 Log In / Sign Up
                </Link>
              )}

              {activeFilterCount > 0 && (
                <button type="button" className="bubbleButton bubbleNeutral" onClick={clearFilters}>
                  🧹 Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        {!!message && <div className="messageBox">{message}</div>}

        {filteredListings.length === 0 ? (
          <div className="emptyBox">
            <div style={{ fontSize: 24, fontWeight: 1000, marginBottom: 6 }}>
              No listings found yet.
            </div>
            <div style={{ color: "#64748b", lineHeight: 1.5 }}>
              Try clearing filters, searching another keyword, or creating the first listing.
            </div>
          </div>
        ) : (
          <>
            <section className="listingGrid">
              {pagedListings.map((listing, index) => {
                const isOwnListing = !!userId && listing.user_id === userId;
                const listingStatus = listing.status || "active";
                const soldDate = formatDate(listing.sold_at);
                const createdDate = formatDate(listing.created_at);

                return (
                  <article key={listing.id} className="card">
                    <div className="imageBox">
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={listing.title}
                          loading={index < 2 ? "eager" : "lazy"}
                          decoding="async"
                          className="listingImage"
                        />
                      ) : (
                        <div style={{ color: "#6b7280", fontWeight: 700 }}>No image</div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: 24, fontWeight: 1000, lineHeight: 1.1 }}>
                        {listing.title}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 21, fontWeight: 1000, color: "#1d4ed8" }}>
                        {formatMoney(listing.price)}
                      </div>
                      {createdDate && (
                        <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
                          Listed {createdDate}
                        </div>
                      )}
                    </div>

                    <div className="pillRow">
                      <span className="pill">
                        {listingStatus === "sold" ? "✅ Sold" : listingStatus === "pending" ? "⏳ Pending" : "🟢 Active"}
                        {listingStatus === "sold" && soldDate ? ` • ${soldDate}` : ""}
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

                    {!isOwnListing && (
                      <div className="cardSafetyNote">
                        Buyer and seller handle payment, pickup/shipping, item condition, and any refunds directly.
                      </div>
                    )}

                    {isOwnListing ? (
                      <div style={{ display: "grid", gap: 10, marginTop: "auto" }}>
                        <div className="ownerActions">
                          <button
                            type="button"
                            className="bubbleButton bubblePrimary"
                            disabled={busyId === listing.id}
                            onClick={() => void updateListingStatus(listing.id, "active")}
                          >
                            🟢 Active
                          </button>

                          <button
                            type="button"
                            className="bubbleButton bubbleLight"
                            disabled={busyId === listing.id}
                            onClick={() => void updateListingStatus(listing.id, "pending")}
                          >
                            ⏳ Pending
                          </button>

                          <button
                            type="button"
                            className="bubbleButton bubbleNeutral"
                            disabled={busyId === listing.id}
                            onClick={() => void updateListingStatus(listing.id, "sold")}
                          >
                            ✅ Sold
                          </button>

                          <button
                            type="button"
                            className="bubbleButton bubbleDanger"
                            disabled={busyId === listing.id}
                            onClick={() => void deleteListing(listing.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>

                        <div className="bubbleRow">
                          <Link href={`/sell?edit=${listing.id}`} className="bubbleButton bubbleLight">
                            ✏️ Edit Listing
                          </Link>

                          <Link href="/messages" className="bubbleButton bubbleLight">
                            💬 Open Messages
                          </Link>

                          <Link href="/sell" className="bubbleButton bubblePrimary">
                            ✨ New Listing
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="bubbleRow" style={{ marginTop: "auto" }}>
                        <button
                          type="button"
                          className="bubbleButton bubblePrimary"
                          onClick={() => void handleStartConversation(listing)}
                        >
                          💬 Message Seller
                        </button>

                        <Link href="/sell" className="bubbleButton bubbleLight">
                          🛍️ Sell Similar
                        </Link>

                        <Link href={`/feedback?listing=${listing.id}`} className="bubbleButton bubbleWarn">
                          ⚠️ Report Concern
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            {totalPages > 1 && (
              <div className="pager">
                <button
                  type="button"
                  className="pagerButton"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>

                <div style={{ fontWeight: 800 }}>
                  Page {safePage} of {totalPages}
                </div>

                <button
                  type="button"
                  className="pagerButton"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <section className="safetyCard" style={{ marginTop: 18 }}>
          <div className="safetyTitle">Transaction responsibility</div>
          <div className="safetyText">
            {MARKETPLACE_SAFETY_NOTE} Use your best judgment, keep communication clear,
            and only complete transactions in a way you are comfortable with.
          </div>
        </section>
      </div>
    </main>
  );
}
