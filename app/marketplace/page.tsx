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

type ListingStatus = "active" | "pending" | "sold";
type DeliveryFilter = "all" | "shipping" | "pickup" | "both";
type StatusFilter = "all" | ListingStatus;
type SortMode = "newest" | "oldest" | "priceLow" | "priceHigh";

const MARKETPLACE_SAFETY_NOTE =
  "Adorable Vault helps collectors connect, but buyers and sellers are responsible for their own purchases, payments, shipping, pickup, item condition, refunds, returns, and completed transactions. Adorable Vault does not process payments, hold funds, guarantee items, verify sellers, insure packages, or take responsibility for private buyer/seller agreements.";

function formatMoney(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "No price listed";
  }

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

function getListingStatus(value: string | null): ListingStatus {
  const clean = String(value || "active").toLowerCase().trim();
  if (clean === "sold") return "sold";
  if (clean === "pending") return "pending";
  return "active";
}

function statusLabel(status: ListingStatus, soldDate: string) {
  if (status === "sold") return `✅ Sold${soldDate ? ` • ${soldDate}` : ""}`;
  if (status === "pending") return "⏳ Pending";
  return "🟢 Active";
}

function truncate(value: string | null, max = 135) {
  const clean = String(value || "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}...`;
}

function compareDates(a: string | null, b: string | null) {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return aTime - bTime;
}

function comparePrices(a: number | null, b: number | null) {
  const aPrice = a === null || a === undefined || Number.isNaN(Number(a)) ? Number.POSITIVE_INFINITY : Number(a);
  const bPrice = b === null || b === undefined || Number.isNaN(Number(b)) ? Number.POSITIVE_INFINITY : Number(b);
  return aPrice - bPrice;
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
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 920);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, deliveryFilter, statusFilter, sortMode, isMobile]);

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

  const marketplaceStats = useMemo(() => {
    const visibleToVisitors = listings.filter((item) => getListingStatus(item.status) === "active");
    const active = visibleToVisitors.length;
    const shipping = visibleToVisitors.filter((item) => !!item.shipping_available).length;
    const pickup = visibleToVisitors.filter((item) => !!item.local_pickup_available).length;
    const myListings = userId ? listings.filter((item) => item.user_id === userId).length : 0;

    return { active, shipping, pickup, myListings };
  }, [listings, userId]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = listings.filter((item) => {
      const isMine = !!userId && item.user_id === userId;
      const listingStatus = getListingStatus(item.status);

      // Visitors and non-owners only see active listings. Owners can still manage their own pending/sold listings.
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

    return [...filtered].sort((a, b) => {
      if (sortMode === "oldest") return compareDates(a.created_at, b.created_at);
      if (sortMode === "priceLow") return comparePrices(a.price, b.price);
      if (sortMode === "priceHigh") return comparePrices(b.price, a.price);
      return compareDates(b.created_at, a.created_at);
    });
  }, [listings, search, deliveryFilter, statusFilter, sortMode, userId]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (deliveryFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (sortMode !== "newest" ? 1 : 0);

  const cardsPerPage = isMobile ? 8 : 12;
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
    setSortMode("newest");
  }

  async function handleStartConversation(listing: Listing) {
    try {
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const next =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/marketplace";

        router.push(`/login?next=${encodeURIComponent(next)}`);
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

      setBusyId(listing.id);

      let conversationId = "";

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_conversations")
        .select("id")
        .eq("conversation_type", "marketplace")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .eq("seller_id", listing.user_id)
        .maybeSingle();

      if (existingError) {
        setMessage(existingError.message);
        setBusyId("");
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
              collector_name: listing.seller_name || "Collector",
            },
          ])
          .select("id")
          .single();

        if (createError) {
          setMessage(createError.message);
          setBusyId("");
          return;
        }

        conversationId = String(created.id);
      }

      router.push(`/messages?conversation=${conversationId}&listing=${listing.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open messages.");
      setBusyId("");
    }
  }

  async function updateListingStatus(listingId: string, nextStatus: ListingStatus) {
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
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 22px 52px rgba(0,0,0,0.35);
            font-weight: 1000;
          }
        `}</style>

        <div className="loadingCard">Loading marketplace...</div>
      </main>
    );
  }

  return (
    <main className="marketplacePage">
      <style jsx>{`
        .marketplacePage {
          min-height: 100vh;
          padding: 24px;
          padding-bottom: 118px;
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
          max-width: 1320px;
          margin: 0 auto;
        }

        .hero,
        .visitorCard,
        .safetyCard,
        .filterCard,
        .card,
        .emptyBox {
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
            linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 30px;
          padding: 24px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
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
          color: #fef3c7;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(2rem, 6vw, 3.1rem);
          line-height: 0.98;
          letter-spacing: -1.2px;
          font-weight: 1000;
        }

        .heroText {
          margin-top: 8px;
          opacity: 0.92;
          font-size: 16px;
          line-height: 1.5;
          max-width: 760px;
        }

        .heroStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
          max-width: 760px;
        }

        .heroStat {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.14);
          text-align: center;
        }

        .heroStat strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          color: #fde68a;
          margin-bottom: 5px;
        }

        .heroStat span {
          display: block;
          color: rgba(255,255,255,0.78);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.25;
        }

        .heroActions {
          display: grid;
          gap: 10px;
          min-width: 220px;
        }

        .visitorCard,
        .safetyCard,
        .filterCard,
        .card,
        .emptyBox {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
        }

        .visitorCard {
          padding: 16px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.26), transparent 30%),
            rgba(255,255,255,0.96);
        }

        .visitorTitle,
        .safetyTitle {
          font-weight: 1000;
          color: #312e81;
          margin-bottom: 6px;
        }

        .visitorTitle {
          font-size: 18px;
        }

        .visitorText,
        .safetyText {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          font-weight: 760;
        }

        .safetyCard {
          padding: 18px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 28%),
            rgba(255,255,255,0.96);
        }

        .safetyHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .safetyTitle {
          font-size: 18px;
        }

        .safetyText.collapsed {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
          padding: 18px;
          margin-bottom: 18px;
        }

        .filterTop {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
        }

        .filterTitle {
          font-size: 19px;
          font-weight: 1000;
          color: #111827;
        }

        .filterSub {
          font-size: 13px;
          color: #64748b;
          margin-top: 3px;
          font-weight: 780;
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
          font-family: inherit;
        }

        .quickChips {
          display: none;
          gap: 8px;
          overflow-x: auto;
          padding-top: 12px;
          scrollbar-width: none;
        }

        .quickChips::-webkit-scrollbar {
          display: none;
        }

        .filterBody {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .field,
        .selectField {
          width: 100%;
          min-height: 52px;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
          background: #ffffff;
          color: #111827;
          outline: none;
          font-family: inherit;
        }

        .field:focus,
        .selectField:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .filterGrid {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr;
          gap: 10px;
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
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          overflow: hidden;
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 38px rgba(0,0,0,0.20);
        }

        .imageBox {
          position: relative;
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
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          object-position: center;
          transition: transform 0.2s ease;
          display: block;
        }

        @media (hover: hover) and (pointer: fine) {
          .imageBox:hover .listingImage {
            transform: scale(1.08);
          }
        }

        .imagePlaceholder {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          color: #64748b;
          font-weight: 950;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.28), transparent 34%),
            linear-gradient(135deg, #f8fafc, #eef2ff);
        }

        .cardTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
        }

        .listingTitle {
          font-size: 23px;
          font-weight: 1000;
          line-height: 1.08;
          color: #111827;
          word-break: break-word;
        }

        .priceText {
          margin-top: 6px;
          font-size: 22px;
          font-weight: 1000;
          color: #1d4ed8;
        }

        .listedDate {
          margin-top: 4px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
        }

        .sellerLine {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.4;
        }

        .sellerLine strong {
          color: #334155;
        }

        .description {
          color: #4b5563;
          line-height: 1.52;
          font-size: 14px;
          font-weight: 760;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .bubbleRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .bubbleButton,
        .bubbleButton:visited,
        .heroAction,
        .heroAction:visited {
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
          font-family: inherit;
        }

        .heroAction {
          min-height: 52px;
          padding: 13px 18px;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          color: #312e81 !important;
          font-weight: 1000;
          box-shadow: 0 18px 34px rgba(255,255,255,0.18), 0 10px 24px rgba(0,0,0,0.22);
          border: 1px solid rgba(255,255,255,0.58);
        }

        .bubbleButton:hover,
        .heroAction:hover {
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

        .bubbleButton:disabled {
          opacity: 0.56;
          cursor: not-allowed;
          transform: none;
        }

        .pillRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          line-height: 1.2;
        }

        .statusPill {
          background: #ecfdf5;
          color: #166534;
          border-color: #bbf7d0;
        }

        .pendingPill {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .soldPill {
          background: #e2e8f0;
          color: #334155;
          border-color: #cbd5e1;
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
          font-weight: 900;
          cursor: pointer;
          min-height: 42px;
          font-family: inherit;
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
          font-weight: 900;
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
          font-weight: 850;
          border: 1px solid rgba(254,202,202,0.80);
        }

        .emptyBox {
          padding: 24px;
        }

        .emptyTitle {
          font-size: 24px;
          font-weight: 1000;
          margin-bottom: 6px;
          color: #111827;
        }

        .emptyText {
          color: #64748b;
          line-height: 1.5;
          font-weight: 760;
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
          font-weight: 780;
        }

        .mobileSticky {
          display: none;
        }

        @media (max-width: 920px) {
          .marketplacePage {
            padding: 12px;
            padding-bottom: 108px;
          }

          .hero {
            grid-template-columns: 1fr;
            padding: 18px;
            border-radius: 22px;
            gap: 14px;
          }

          .heroTitle {
            font-size: clamp(1.85rem, 9vw, 2.45rem);
          }

          .heroText {
            font-size: 13.5px;
            line-height: 1.45;
          }

          .heroStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 12px;
          }

          .heroStat {
            border-radius: 15px;
            padding: 10px 8px;
          }

          .heroStat strong {
            font-size: 19px;
          }

          .heroStat span {
            font-size: 10px;
          }

          .heroActions {
            min-width: 0;
            grid-template-columns: 1fr 1fr;
          }

          .heroAction {
            width: 100%;
            box-sizing: border-box;
            min-height: 48px;
            font-size: 13px;
            padding: 11px 12px;
          }

          .visitorCard,
          .safetyCard,
          .filterCard,
          .card,
          .emptyBox {
            border-radius: 20px;
            padding: 14px;
          }

          .visitorCard,
          .safetyCard,
          .filterCard {
            margin-bottom: 12px;
          }

          .visitorCard {
            display: grid;
          }

          .safetyHead {
            align-items: start;
          }

          .safetyText {
            font-size: 12.5px;
            line-height: 1.45;
          }

          .safetyTips {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .safetyTip {
            font-size: 12.5px;
            padding: 10px;
          }

          .filterTop {
            grid-template-columns: 1fr auto;
          }

          .filterToggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .quickChips {
            display: flex;
          }

          .filterBody {
            display: none;
          }

          .filterBody.open {
            display: grid;
          }

          .filterGrid {
            grid-template-columns: 1fr;
          }

          .field,
          .selectField {
            min-height: 50px;
            font-size: 14px;
          }

          .toggleWrap {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .listingGrid {
            gap: 12px;
          }

          .card {
            gap: 10px;
          }

          .imageBox {
            height: 184px;
            border-radius: 16px;
          }

          .cardTop {
            grid-template-columns: 1fr;
          }

          .listingTitle {
            font-size: 18px;
          }

          .priceText {
            font-size: 20px;
          }

          .description {
            font-size: 13px;
            line-height: 1.45;
          }

          .sellerLine {
            font-size: 13px;
          }

          .ownerActions {
            grid-template-columns: 1fr;
          }

          .bubbleRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .bubbleButton {
            width: 100%;
            white-space: normal;
            min-height: 44px;
            font-size: 13px;
          }

          .pillRow {
            gap: 6px;
          }

          .pill {
            font-size: 11px;
            padding: 6px 8px;
          }

          .mobileSticky {
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            z-index: 80;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-radius: 18px;
            background: rgba(15,23,42,0.90);
            border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 40px rgba(0,0,0,0.36);
          }

          .mobileSticky .bubbleButton {
            min-height: 43px;
            font-size: 12.5px;
            padding: 10px 11px;
          }
        }

        @media (max-width: 440px) {
          .heroActions,
          .toggleWrap,
          .mobileSticky {
            grid-template-columns: 1fr;
          }

          .imageBox {
            height: 160px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="heroBadge">🛍️ Collector marketplace</div>
            <h1 className="heroTitle">Marketplace</h1>
            <div className="heroText">
              Browse active collector listings for free. Log in to message sellers, create listings,
              and keep your Doorables extras easier to find.
            </div>

            <div className="heroStats">
              <div className="heroStat">
                <strong>{marketplaceStats.active}</strong>
                <span>active listings</span>
              </div>
              <div className="heroStat">
                <strong>{marketplaceStats.shipping}</strong>
                <span>offer shipping</span>
              </div>
              <div className="heroStat">
                <strong>{marketplaceStats.pickup}</strong>
                <span>local pickup</span>
              </div>
              <div className="heroStat">
                <strong>{userId ? marketplaceStats.myListings : "Free"}</strong>
                <span>{userId ? "my listings" : "to browse"}</span>
              </div>
            </div>
          </div>

          <div className="heroActions">
            <Link href="/sell" className="heroAction">
              ✨ Create Listing
            </Link>
            <Link href={userId ? "/messages" : "/login?next=/marketplace"} className="heroAction">
              💬 {userId ? "Messages" : "Log In"}
            </Link>
          </div>
        </section>

        {!userId && (
          <section className="visitorCard">
            <div>
              <div className="visitorTitle">Browsing as a guest 💜</div>
              <div className="visitorText">
                You can look around without an account. To message sellers or post your own listing,
                log in or start free.
              </div>
            </div>

            <div className="bubbleRow">
              <Link href="/login?next=/marketplace" className="bubbleButton bubblePrimary">
                🔐 Log In / Sign Up
              </Link>

              <Link href="/pricing" className="bubbleButton bubbleLight">
                See Plans
              </Link>
            </div>
          </section>
        )}

        <section className="safetyCard">
          <div className="safetyHead">
            <div>
              <div className="safetyTitle">Marketplace safety note</div>
              <div className={`safetyText ${!showSafetyDetails && isMobile ? "collapsed" : ""}`}>
                {MARKETPLACE_SAFETY_NOTE}
              </div>
            </div>

            <button
              type="button"
              className="bubbleButton bubbleNeutral"
              onClick={() => setShowSafetyDetails((prev) => !prev)}
            >
              {showSafetyDetails ? "Less" : "Details"}
            </button>
          </div>

          {(!isMobile || showSafetyDetails) && (
            <div className="safetyTips">
              <div className="safetyTip">💬 Keep deal details clear in messages before paying.</div>
              <div className="safetyTip">📦 Confirm shipping, pickup, condition, and price first.</div>
              <div className="safetyTip">⚠️ Report suspicious listings or behavior through Feedback.</div>
            </div>
          )}
        </section>

        <section className="filterCard">
          <div className="filterTop">
            <div>
              <div className="filterTitle">Find listings</div>
              <div className="filterSub">
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

          <div className="quickChips">
            {[
              { value: "all", label: "All" },
              { value: "shipping", label: "Shipping" },
              { value: "pickup", label: "Pickup" },
              { value: "both", label: "Both" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDeliveryFilter(option.value as DeliveryFilter)}
                className={`toggleButton ${deliveryFilter === option.value ? "toggleButtonActive" : ""}`}
              >
                {option.label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button type="button" className="toggleButton" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>

          <div className={`filterBody ${showMobileFilters || !isMobile ? "open" : ""}`}>
            <div className="filterGrid">
              <input
                className="field"
                placeholder="Search title, description, seller, or pickup location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="selectField"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priceLow">Price: low to high</option>
                <option value="priceHigh">Price: high to low</option>
              </select>
            </div>

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
                  onClick={() => setDeliveryFilter(option.value as DeliveryFilter)}
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
                    onClick={() => setStatusFilter(option.value as StatusFilter)}
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
                <Link href="/login?next=/marketplace" className="bubbleButton bubbleLight">
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
            <div className="emptyTitle">No listings found yet.</div>
            <div className="emptyText">
              Try clearing filters, searching another keyword, or creating the first listing.
            </div>
            <div className="bubbleRow" style={{ marginTop: 14 }}>
              <button type="button" className="bubbleButton bubbleNeutral" onClick={clearFilters}>
                🧹 Clear Filters
              </button>
              <Link href="/sell" className="bubbleButton bubblePrimary">
                ✨ Create Listing
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="listingGrid">
              {pagedListings.map((listing, index) => {
                const isOwnListing = !!userId && listing.user_id === userId;
                const listingStatus = getListingStatus(listing.status);
                const soldDate = formatDate(listing.sold_at);
                const createdDate = formatDate(listing.created_at);
                const statusClass =
                  listingStatus === "sold" ? "soldPill" : listingStatus === "pending" ? "pendingPill" : "statusPill";

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
                        <div className="imagePlaceholder">No image</div>
                      )}
                    </div>

                    <div className="cardTop">
                      <div>
                        <div className="listingTitle">{listing.title}</div>
                        <div className="priceText">{formatMoney(listing.price)}</div>
                        {createdDate && <div className="listedDate">Listed {createdDate}</div>}
                      </div>

                      {isOwnListing && <span className="pill">Your listing</span>}
                    </div>

                    <div className="pillRow">
                      <span className={`pill ${statusClass}`}>{statusLabel(listingStatus, soldDate)}</span>

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
                      <div className="description">{isMobile ? truncate(listing.description, 150) : listing.description}</div>
                    ) : null}

                    <div className="sellerLine">
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
                          disabled={busyId === listing.id}
                          onClick={() => void handleStartConversation(listing)}
                        >
                          {busyId === listing.id ? "Opening..." : "💬 Message Seller"}
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

                <div style={{ fontWeight: 900 }}>Page {safePage} of {totalPages}</div>

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

      <div className="mobileSticky">
        <Link href="/sell" className="bubbleButton bubblePrimary">
          ✨ Sell
        </Link>
        <Link href={userId ? "/messages" : "/login?next=/marketplace"} className="bubbleButton bubbleLight">
          {userId ? "💬 Messages" : "🔐 Log In"}
        </Link>
      </div>
    </main>
  );
}
