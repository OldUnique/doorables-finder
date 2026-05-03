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

type TierCard = {
  title: string;
  label: string;
  subtext: string;
  accent: string;
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

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function getCollectionTier(completion: number, ownedCount: number): TierCard {
  if (completion >= 90 || ownedCount >= 400) {
    return {
      title: "Collection Tier",
      label: "Crown Collector",
      subtext: `${completion}% complete`,
      accent: "linear-gradient(135deg,#f59e0b,#facc15)",
    };
  }

  if (completion >= 70 || ownedCount >= 250) {
    return {
      title: "Collection Tier",
      label: "Elite Collector",
      subtext: `${completion}% complete`,
      accent: "linear-gradient(135deg,#7c3aed,#c084fc)",
    };
  }

  if (completion >= 45 || ownedCount >= 125) {
    return {
      title: "Collection Tier",
      label: "Vault Builder",
      subtext: `${completion}% complete`,
      accent: "linear-gradient(135deg,#2563eb,#60a5fa)",
    };
  }

  if (completion >= 20 || ownedCount >= 50) {
    return {
      title: "Collection Tier",
      label: "Treasure Tracker",
      subtext: `${completion}% complete`,
      accent: "linear-gradient(135deg,#16a34a,#4ade80)",
    };
  }

  return {
    title: "Collection Tier",
    label: "Starter Shelf",
    subtext: `${completion}% complete`,
    accent: "linear-gradient(135deg,#64748b,#94a3b8)",
  };
}

function getMarketplaceTier(params: {
  averageRating: number;
  reviewCount: number;
  activeListings: number;
  soldListings: number;
}) {
  const { averageRating, reviewCount, activeListings, soldListings } = params;

  let stars = 0;
  if (reviewCount > 0) {
    stars = Number(averageRating.toFixed(1));
  } else if (soldListings >= 10) {
    stars = 5.0;
  } else if (soldListings >= 5) {
    stars = 4.7;
  } else if (soldListings >= 2) {
    stars = 4.3;
  } else if (activeListings >= 3) {
    stars = 4.0;
  }

  if ((reviewCount >= 10 && averageRating >= 4.8) || soldListings >= 15) {
    return {
      title: "Marketplace Tier",
      label: "Vault Legend",
      subtext: stars > 0 ? `${stars.toFixed(1)} ★ marketplace rating` : "Top marketplace energy",
      accent: "linear-gradient(135deg,#f59e0b,#fb7185)",
      stars,
    };
  }

  if ((reviewCount >= 5 && averageRating >= 4.5) || soldListings >= 7) {
    return {
      title: "Marketplace Tier",
      label: "Marketplace MVP",
      subtext: stars > 0 ? `${stars.toFixed(1)} ★ marketplace rating` : "Strong seller momentum",
      accent: "linear-gradient(135deg,#7c3aed,#ec4899)",
      stars,
    };
  }

  if ((reviewCount >= 3 && averageRating >= 4.2) || soldListings >= 3) {
    return {
      title: "Marketplace Tier",
      label: "Trusted Trader",
      subtext: stars > 0 ? `${stars.toFixed(1)} ★ marketplace rating` : "Growing trade trust",
      accent: "linear-gradient(135deg,#2563eb,#7c3aed)",
      stars,
    };
  }

  if (activeListings > 0 || soldListings > 0) {
    return {
      title: "Marketplace Tier",
      label: "Smooth Seller",
      subtext: stars > 0 ? `${stars.toFixed(1)} ★ marketplace rating` : "Getting active in marketplace",
      accent: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
      stars,
    };
  }

  return {
    title: "Marketplace Tier",
    label: "New Seller",
    subtext: "No marketplace rating yet",
    accent: "linear-gradient(135deg,#64748b,#94a3b8)",
    stars,
  };
}

function getCommunityTier(params: {
  monthlyMessages: number;
  monthlyListings: number;
  monthlyPhotos: number;
  monthlyFeedback: number;
  isPublic: boolean;
}) {
  const score =
    params.monthlyMessages * 2 +
    params.monthlyListings * 2 +
    params.monthlyPhotos * 2 +
    params.monthlyFeedback +
    (params.isPublic ? 2 : 0);

  if (score >= 20) {
    return {
      title: "Community Tier",
      label: "Heart of the Vault",
      subtext: "Very active this month",
      accent: "linear-gradient(135deg,#ec4899,#f472b6)",
      score,
    };
  }

  if (score >= 12) {
    return {
      title: "Community Tier",
      label: "Vault Favorite",
      subtext: "Strong community energy",
      accent: "linear-gradient(135deg,#8b5cf6,#c084fc)",
      score,
    };
  }

  if (score >= 7) {
    return {
      title: "Community Tier",
      label: "Chat Champ",
      subtext: "Nicely active this month",
      accent: "linear-gradient(135deg,#2563eb,#60a5fa)",
      score,
    };
  }

  if (score >= 3) {
    return {
      title: "Community Tier",
      label: "Community Spark",
      subtext: "Building momentum this month",
      accent: "linear-gradient(135deg,#14b8a6,#34d399)",
      score,
    };
  }

  return {
    title: "Community Tier",
    label: "Quiet Gem",
    subtext: "Low-key month so far",
    accent: "linear-gradient(135deg,#64748b,#94a3b8)",
    score,
  };
}

function renderStars(value: number) {
  if (value <= 0) return "☆☆☆☆☆";
  const rounded = Math.round(value);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function seriesSort(a: string, b: string) {
  const aStr = String(a || "");
  const bStr = String(b || "");
  const aMatch = aStr.match(/\d+/);
  const bMatch = bStr.match(/\d+/);

  if (aMatch && bMatch) {
    const aNum = Number(aMatch[0]);
    const bNum = Number(bMatch[0]);
    if (aNum !== bNum) return aNum - bNum;
  }

  return aStr.localeCompare(bStr, undefined, {
    numeric: true,
    sensitivity: "base",
  });
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
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [collectorUserId, setCollectorUserId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [startingChatId, setStartingChatId] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  const [marketplaceStars, setMarketplaceStars] = useState(0);
  const [marketplaceReviewCount, setMarketplaceReviewCount] = useState(0);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [soldListingsCount, setSoldListingsCount] = useState(0);
  const [monthlyMessages, setMonthlyMessages] = useState(0);
  const [monthlyListings, setMonthlyListings] = useState(0);
  const [monthlyPhotos, setMonthlyPhotos] = useState(0);
  const [monthlyFeedback, setMonthlyFeedback] = useState(0);

  useEffect(() => {
    void loadPage();
  }, [username]);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 920);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [viewFilter]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ? String(user.id) : "");

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
      } else {
        const { data: doorables, error: doorablesError } = await supabase
          .from("doorables")
          .select("id, name, series, rarity, image_url")
          .range(0, 1999);

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

        merged.sort((a, b) => {
          const bySeries = seriesSort(a.series, b.series);
          if (bySeries !== 0) return bySeries;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

        setCards(merged);
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthIso = startOfMonth.toISOString();

      const [
        listingsResult,
        reviewsResult,
        messagesResult,
        submissionsResult,
        feedbackResult,
      ] = await Promise.allSettled([
        supabase
          .from("marketplace_listings")
          .select("id, status, created_at, sold_at")
          .eq("user_id", userRow.id),

        supabase
          .from("collector_reviews")
          .select("rating")
          .eq("reviewed_user_id", userRow.id),

        supabase
          .from("marketplace_messages")
          .select("id, created_at, sender_id")
          .eq("sender_id", userRow.id)
          .gte("created_at", startOfMonthIso),

        supabase
          .from("image_submissions")
          .select("id, created_at, status")
          .eq("submitted_by", userRow.id)
          .gte("created_at", startOfMonthIso),

        supabase
          .from("feedback_posts")
          .select("id, created_at")
          .eq("user_id", userRow.id)
          .gte("created_at", startOfMonthIso),
      ]);

      if (listingsResult.status === "fulfilled" && !listingsResult.value.error) {
        const listings = listingsResult.value.data || [];
        const activeListings = listings.filter((row: any) => String(row.status || "") === "active");
        const soldListings = listings.filter(
          (row: any) => String(row.status || "") === "sold" || !!row.sold_at
        );
        const monthListings = listings.filter((row: any) => {
          const created = row.created_at ? new Date(row.created_at).getTime() : 0;
          return created >= new Date(startOfMonthIso).getTime();
        });

        setActiveListingsCount(activeListings.length);
        setSoldListingsCount(soldListings.length);
        setMonthlyListings(monthListings.length);
      }

      if (reviewsResult.status === "fulfilled" && !reviewsResult.value.error) {
        const ratings = (reviewsResult.value.data || [])
          .map((row: any) => Number(row.rating || 0))
          .filter((n: number) => n > 0);

        const avg = average(ratings);
        setMarketplaceStars(avg);
        setMarketplaceReviewCount(ratings.length);
      }

      if (messagesResult.status === "fulfilled" && !messagesResult.value.error) {
        setMonthlyMessages((messagesResult.value.data || []).length);
      }

      if (submissionsResult.status === "fulfilled" && !submissionsResult.value.error) {
        setMonthlyPhotos((submissionsResult.value.data || []).length);
      }

      if (feedbackResult.status === "fulfilled" && !feedbackResult.value.error) {
        setMonthlyFeedback((feedbackResult.value.data || []).length);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collection.");
      setLoading(false);
    }
  }

  async function startCollectorChat(prefilledBody?: string, loadingKey = "collector") {
    try {
      setError("");
      setStartingChatId(loadingKey);

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const next =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/collector/${username}`;

        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      if (!collectorUserId) {
        setError("Collector account could not be found.");
        setStartingChatId("");
        return;
      }

      if (String(user.id) === collectorUserId) {
        setError("You cannot message yourself, but you can share your public profile 💜");
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

      if (prefilledBody) {
        const { error: messageError } = await supabase
          .from("marketplace_messages")
          .insert([
            {
              conversation_id: conversationId,
              sender_id: user.id,
              body: prefilledBody,
              read_at: null,
            },
          ]);

        if (messageError) {
          setError(messageError.message);
          setStartingChatId("");
          return;
        }
      }

      window.location.href = `/messages?conversation=${conversationId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start message.");
      setStartingChatId("");
    }
  }

  async function messageAboutDoorable(card: PublicCard) {
    let body = `Hi! I saw your collection and wanted to ask about ${card.name}.`;

    if (card.qty > 1) {
      body = `Hi! I saw that you have an extra of ${card.name} in your collection and wanted to ask about it.`;
    } else if (card.qty <= 0) {
      body = `Hi! I saw that ${card.name} is on your wishlist and wanted to message you about it.`;
    }

    await startCollectorChat(body, card.id);
  }

  async function shareProfile() {
    try {
      const url =
        typeof window !== "undefined"
          ? window.location.href
          : `https://www.mydoorables.com/collector/${username}`;

      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s Adorable Vault`,
          text: `Check out ${displayName}'s Adorable Vault collection 💜`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareNotice("Profile link copied! 💜");

      window.setTimeout(() => {
        setShareNotice("");
      }, 2500);
    } catch {
      setShareNotice("Could not copy automatically, but you can copy the link from your browser.");
    }
  }

  const stats = useMemo(() => {
    const extras = cards.filter((c) => c.qty > 1).length;
    const wishlist = cards.filter((c) => c.qty <= 0).length;
    const owned = cards.filter((c) => c.qty > 0).length;
    return { extras, wishlist, owned, total: cards.length };
  }, [cards]);

  const completion = stats.total ? Math.round((stats.owned / stats.total) * 100) : 0;
  const isOwnProfile = !!currentUserId && !!collectorUserId && currentUserId === collectorUserId;

  const collectionTier = useMemo(
    () => getCollectionTier(completion, stats.owned),
    [completion, stats.owned]
  );

  const marketplaceTier = useMemo(
    () =>
      getMarketplaceTier({
        averageRating: marketplaceStars,
        reviewCount: marketplaceReviewCount,
        activeListings: activeListingsCount,
        soldListings: soldListingsCount,
      }),
    [marketplaceStars, marketplaceReviewCount, activeListingsCount, soldListingsCount]
  );

  const communityTier = useMemo(
    () =>
      getCommunityTier({
        monthlyMessages,
        monthlyListings,
        monthlyPhotos,
        monthlyFeedback,
        isPublic: visibility !== "private",
      }),
    [monthlyMessages, monthlyListings, monthlyPhotos, monthlyFeedback, visibility]
  );

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

  const cardsPerPage = isMobile ? 8 : 24;
  const totalPages = Math.max(1, Math.ceil(displayedCards.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedCards = displayedCards.slice(
    (safePage - 1) * cardsPerPage,
    safePage * cardsPerPage
  );

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
      <main className="loadingPage">
        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 22px;
            color: white;
            background:
              radial-gradient(circle at 8% 4%, rgba(168,85,247,0.42) 0%, transparent 28%),
              radial-gradient(circle at 88% 10%, rgba(59,130,246,0.30) 0%, transparent 27%),
              linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          }

          .loadingCard {
            width: min(520px, 100%);
            border-radius: 28px;
            padding: 28px;
            text-align: center;
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          }
        `}</style>

        <div className="loadingCard">
          <div style={{ fontSize: 34, marginBottom: 10 }}>💎</div>
          <div style={{ fontWeight: 1000, fontSize: 22 }}>Loading collector vault...</div>
        </div>
      </main>
    );
  }

  if (error && !cards.length && visibility !== "private") {
    return (
      <main className="simplePage">
        <style jsx>{`
          .simplePage {
            min-height: 100vh;
            padding: 22px;
            color: white;
            background:
              radial-gradient(circle at 8% 4%, rgba(168,85,247,0.42) 0%, transparent 28%),
              radial-gradient(circle at 88% 10%, rgba(59,130,246,0.30) 0%, transparent 27%),
              linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          }

          .card {
            max-width: 900px;
            margin: 0 auto;
            border-radius: 28px;
            padding: 24px;
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          }
        `}</style>

        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 1000, marginBottom: 8 }}>Oops 💜</div>
          <div>{error}</div>
        </div>
      </main>
    );
  }

  if (visibility === "private") {
    return (
      <main className="simplePage">
        <style jsx>{`
          .simplePage {
            min-height: 100vh;
            padding: 22px;
            color: white;
            background:
              radial-gradient(circle at 8% 4%, rgba(168,85,247,0.42) 0%, transparent 28%),
              radial-gradient(circle at 88% 10%, rgba(59,130,246,0.30) 0%, transparent 27%),
              linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          }

          .shell {
            max-width: 1000px;
            margin: 0 auto;
          }

          .hero {
            border-radius: 30px;
            padding: 28px;
            margin-bottom: 18px;
            background:
              radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
              linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 26px 64px rgba(0,0,0,0.36);
          }

          .card {
            background: linear-gradient(180deg, #ffffff, #f8fafc);
            color: #111827;
            border-radius: 26px;
            padding: 24px;
            box-shadow: 0 20px 46px rgba(0,0,0,0.24);
          }
        `}</style>

        <div className="shell">
          <section className="hero">
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 1000 }}>
              @{displayName}'s Collection 💜
            </h1>
            <div style={{ marginTop: 8, opacity: 0.92 }}>
              This collection is private.
            </div>
          </section>

          <section className="card">
            <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>🔒 Private Collection</div>
            <div style={{ color: "#4b5563", lineHeight: 1.6 }}>
              This collector has chosen not to publicly show their Doorables right now.
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
            radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
            radial-gradient(circle at 70% 94%, rgba(236, 72, 153, 0.22) 0%, transparent 30%),
            linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.78) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.65) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.58) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.68;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1380px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 84px;
        }

        .hero {
          border-radius: 34px;
          padding: 28px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroTop {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: center;
        }

        .profileBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(2.25rem, 5.8vw, 4.15rem);
          line-height: 0.96;
          letter-spacing: -1.8px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 10px;
          color: rgba(255,255,255,0.88);
          font-size: 16px;
          line-height: 1.6;
          max-width: 760px;
        }

        .actionPanel {
          min-width: 310px;
          border-radius: 24px;
          padding: 18px;
          background: rgba(15,23,42,0.58);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
        }

        .actionGrid {
          display: grid;
          gap: 10px;
        }

        .bubbleButton,
        .bubbleButton:visited {
          min-height: 48px;
          border-radius: 999px;
          padding: 12px 16px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-sizing: border-box;
          border: 1px solid transparent;
          cursor: pointer;
        }

        .heroButton,
        .heroButton:visited {
          background: rgba(255,255,255,0.12);
          color: white;
          border-color: rgba(255,255,255,0.20);
        }

        .primaryHeroButton {
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          color: #312e81;
          border-color: rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.20);
        }

        .progressBox {
          margin-top: 20px;
          border-radius: 24px;
          padding: 16px;
          background: rgba(15,23,42,0.45);
          border: 1px solid rgba(255,255,255,0.13);
        }

        .progressHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .progressTrack {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#60a5fa,#a78bfa,#ec4899);
          box-shadow: 0 0 18px rgba(236,72,153,0.30);
        }

        .shareNotice {
          margin-top: 10px;
          border-radius: 16px;
          padding: 10px 12px;
          background: rgba(236,253,245,0.14);
          border: 1px solid rgba(187,247,208,0.35);
          color: #bbf7d0;
          font-weight: 900;
          font-size: 13px;
        }

        .tierGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }

        .tierCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 14px 32px rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.45);
          overflow: hidden;
          position: relative;
        }

        .tierAccent {
          position: absolute;
          inset: 0 auto 0 0;
          width: 8px;
          border-radius: 24px 0 0 24px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 32px rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.45);
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(0,0,0,0.22);
        }

        .statCardActive {
          outline: 3px solid #a78bfa;
        }

        .collectionCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 28px;
          padding: 18px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.22);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.50);
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

          .tierGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (min-width: 1300px) {
          .cardsGrid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
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

        .pager {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .pagerButton {
          min-height: 44px;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.24);
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(79,70,229,0.22);
        }

        .pagerButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pagerText {
          color: #111827;
          font-weight: 1000;
        }

        .cardActionButton {
          margin-top: 10px;
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-weight: 900;
          color: white;
          box-shadow: 0 12px 22px rgba(79,70,229,0.20);
        }

        @media (max-width: 920px) {
          .shell {
            padding: 14px;
            padding-bottom: 60px;
          }

          .hero {
            border-radius: 25px;
            padding: 21px;
          }

          .heroTop {
            grid-template-columns: 1fr;
          }

          .actionPanel {
            min-width: 0;
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

          .bubbleButton {
            width: 100%;
          }
        }

        @media (max-width: 460px) {
          .cardsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="heroTop">
            <div>
              <div className="profileBadge">💎 Collector Public Profile</div>
              <h1 className="heroTitle">@{displayName}'s Collection 💜</h1>
              <div className="heroText">
                {visibility === "extras_only"
                  ? "Showing this collector's public wishlist and extras."
                  : "Showing this collector's full public vault."}
              </div>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.70)", fontSize: 14, fontWeight: 800 }}>
                Collector ID • Public Profile
              </div>
            </div>

            <div className="actionPanel">
              <div style={{ color: "#fde68a", fontSize: 13, fontWeight: 1000, marginBottom: 10 }}>
                Profile Actions
              </div>

              <div className="actionGrid">
                <button type="button" onClick={() => void shareProfile()} className="bubbleButton primaryHeroButton">
                  Share Profile 🔗
                </button>

                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => void startCollectorChat(`Hi! I saw your Adorable Vault profile and wanted to connect.`, "collector")}
                    disabled={startingChatId === "collector"}
                    className="bubbleButton heroButton"
                    style={{ opacity: startingChatId === "collector" ? 0.7 : 1 }}
                  >
                    {startingChatId === "collector" ? "Opening..." : "Message Collector 💬"}
                  </button>
                )}

                <Link href="/marketplace" className="bubbleButton heroButton">
                  Browse Marketplace 🛍️
                </Link>

                {isOwnProfile && (
                  <Link href="/collection" className="bubbleButton heroButton">
                    Back to My Collection
                  </Link>
                )}
              </div>

              {shareNotice && <div className="shareNotice">{shareNotice}</div>}
            </div>
          </div>

          <div className="progressBox">
            <div className="progressHeader">
              <div style={{ fontWeight: 1000 }}>Collection Completion</div>
              <div style={{ color: "#fde68a", fontWeight: 1000 }}>{completion}%</div>
            </div>

            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${completion}%` }} />
            </div>

            <div style={{ marginTop: 9, color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 800 }}>
              {stats.owned} owned out of {stats.total} visible items
            </div>
          </div>
        </section>

        <section className="tierGrid">
          {[collectionTier, marketplaceTier, communityTier].map((tier) => (
            <div key={tier.title} className="tierCard">
              <div className="tierAccent" style={{ background: tier.accent }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 900, marginBottom: 6 }}>
                  {tier.title}
                </div>
                <div style={{ fontSize: 24, fontWeight: 1000, marginBottom: 6 }}>
                  {tier.label}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
                  {tier.subtext}
                </div>

                {tier.title === "Marketplace Tier" && (
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900, color: "#7c3aed" }}>
                    {renderStars(marketplaceTier.stars)}{" "}
                    <span style={{ color: "#6b7280", fontWeight: 800 }}>
                      {marketplaceTier.stars > 0
                        ? `${marketplaceTier.stars.toFixed(1)} · ${marketplaceReviewCount} review${marketplaceReviewCount === 1 ? "" : "s"}`
                        : "No ratings yet"}
                    </span>
                  </div>
                )}

                {tier.title === "Community Tier" && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                    This month: {monthlyMessages} chats • {monthlyListings} listings • {monthlyPhotos} photos • {monthlyFeedback} feedback
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        {!!error && (
          <div
            style={{
              marginBottom: 18,
              background: "rgba(255,255,255,0.96)",
              color: "#b91c1c",
              borderRadius: 18,
              padding: 14,
              fontWeight: 800,
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
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6, fontWeight: 800 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 30, fontWeight: 1000 }}>{stat.value}</div>
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
            <div>
              <div style={{ fontSize: 20, fontWeight: 1000 }}>{getFilterTitle()}</div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800, marginTop: 3 }}>
                Tap a card action to connect with this collector.
              </div>
            </div>

            <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 800 }}>
              Showing {pagedCards.length} of {displayedCards.length} item{displayedCards.length === 1 ? "" : "s"}
            </div>
          </div>

          {displayedCards.length === 0 ? (
            <div style={{ color: "#6b7280", padding: 10, fontWeight: 800 }}>
              Nothing to show in this section yet.
            </div>
          ) : (
            <section className="cardsGrid">
              {pagedCards.map((item) => {
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
                        <div style={{ color: "#6b7280", fontWeight: 800 }}>No Image</div>
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 19, lineHeight: 1.1, wordBreak: "break-word" }}>
                          {item.name}
                        </div>
                        <div style={{ opacity: 0.8, fontSize: 14 }}>{item.series}</div>
                      </div>

                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 1000,
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
                        fontWeight: 1000,
                        color: statusColor,
                      }}
                    >
                      {status}
                    </div>

                    <div style={{ fontSize: 14, color: "#4b5563", fontWeight: 800 }}>
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
                          fontWeight: 700,
                        }}
                      >
                        {item.note}
                      </div>
                    ) : null}

                    {!isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => void messageAboutDoorable(item)}
                        disabled={startingChatId === item.id}
                        className="cardActionButton"
                        style={{
                          cursor: startingChatId === item.id ? "wait" : "pointer",
                          background:
                            item.qty > 1
                              ? "linear-gradient(135deg,#2563eb,#60a5fa)"
                              : item.qty <= 0
                                ? "linear-gradient(135deg,#7c3aed,#c084fc)"
                                : "linear-gradient(135deg,#4f46e5,#7c3aed)",
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
                    )}
                  </div>
                );
              })}
            </section>
          )}

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

              <div className="pagerText">
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
        </section>
      </div>
    </main>
  );
}
