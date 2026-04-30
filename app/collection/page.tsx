"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Card = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  subcategory: string;
  movie: string;
  image: string;
  qty: number;
  note: string;
  rowId: string | null;
};

type PublicCollector = {
  id: string;
  username: string;
  collection_visibility: "private" | "extras_only" | "full";
};

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

type AutoSellDraft = {
  cardId: string;
  title: string;
  price: string;
  description: string;
  selected: boolean;
};

const FREE_LIMIT = 50;
const MONTHLY_PRICE_LABEL = "$3/month";
const YEARLY_PRICE_LABEL = "$15/year";

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

function collectionStatus(qty: number) {
  if (qty > 1) return "Extra";
  if (qty > 0) return "Have";
  return "Need";
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
  if (reviewCount > 0) stars = Number(averageRating.toFixed(1));
  else if (soldListings >= 10) stars = 5.0;
  else if (soldListings >= 5) stars = 4.7;
  else if (soldListings >= 2) stars = 4.3;
  else if (activeListings >= 3) stars = 4.0;

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
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

export default function Page() {
  const router = useRouter();

  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [autoSellLoading, setAutoSellLoading] = useState(false);
  const [showAutoSellModal, setShowAutoSellModal] = useState(false);
  const [autoSellDrafts, setAutoSellDrafts] = useState<AutoSellDraft[]>([]);

  const [visibility, setVisibility] = useState<"private" | "extras_only" | "full">("private");
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [publicCollectors, setPublicCollectors] = useState<PublicCollector[]>([]);

  const [uploadingPhotoId, setUploadingPhotoId] = useState("");
  const [photoNote, setPhotoNote] = useState<Record<string, string>>({});
  const [expandedPhotoCardId, setExpandedPhotoCardId] = useState("");

  const [marketplaceStars, setMarketplaceStars] = useState(0);
  const [marketplaceReviewCount, setMarketplaceReviewCount] = useState(0);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [soldListingsCount, setSoldListingsCount] = useState(0);
  const [monthlyMessages, setMonthlyMessages] = useState(0);
  const [monthlyListings, setMonthlyListings] = useState(0);
  const [monthlyPhotos, setMonthlyPhotos] = useState(0);
  const [monthlyFeedback, setMonthlyFeedback] = useState(0);

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [movieFilter, setMovieFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 920);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter, isMobile]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(String(user.id));

      const { data: profile } = await supabase
        .from("users")
        .select("is_subscribed, collection_visibility, username")
        .eq("id", user.id)
        .maybeSingle();

      setIsSubscribed(!!profile?.is_subscribed);
      setUsername(String(profile?.username ?? ""));

      if (
        profile?.collection_visibility === "private" ||
        profile?.collection_visibility === "extras_only" ||
        profile?.collection_visibility === "full"
      ) {
        setVisibility(profile.collection_visibility);
      }

      const { data: spotlightUsers } = await supabase
        .from("users")
        .select("id, username, collection_visibility")
        .neq("collection_visibility", "private")
        .not("username", "is", null)
        .order("username", { ascending: true })
        .limit(24);

      setPublicCollectors(
        ((spotlightUsers || []) as any[])
          .filter((row) => String(row.username ?? "").trim() !== "")
          .map((row) => ({
            id: String(row.id),
            username: String(row.username),
            collection_visibility: row.collection_visibility,
          }))
      );

      const { data: doorables, error: doorablesError } = await supabase
        .from("doorables")
        .select("id, name, series, rarity, subcategory, movie, image_url")
        .range(0, 1999);

      if (doorablesError) {
        setError(doorablesError.message);
        setLoading(false);
        return;
      }

      const { data: userDoorables, error: userDoorablesError } = await supabase
        .from("user_doorables")
        .select("id, doorable_id, qty_owned, custom_tag")
        .eq("user_id", user.id);

      if (userDoorablesError) {
        setError(userDoorablesError.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, any>();
      (userDoorables || []).forEach((row: any) => {
        userMap.set(String(row.doorable_id), row);
      });

      const merged: Card[] = (doorables || [])
        .map((d: any) => {
          const row = userMap.get(String(d.id));

          return {
            id: String(d.id ?? ""),
            name: String(d.name ?? "Unknown"),
            series: String(d.series ?? "Unknown Series"),
            rarity: String(d.rarity ?? "Common"),
            subcategory: String(d.subcategory ?? ""),
            movie: String(d.movie ?? ""),
            image: String(d.image_url ?? ""),
            qty: Number(row?.qty_owned ?? 0),
            note: String(row?.custom_tag ?? ""),
            rowId: row?.id ? String(row.id) : null,
          };
        })
        .sort((a, b) => {
          const bySeries = seriesSort(a.series, b.series);
          if (bySeries !== 0) return bySeries;

          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        });

      setCards(merged);

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
          .eq("user_id", user.id),

        supabase
          .from("collector_reviews")
          .select("rating")
          .eq("reviewed_user_id", user.id),

        supabase
          .from("marketplace_messages")
          .select("id, created_at, sender_id")
          .eq("sender_id", user.id)
          .gte("created_at", startOfMonthIso),

        supabase
          .from("image_submissions")
          .select("id, created_at, status")
          .eq("submitted_by", user.id)
          .gte("created_at", startOfMonthIso),

        supabase
          .from("feedback_posts")
          .select("id, created_at")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonthIso),
      ]);

      if (listingsResult.status === "fulfilled" && !listingsResult.value.error) {
        const listings = listingsResult.value.data || [];

        const activeListings = listings.filter(
          (row: any) => String(row.status || "") === "active"
        );

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
      setError(
        err instanceof Error
          ? err.message
          : "Collection page crashed while loading."
      );
      setLoading(false);
    }
  }

  async function sharePublicProfile() {
    if (!username) {
      setShareStatus("Add a username before sharing your public profile.");
      return;
    }

    const profileUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/collector/${username}`
        : `https://www.mydoorables.com/collector/${username}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "My Adorable Vault collection",
          text: "Check out my Adorable Vault collection 💜",
          url: profileUrl,
        });
        setShareStatus("Profile shared! 💜");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        setShareStatus("Public profile link copied! 💜");
      } else {
        setShareStatus(`Copy this link: ${profileUrl}`);
      }

      window.setTimeout(() => {
        setShareStatus("");
      }, 3000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareStatus("Could not share automatically. Try copying the public link.");
    }
  }

  async function saveVisibility(next: "private" | "extras_only" | "full") {
    try {
      setSavingVisibility(true);
      setError("");

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ collection_visibility: next })
        .eq("id", user.id);

      if (error) {
        setError("Could not save visibility: " + error.message);
        setSavingVisibility(false);
        return;
      }

      setVisibility(next);
      setSavingVisibility(false);
    } catch (err) {
      setSavingVisibility(false);
      setError(err instanceof Error ? err.message : "Could not save visibility.");
    }
  }

  async function saveCard(card: Card, nextQty: number, nextNote: string) {
    try {
      const supabase = getSupabase();
      const qty = Math.max(0, Number(nextQty ?? card.qty ?? 0));
      const note = String(nextNote ?? card.note ?? "");
      const ownedCount = cards.filter((c) => c.qty > 0).length;
      const isAddingNewOwned = card.qty <= 0 && qty > 0;

      if (!isSubscribed && isAddingNewOwned && ownedCount >= FREE_LIMIT) {
        setError(`Free accounts can save up to ${FREE_LIMIT} Doorables. Upgrade for unlimited tracking, marketplace tools, selling extras, and full collector access 💜`);
        setShowUpgradeModal(true);
        document.getElementById("upgrade-wall")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      setSavingId(card.id);
      setError("");
      setNotice("");

      const payload = {
        user_id: userId,
        doorable_id: card.id,
        qty_owned: qty,
        wanted: qty <= 0,
        custom_tag: note,
      };

      if (card.rowId) {
        const { error } = await supabase
          .from("user_doorables")
          .update(payload)
          .eq("id", card.rowId);

        if (error) {
          alert("Save failed: " + error.message);
          setSavingId("");
          return;
        }

        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  qty,
                  note,
                }
              : c
          )
        );
      } else {
        const { data, error } = await supabase
          .from("user_doorables")
          .insert([payload])
          .select()
          .single();

        if (error) {
          alert("Save failed: " + error.message);
          setSavingId("");
          return;
        }

        const newRowId = data?.id ? String(data.id) : null;

        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  qty,
                  note,
                  rowId: newRowId,
                }
              : c
          )
        );
      }

      setNotice(qty > 0 ? "Saved to your collection 💜" : "Removed from owned collection.");
      setSavingId("");
    } catch (err) {
      setSavingId("");
      alert("Save failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  function openAutoSellModal() {
    setError("");
    setNotice("");

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      document.getElementById("upgrade-wall")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const extras = cards.filter((card) => Number(card.qty || 0) > 1);

    if (!extras.length) {
      setNotice("No extras to auto-list yet 💜");
      return;
    }

    const drafts = extras.map((item) => {
      const extraQty = Math.max(1, Number(item.qty || 0) - 1);
      const details = [
        item.series ? `Series: ${item.series}` : "",
        item.rarity ? `Rarity: ${item.rarity}` : "",
        item.movie ? `Movie: ${item.movie}` : "",
        item.subcategory ? `Category: ${item.subcategory}` : "",
        `Extra quantity available: ${extraQty}`,
        item.note ? `Collector note: ${item.note}` : "",
      ].filter(Boolean);

      return {
        cardId: item.id,
        title: item.name,
        price: "",
        description: `Auto-listed from collection extras. ${details.join(" • ")}`,
        selected: true,
      };
    });

    setAutoSellDrafts(drafts);
    setShowAutoSellModal(true);
  }

  function updateAutoSellDraft(cardId: string, patch: Partial<AutoSellDraft>) {
    setAutoSellDrafts((prev) =>
      prev.map((draft) =>
        draft.cardId === cardId
          ? {
              ...draft,
              ...patch,
            }
          : draft
      )
    );
  }

  async function handleAutoSellExtras() {
    try {
      setError("");
      setNotice("");
      setAutoSellLoading(true);

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!isSubscribed) {
        setShowUpgradeModal(true);
        document.getElementById("upgrade-wall")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }

      const selectedDrafts = autoSellDrafts.filter((draft) => draft.selected);

      if (!selectedDrafts.length) {
        setError("Choose at least one extra to list.");
        return;
      }

      const invalidPrice = selectedDrafts.find((draft) => {
        const cleanPrice = draft.price.trim();
        return cleanPrice !== "" && Number.isNaN(Number(cleanPrice));
      });

      if (invalidPrice) {
        setError(`Price for "${invalidPrice.title}" needs to be a valid number or blank.`);
        return;
      }

      const { data: existingListings, error: existingError } = await supabase
        .from("marketplace_listings")
        .select("id, title, status, user_id")
        .eq("user_id", user.id)
        .in("status", ["active", "pending"]);

      if (existingError) {
        setError("Could not check existing listings: " + existingError.message);
        return;
      }

      const existingKeys = new Set(
        (existingListings || []).map((row: any) =>
          String(row.title || "").trim().toLowerCase()
        )
      );

      const cardMap = new Map(cards.map((card) => [card.id, card]));

      const listingsToCreate = selectedDrafts
        .filter((draft) => !existingKeys.has(String(draft.title || "").trim().toLowerCase()))
        .map((draft) => {
          const item = cardMap.get(draft.cardId);
          const numericPrice = draft.price.trim() === "" ? null : Number(draft.price.trim());

          return {
            title: draft.title.trim() || item?.name || "Doorable Extra",
            description: draft.description.trim() || null,
            price: numericPrice,
            image_url: item?.image || null,
            seller_name: username || user.email || "Collector",
            user_id: user.id,
            status: "active",
            sold_at: null,
            shipping_available: false,
            shipping_price: null,
            local_pickup_available: false,
            pickup_location: null,
          };
        });

      if (!listingsToCreate.length) {
        setNotice("Those extras already have active or pending listings 💜");
        setShowAutoSellModal(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("marketplace_listings")
        .insert(listingsToCreate);

      if (insertError) {
        setError("Could not auto-list extras: " + insertError.message);
        return;
      }

      setNotice(`Auto-listed ${listingsToCreate.length} extra${listingsToCreate.length === 1 ? "" : "s"} in Marketplace 💜`);
      setShowAutoSellModal(false);
      setAutoSellDrafts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not auto-list extras.");
    } finally {
      setAutoSellLoading(false);
    }
  }

  async function handlePhotoSubmission(card: Card, file: File | null) {
    if (!file) return;

    try {
      setError("");
      setNotice("");
      setUploadingPhotoId(card.id);

      const supabase = getSupabase();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const rawExt = file.name.split(".").pop() || "jpg";
      const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `doorables/${card.id}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const basePayload = {
        doorable_id: card.id,
        image_url: publicUrl,
        status: "pending",
      };

      // Your project has used both submitted_by and user_id at different points.
      // This tries the newer submitted_by column first, then falls back to user_id
      // so the collection page can save even if the database/table is on the older setup.
      const { error: submittedByError } = await supabase
        .from("image_submissions")
        .insert([{ ...basePayload, submitted_by: user.id }]);

      if (submittedByError) {
        const { error: userIdError } = await supabase
          .from("image_submissions")
          .insert([{ ...basePayload, user_id: user.id }]);

        if (userIdError) {
          setError(
            "Photo uploaded, but it could not be added to the review queue. submitted_by error: " +
              submittedByError.message +
              " | user_id error: " +
              userIdError.message
          );
          return;
        }
      }

      setError("");
      setNotice("Photo submitted for review 💜");
      setPhotoNote((prev) => ({ ...prev, [card.id]: "" }));
      setExpandedPhotoCardId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingPhotoId("");
    }
  }

  const seriesOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.series).filter(Boolean))).sort(seriesSort)],
    [cards]
  );

  const subcategoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.subcategory).filter(Boolean))).sort()],
    [cards]
  );

  const rarityOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.rarity).filter(Boolean))).sort()],
    [cards]
  );

  const movieOptions = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.movie).filter(Boolean))).sort()],
    [cards]
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const detailText = [card.subcategory, card.movie].filter(Boolean).join(" ");

      const matchesSearch =
        !q ||
        [card.name, card.series, card.rarity, detailText, card.note]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesSeries = seriesFilter === "all" || card.series === seriesFilter;
      const matchesSubcategory = subcategoryFilter === "all" || card.subcategory === subcategoryFilter;
      const matchesRarity = rarityFilter === "all" || card.rarity === rarityFilter;
      const matchesMovie = movieFilter === "all" || card.movie === movieFilter;
      const matchesCollection =
        collectionFilter === "all"
          ? true
          : collectionFilter === "have"
            ? card.qty > 0
            : collectionFilter === "need"
              ? card.qty <= 0
              : card.qty > 1;

      return (
        matchesSearch &&
        matchesSeries &&
        matchesSubcategory &&
        matchesRarity &&
        matchesMovie &&
        matchesCollection
      );
    });
  }, [cards, search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter]);

  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;
  const extrasCount = cards.reduce((sum, card) => sum + Math.max(0, Number(card.qty || 0) - 1), 0);
  const freeSlotsLeft = Math.max(0, FREE_LIMIT - ownedCount);
  const freeLimitReached = !isSubscribed && ownedCount >= FREE_LIMIT;

  const collectionTier = useMemo(
    () => getCollectionTier(completion, ownedCount),
    [completion, ownedCount]
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

  const seriesProgress = useMemo(() => {
    const grouped = new Map<
      string,
      { total: number; owned: number; subcategories: string[] }
    >();

    cards.forEach((card) => {
      const key = card.series || "Unknown Series";
      const current = grouped.get(key) || { total: 0, owned: 0, subcategories: [] };

      current.total += 1;
      if (card.qty > 0) current.owned += 1;

      if (card.subcategory && !current.subcategories.includes(card.subcategory)) {
        current.subcategories.push(card.subcategory);
      }

      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([series, value]) => ({
        series,
        total: value.total,
        owned: value.owned,
        percent: value.total ? Math.round((value.owned / value.total) * 100) : 0,
        subcategoryLabel: value.subcategories.join(", "),
      }))
      .sort((a, b) => seriesSort(a.series, b.series));
  }, [cards]);

  const visibleSeriesProgress =
    isMobile && !expandedSeries ? seriesProgress.slice(0, 6) : seriesProgress;

  function jumpToSeries(seriesName: string) {
    setSeriesFilter(seriesName);
    setShowMobileFilters(false);
    requestAnimationFrame(() => {
      document.getElementById("cards-grid")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function getVisibilityLabel() {
    if (visibility === "private") return "Private";
    if (visibility === "extras_only") return "Wishlist + Extras";
    return "Full Collection";
  }

  function clearFilters() {
    setSearch("");
    setSeriesFilter("all");
    setSubcategoryFilter("all");
    setRarityFilter("all");
    setMovieFilter("all");
    setCollectionFilter("all");
  }

  const activeFilterCount =
    (seriesFilter !== "all" ? 1 : 0) +
    (subcategoryFilter !== "all" ? 1 : 0) +
    (rarityFilter !== "all" ? 1 : 0) +
    (movieFilter !== "all" ? 1 : 0) +
    (collectionFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const cardsPerPage = isMobile ? 8 : 24;
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedCards = filteredCards.slice(
    (safePage - 1) * cardsPerPage,
    safePage * cardsPerPage
  );

  if (loading) {
    return (
      <div className="loadingPage">
        <div className="loadingCard">
          <div className="loadingIcon">💜</div>
          <h1>Loading your vault...</h1>
          <p>Pulling your Doorables collection together.</p>
        </div>
      </div>
    );
  }

  if (error && !cards.length) {
    return (
      <div className="loadingPage">
        <div className="loadingCard">
          <h1>Collection Error</h1>
          <p>{error}</p>
          <Link href="/login" className="eliteUpgradeButton">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="collectionPage">
      <style jsx>{`
        .collectionPage {
          min-height: 100vh;
          padding: 24px;
          color: white;
          background:
            radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
            radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
            radial-gradient(circle at 70% 70%, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0) 20%),
            linear-gradient(180deg, #09090f 0%, #111827 38%, #0f172a 65%, #020617 100%);
        }

        .loadingPage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          color: white;
          background: radial-gradient(circle at top, #312e81 0%, #0f172a 45%, #020617 100%);
        }

        .loadingCard {
          width: min(520px, 100%);
          border-radius: 28px;
          padding: 28px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          text-align: center;
        }

        .loadingIcon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 22px;
          background: linear-gradient(135deg, #a855f7, #60a5fa);
          font-size: 30px;
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .floatCard {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .floatCard:hover {
          transform: translateY(-4px);
        }

        .galaxyStars {
          position: relative;
          max-width: 1500px;
          margin: 0 auto;
          z-index: 1;
        }

        .galaxyStars::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.95) 40%, transparent 41%),
            radial-gradient(1.5px 1.5px at 25% 80%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.8px 1.8px at 40% 15%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(2px 2px at 55% 70%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.6px 1.6px at 72% 35%, rgba(255,255,255,0.95) 40%, transparent 41%),
            radial-gradient(2px 2px at 85% 60%, rgba(255,255,255,0.9) 40%, transparent 41%),
            radial-gradient(1.5px 1.5px at 92% 25%, rgba(255,255,255,0.85) 40%, transparent 41%);
          opacity: 0.6;
          z-index: 0;
        }

        .heroSection {
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 30%),
            linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(6px);
        }

        .heroTop {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          align-items: center;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.1rem);
          font-weight: 1000;
          letter-spacing: -1px;
          line-height: 1;
        }

        .heroSubtitle {
          margin-top: 8px;
          opacity: 0.92;
          font-size: 16px;
          font-weight: 750;
        }

        .heroProgress {
          min-width: 250px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 22px;
          padding: 16px;
          width: auto;
          max-width: 320px;
        }

        .tierGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }

        .tierCard {
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.35);
          overflow: hidden;
          position: relative;
        }

        .tierAccent {
          position: absolute;
          inset: 0 auto 0 0;
          width: 8px;
          border-radius: 22px 0 0 22px;
        }


        .autoSellCard {
          background:
            radial-gradient(circle at top right, rgba(192,132,252,0.28), transparent 32%),
            linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.18);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.55);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .autoSellEyebrow {
          color: #6d28d9;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .autoSellTitle {
          font-size: clamp(1.25rem, 3vw, 1.8rem);
          font-weight: 1000;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .autoSellText {
          color: #4b5563;
          line-height: 1.55;
          font-size: 14px;
          max-width: 760px;
        }

        .autoSellButton {
          min-height: 50px;
          border: none;
          border-radius: 16px;
          padding: 13px 18px;
          font-weight: 1000;
          color: white;
          background: linear-gradient(135deg, #16a34a, #4f46e5);
          box-shadow: 0 14px 26px rgba(79,70,229,0.22);
          cursor: pointer;
          white-space: nowrap;
        }

        .autoSellButton:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .statsSection {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }

        .statButton {
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

        .statButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .panelCard {
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.35);
        }

        .filterPanel {
          position: sticky;
          top: 8px;
          z-index: 55;
        }

        .filterHeader {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .filterToggleButton {
          display: none;
          border: none;
          border-radius: 14px;
          padding: 13px 14px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff;
          font-weight: 950;
          min-height: 50px;
          cursor: pointer;
        }

        .filterBody {
          margin-top: 12px;
        }

        .filterWrap {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .collectionToggleWrap {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 6px;
          border-radius: 14px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          flex-wrap: wrap;
          width: auto;
          justify-content: flex-start;
        }

        .quickMobileChips {
          display: none;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .quickMobileChips::-webkit-scrollbar {
          display: none;
        }

        .quickChip {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid #c7d2fe;
          padding: 9px 13px;
          font-weight: 900;
          background: #eef2ff;
          color: #3730a3;
          white-space: nowrap;
          cursor: pointer;
        }

        .quickChip.active {
          background: #4f46e5;
          color: #ffffff;
        }

        .clearFiltersButton {
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          background: #f1f5f9;
          color: #334155;
          font-weight: 900;
          min-height: 42px;
          cursor: pointer;
        }

        .cardImageWrap {
          height: 180px;
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
          transform: scale(1.05);
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
          border-radius: 12px;
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

        .upgradeBox {
          margin-top: 12px;
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 18px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
        }

        .publicProfileRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .publicProfileButton,
        .publicProfileButton:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: white;
          font-weight: 800;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 18px rgba(79,70,229,0.28);
          min-height: 46px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-family: inherit;
        }

        .publicProfileButton.secondary {
          background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
        }

        .publicProfileActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .publicProfileMeta {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        .copyStatus {
          margin-top: 8px;
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #bbf7d0;
          font-size: 12px;
          font-weight: 900;
        }

        .spotlightGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .spotlightCard {
          display: block;
          text-decoration: none;
          background: #ffffff;
          color: #111827;
          border-radius: 18px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 18px rgba(0,0,0,0.10);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .spotlightCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.14);
        }

        .qtyControls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
        }

        .qtyButton {
          width: 46px;
          height: 46px;
          min-width: 46px;
          border-radius: 14px;
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .qtyValue {
          min-width: 44px;
          text-align: center;
          font-weight: 900;
          font-size: 22px;
        }

        .photoBox {
          margin-top: 10px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(255,255,255,0.6);
        }

        .photoToggleButton {
          width: 100%;
          margin-top: 10px;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.68);
          color: #111827;
          font-weight: 900;
          cursor: pointer;
        }

        .mobileSelect {
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          font-size: 15px;
          background: white;
          width: auto;
          min-width: 180px;
        }

        .searchBox {
          flex: 1 1 280px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          font-size: 15px;
          min-height: 52px;
          height: 52px;
          max-height: 52px;
          background: white;
          box-sizing: border-box;
          width: auto;
          min-width: 280px;
        }

        .seriesProgressGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .seriesProgressButton {
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          padding: 14px;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
        }

        .showMoreButton {
          margin-top: 12px;
          width: 100%;
          min-height: 44px;
          border: none;
          border-radius: 14px;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 950;
          cursor: pointer;
        }

        .eliteStatusStack {
          position: sticky;
          top: 8px;
          z-index: 60;
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .eliteNotice,
        .eliteError {
          border-radius: 18px;
          padding: 12px 14px;
          font-weight: 900;
          box-shadow: 0 12px 26px rgba(0,0,0,0.20);
        }

        .eliteNotice {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #bbf7d0;
        }

        .eliteError {
          background: #fff1f2;
          color: #9f1239;
          border: 1px solid #fecdd3;
        }

        .eliteUpgradeWall {
          margin-bottom: 18px;
          border-radius: 26px;
          padding: 20px;
          color: #111827;
          background: radial-gradient(circle at top right, rgba(196,181,253,0.42), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 38px rgba(0,0,0,0.20);
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
        }

        .eliteUpgradeEyebrow {
          color: #6d28d9;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .eliteUpgradeTitle {
          font-size: clamp(1.35rem, 3vw, 2rem);
          font-weight: 1000;
          letter-spacing: -0.6px;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .eliteUpgradeText {
          color: #4b5563;
          line-height: 1.6;
          font-size: 15px;
          max-width: 760px;
        }

        .elitePlanRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .eliteMiniPlan {
          border-radius: 17px;
          padding: 11px 13px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          min-width: 130px;
        }

        .eliteMiniPlan.best {
          background: linear-gradient(135deg, #f5f3ff, #eff6ff);
          border-color: #a78bfa;
          box-shadow: 0 10px 20px rgba(124,58,237,0.10);
        }

        .eliteMiniPlan span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .eliteMiniPlan strong {
          color: #312e81;
          font-size: 20px;
          font-weight: 1000;
        }

        .eliteUpgradeButton,
        .eliteModalButton {
          min-height: 50px;
          border-radius: 17px;
          padding: 13px 18px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 14px 26px rgba(79,70,229,0.26);
        }


        .autoSellModalList {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          max-height: 58vh;
          overflow: auto;
          padding-right: 4px;
        }

        .autoSellItem {
          display: grid;
          grid-template-columns: auto 92px 1fr;
          gap: 12px;
          align-items: start;
          text-align: left;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 12px;
          box-shadow: 0 8px 18px rgba(0,0,0,0.06);
        }

        .autoSellThumb {
          width: 76px;
          height: 76px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .autoSellThumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .autoSellFields {
          display: grid;
          gap: 8px;
        }

        .autoSellInput,
        .autoSellTextarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 11px 12px;
          color: #111827;
          background: white;
          font-size: 14px;
          font-family: inherit;
        }

        .autoSellTextarea {
          min-height: 70px;
          resize: vertical;
        }

        .autoSellModalActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 14px;
        }

        .autoSellCancelButton {
          min-height: 50px;
          border-radius: 17px;
          padding: 13px 18px;
          font-weight: 1000;
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
        }


        .eliteModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(2,6,23,0.72);
          backdrop-filter: blur(10px);
        }

        .eliteModal {
          position: relative;
          width: min(540px, 100%);
          border-radius: 30px;
          padding: 24px;
          color: #111827;
          background: radial-gradient(circle at top right, rgba(196,181,253,0.55), transparent 32%), linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(255,255,255,0.75);
          box-shadow: 0 28px 80px rgba(0,0,0,0.42);
          text-align: center;
        }

        .eliteModalClose {
          position: absolute;
          right: 14px;
          top: 12px;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: none;
          background: #eef2ff;
          color: #312e81;
          font-size: 25px;
          font-weight: 900;
          cursor: pointer;
        }

        .eliteModalIcon {
          width: 64px;
          height: 64px;
          margin: 0 auto 12px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          font-size: 31px;
          background: linear-gradient(135deg, #ddd6fe, #bfdbfe);
        }

        .eliteModalTitle {
          margin: 0;
          font-size: clamp(1.8rem, 6vw, 2.6rem);
          line-height: 1;
          letter-spacing: -1px;
          font-weight: 1000;
          color: #111827;
        }

        .eliteModalText {
          margin: 13px auto 0;
          max-width: 430px;
          color: #4b5563;
          line-height: 1.6;
          font-weight: 750;
        }

        .eliteModalPlans {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 18px;
        }

        .eliteModalPlan {
          border-radius: 20px;
          padding: 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
        }

        .eliteModalPlan.best {
          border-color: #a78bfa;
          background: linear-gradient(135deg, #f5f3ff, #eff6ff);
        }

        .eliteBestValueTag {
          display: inline-flex;
          margin-bottom: 8px;
          padding: 5px 9px;
          border-radius: 999px;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          font-size: 11px;
          font-weight: 1000;
        }

        .elitePlanName {
          font-weight: 1000;
          color: #334155;
        }

        .elitePlanPrice {
          margin-top: 5px;
          font-size: 31px;
          line-height: 1;
          font-weight: 1000;
          color: #312e81;
        }

        .elitePlanSub {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
          font-weight: 800;
        }

        .eliteModalButton {
          margin-top: 18px;
          width: 100%;
        }

        .eliteModalLater {
          margin-top: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 900;
          cursor: pointer;
        }

        .eliteMobileSticky {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 80;
          display: none;
          grid-template-columns: 1fr auto;
          gap: 11px;
          align-items: center;
          padding: 11px;
          border-radius: 22px;
          background: rgba(15,23,42,0.88);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(14px);
          box-shadow: 0 18px 40px rgba(0,0,0,0.36);
        }

        .eliteMobileTop {
          color: white;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 7px;
        }

        .eliteMobileTrack {
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.16);
          overflow: hidden;
        }

        .eliteMobileFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #c084fc);
        }

        .eliteMobileButton {
          min-height: 44px;
          border-radius: 15px;
          padding: 10px 14px;
          text-decoration: none;
          color: #312e81;
          background: white;
          font-weight: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 641px) {
          .statsSection {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .tierGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .spotlightGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 921px) {
          .cardsGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }

          .spotlightGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (min-width: 1200px) {
          .cardsGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (min-width: 1500px) {
          .cardsGrid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }

        @media (max-width: 920px) {
          .collectionPage {
            padding: 12px;
            padding-bottom: 98px;
          }

          .heroSection {
            border-radius: 24px;
            padding: 18px;
            margin-bottom: 14px;
          }

          .heroTop {
            display: grid;
          }

          .heroTitle {
            font-size: clamp(2rem, 11vw, 2.8rem);
          }

          .heroSubtitle {
            font-size: 14px;
            line-height: 1.45;
          }

          .heroProgress {
            width: 100%;
            max-width: none;
            min-width: 0;
            box-sizing: border-box;
          }

          .eliteUpgradeWall {
            display: grid;
            padding: 16px;
            border-radius: 22px;
          }

          .eliteUpgradeButton {
            width: 100%;
          }

          .eliteMobileSticky {
            display: grid;
          }

          .eliteModalPlans {
            grid-template-columns: 1fr;
          }

          .tierGrid {
            gap: 10px;
            margin-bottom: 14px;
          }

          .tierCard {
            border-radius: 19px;
            padding: 14px;
          }

          .statsSection {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }

          .statButton {
            padding: 14px;
            border-radius: 18px;
          }

          .panelCard {
            border-radius: 20px;
            padding: 14px;
            margin-bottom: 14px;
          }

          .filterPanel {
            top: 6px;
          }

          .filterToggleButton {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .quickMobileChips {
            display: flex;
            margin-top: 12px;
          }

          .filterBody {
            display: none;
          }

          .filterBody.open {
            display: block;
          }

          .filterWrap {
            flex-direction: column;
            align-items: stretch;
          }

          .collectionToggleWrap {
            width: 100%;
            box-sizing: border-box;
          }

          .collectionToggleWrap button {
            flex: 1 1 calc(50% - 8px);
          }

          .searchBox,
          .mobileSelect {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }


          .autoSellCard {
            display: grid;
            border-radius: 20px;
            padding: 15px;
            margin-bottom: 14px;
          }

          .autoSellButton {
            width: 100%;
          }

          .publicProfileRow {
            display: grid;
          }

          .publicProfileActions {
            display: grid;
            width: 100%;
          }

          .publicProfileButton {
            width: 100%;
            box-sizing: border-box;
          }

          .spotlightGrid {
            grid-template-columns: 1fr;
          }

          .seriesProgressGrid {
            grid-template-columns: 1fr;
          }

          .seriesProgressButton {
            border-radius: 15px;
            padding: 12px;
          }

          .cardsGrid {
            gap: 12px;
          }

          .floatCard {
            border-radius: 20px !important;
            padding: 11px !important;
          }

          .cardImageWrap {
            height: 150px;
            border-radius: 16px;
            padding: 10px;
          }

          .qtyButton {
            width: 50px;
            height: 50px;
            min-width: 50px;
          }

          .qtyValue {
            font-size: 24px;
          }

          .pager {
            margin-bottom: 14px;
          }
        }


          .autoSellItem {
            grid-template-columns: 1fr;
          }

          .autoSellThumb {
            width: 100%;
            height: 150px;
          }

          .autoSellModalActions {
            grid-template-columns: 1fr;
          }


        @media (max-width: 420px) {
          .statsSection {
            grid-template-columns: 1fr;
          }

          .eliteMobileSticky {
            grid-template-columns: 1fr;
          }

          .eliteMobileButton {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="galaxyStars">
        <div className="eliteStatusStack">
          {notice && <div className="eliteNotice">{notice}</div>}
          {error && <div className="eliteError">{error}</div>}
        </div>

        <section className="heroSection">
          <div className="heroTop">
            <div>
              <h1 className="heroTitle">My Collection 💜</h1>
              <div className="heroSubtitle">
                Track what you own, what you need, and what you can trade.
              </div>
            </div>

            <div className="heroProgress">
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

          {!isSubscribed && (
            <div className="upgradeBox">
              <div style={{ fontWeight: 900, marginBottom: 4 }}>
                Free plan: up to 50 saved Doorables
              </div>
              <div style={{ fontSize: 14, color: "#4b5563" }}>
                You are using {ownedCount}/50 saved Doorables. Upgrade to unlock unlimited collection, marketplace, and selling.
              </div>
              <div style={{ marginTop: 10 }}>
                <Link
                  href="/pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "#4f46e5",
                    color: "white",
                    textDecoration: "none",
                    fontWeight: 800,
                    minHeight: 44,
                  }}
                >
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </section>

        <section id="upgrade-wall" className="eliteUpgradeWall">
          <div>
            <div className="eliteUpgradeEyebrow">
              {isSubscribed ? "👑 Full Access Active" : freeLimitReached ? "💜 Free Vault Full" : "✨ Free Collector Plan"}
            </div>
            <div className="eliteUpgradeTitle">
              {isSubscribed ? "Unlimited collector tracking unlocked" : freeLimitReached ? "You reached 50 saved Doorables" : `Save ${freeSlotsLeft} more Doorables for free`}
            </div>
            <div className="eliteUpgradeText">
              {isSubscribed
                ? "You have unlimited collection tracking, marketplace access, selling tools, photo submissions, public collector features, and full vault access."
                : freeLimitReached
                  ? "Upgrade to keep adding Doorables, organize unlimited extras, use marketplace tools, and unlock full collector access."
                  : `You are using ${ownedCount}/${FREE_LIMIT} free saved Doorables. Upgrade anytime for unlimited tracking.`}
            </div>
            {!isSubscribed && (
              <div className="elitePlanRow">
                <div className="eliteMiniPlan">
                  <span>Monthly</span>
                  <strong>{MONTHLY_PRICE_LABEL}</strong>
                </div>
                <div className="eliteMiniPlan best">
                  <span>Best Value</span>
                  <strong>{YEARLY_PRICE_LABEL}</strong>
                </div>
              </div>
            )}
          </div>
          {!isSubscribed && (
            <Link href="/pricing" className="eliteUpgradeButton">
              Upgrade for Full Access
            </Link>
          )}
        </section>

        <section className="tierGrid">
          {[collectionTier, marketplaceTier, communityTier].map((tier) => (
            <div key={tier.title} className="tierCard">
              <div className="tierAccent" style={{ background: tier.accent }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 800, marginBottom: 6 }}>
                  {tier.title}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>
                  {tier.label}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
                  {tier.subtext}
                </div>

                {tier.title === "Marketplace Tier" && (
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>
                    {renderStars(marketplaceTier.stars)}{" "}
                    <span style={{ color: "#6b7280", fontWeight: 700 }}>
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

        {username && (
          <section className="panelCard">
            <div className="publicProfileRow">
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Public Collector Page</div>
                <div className="publicProfileMeta">
                  Your current visibility: <strong>{getVisibilityLabel()}</strong>
                  <br />
                  Public link:{" "}
                  <Link
                    href={`/collector/${username}`}
                    style={{
                      color: "#4f46e5",
                      fontWeight: 900,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    /collector/{username}
                  </Link>
                </div>

                {shareStatus && <div className="copyStatus">{shareStatus}</div>}
              </div>

              <div className="publicProfileActions">
                <Link href={`/collector/${username}`} className="publicProfileButton">
                  View Public Profile
                </Link>

                <button
                  type="button"
                  onClick={() => void sharePublicProfile()}
                  className="publicProfileButton secondary"
                >
                  Share Profile 🔗
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="panelCard">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Collection Visibility</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { value: "private", label: "Private 🔒" },
              { value: "extras_only", label: "Wishlist + Extras 💜" },
              { value: "full", label: "Full Collection 🌟" },
            ].map((option) => {
              const active = visibility === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => void saveVisibility(option.value as "private" | "extras_only" | "full")}
                  disabled={savingVisibility}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "none",
                    cursor: savingVisibility ? "wait" : "pointer",
                    fontWeight: 800,
                    background: active ? "#4f46e5" : "#eef2ff",
                    color: active ? "white" : "#3730a3",
                    opacity: savingVisibility ? 0.7 : 1,
                    minHeight: 44,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
            Control what other collectors can see on your public profile.
          </div>
        </section>

        {publicCollectors.length > 0 && (
          <section className="panelCard">
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
              Public Collectors Spotlight ✨
            </div>

            <div className="spotlightGrid">
              {publicCollectors.map((collector) => (
                <Link
                  key={collector.id}
                  href={`/collector/${collector.username}`}
                  className="spotlightCard"
                >
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                    @{collector.username}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {collector.collection_visibility === "full"
                      ? "Full collection open"
                      : "Wishlist + extras open"}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="autoSellCard">
          <div>
            <div className="autoSellEyebrow">Marketplace Shortcut</div>
            <div className="autoSellTitle">Auto-list your extras 💸</div>
            <div className="autoSellText">
              You currently have <strong>{extrasCount}</strong> extra Doorable{extrasCount === 1 ? "" : "s"}.
              Create Marketplace listings from your extras in one click. Existing active or pending listings are skipped.
            </div>
          </div>

          <button
            type="button"
            className="autoSellButton"
            onClick={openAutoSellModal}
            disabled={autoSellLoading || extrasCount <= 0}
          >
            {autoSellLoading
              ? "Listing extras..."
              : extrasCount > 0
                ? `List ${extrasCount} Extra${extrasCount === 1 ? "" : "s"}`
                : "No Extras Yet"}
          </button>
        </section>

        <section className="statsSection">
          {[
            { label: "Total Doorables", value: totalCount, action: "all" },
            { label: "Owned", value: ownedCount, action: "have" },
            { label: "Still Need", value: needCount, action: "need" },
            { label: "Extras", value: extrasCount, action: "extra" },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              className="statButton"
              onClick={() => {
                setCollectionFilter(stat.action);
                document.getElementById("cards-grid")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{stat.value}</div>
            </button>
          ))}
        </section>

        <section className="panelCard filterPanel">
          <div className="filterHeader">
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Find Doorables</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                Showing {pagedCards.length} of {filteredCards.length}
                {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
              </div>
            </div>

            <button
              type="button"
              className="filterToggleButton"
              onClick={() => setShowMobileFilters((prev) => !prev)}
            >
              {showMobileFilters ? "Hide Filters" : "Filters"}
            </button>
          </div>

          <div className="quickMobileChips">
            {[
              { value: "all", label: "All" },
              { value: "have", label: "Have" },
              { value: "need", label: "Need" },
              { value: "extra", label: "Extras" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`quickChip ${collectionFilter === option.value ? "active" : ""}`}
                onClick={() => setCollectionFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button type="button" className="clearFiltersButton" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>

          <div className={`filterBody ${showMobileFilters || !isMobile ? "open" : ""}`}>
            <div className="filterWrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, series, rarity, movie, notes..."
                className="searchBox"
              />

              <div className="collectionToggleWrap">
                {[
                  { value: "all", label: "All" },
                  { value: "have", label: "Have" },
                  { value: "need", label: "Need" },
                  { value: "extra", label: "+Extra" },
                ].map((option) => {
                  const active = collectionFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setCollectionFilter(option.value)}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800,
                        background: active ? "#4f46e5" : "transparent",
                        color: active ? "white" : "#3730a3",
                        minHeight: 40,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} className="mobileSelect">
                {seriesOptions.map((series) => (
                  <option key={series} value={series}>
                    {series === "all" ? "All Series" : series}
                  </option>
                ))}
              </select>

              <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="mobileSelect">
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory === "all" ? "All Subcategories" : subcategory}
                  </option>
                ))}
              </select>

              <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} className="mobileSelect">
                {movieOptions.map((movie) => (
                  <option key={movie} value={movie}>
                    {movie === "all" ? "All Movies" : movie}
                  </option>
                ))}
              </select>

              <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="mobileSelect">
                {rarityOptions.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity === "all" ? "All Rarities" : rarity}
                  </option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button type="button" className="clearFiltersButton" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="panelCard">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Series Progress</div>
            {isMobile && seriesProgress.length > 6 && (
              <button
                type="button"
                className="clearFiltersButton"
                onClick={() => setExpandedSeries((prev) => !prev)}
              >
                {expandedSeries ? "Show Less" : "Show All"}
              </button>
            )}
          </div>

          <div className="seriesProgressGrid">
            {visibleSeriesProgress.map((entry) => (
              <button
                key={entry.series}
                onClick={() => jumpToSeries(entry.series)}
                className="seriesProgressButton"
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {entry.series}
                  {entry.subcategoryLabel && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: "#6366f1",
                        fontWeight: 700,
                      }}
                    >
                      • {entry.subcategoryLabel}
                    </span>
                  )}
                </div>

                <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
                  {entry.owned}/{entry.total} collected • {entry.percent}%
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
              </button>
            ))}
          </div>

          {isMobile && seriesProgress.length > 6 && (
            <button
              type="button"
              className="showMoreButton"
              onClick={() => setExpandedSeries((prev) => !prev)}
            >
              {expandedSeries ? "Show fewer series" : `Show all ${seriesProgress.length} series`}
            </button>
          )}
        </section>

        <section id="cards-grid" className="cardsGrid">
          {pagedCards.map((item, index) => {
            const rarity = rarityTheme(item.rarity);
            const subtleOverlay =
              item.qty > 0
                ? "linear-gradient(rgba(34,197,94,0.08), rgba(34,197,94,0.08))"
                : "linear-gradient(rgba(168,85,247,0.08), rgba(168,85,247,0.08))";

            const statusText = collectionStatus(item.qty);
            const photoOpen = expandedPhotoCardId === item.id;

            return (
              <div
                key={item.id}
                className="floatCard"
                style={{
                  background: `${subtleOverlay}, linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), ${rarity.bg}`,
                  color: rarity.text,
                  borderRadius: 22,
                  padding: 12,
                  border: `4px solid ${rarity.border}`,
                  boxShadow: `0 12px 28px rgba(0,0,0,0.14), 0 0 18px ${rarity.glow}`,
                  filter: item.qty > 0 ? "saturate(1.02)" : "saturate(0.98)",
                }}
              >
                <div className="cardImageWrap">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="cardImage"
                    />
                  ) : (
                    <div>No Image</div>
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
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: isMobile ? 18 : 20,
                        lineHeight: 1.1,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.name}
                    </div>
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
                      flexShrink: 0,
                    }}
                  >
                    {item.rarity}
                  </div>
                </div>

                <div style={{ opacity: 0.86, fontSize: 14, marginBottom: 10 }}>
                  {item.subcategory && <div>{item.subcategory}</div>}
                  {item.movie && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden="true">🎬</span>
                      <span>{item.movie}</span>
                    </div>
                  )}
                </div>

                {!isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT && (
                  <div style={{ marginBottom: 8, padding: 10, borderRadius: 12, background: "#fff1f2", color: "#9f1239", fontWeight: 850, fontSize: 13, lineHeight: 1.35 }}>
                    Free limit reached. Upgrade to add more.
                  </div>
                )}

                <div className="qtyControls">
                  <button
                    type="button"
                    onClick={() => void saveCard(item, item.qty - 1, item.note)}
                    disabled={savingId === item.id}
                    className="qtyButton"
                    style={{
                      border: "1px solid " + rarity.border,
                      background: "rgba(255,255,255,0.90)",
                      color: rarity.text,
                    }}
                  >
                    −
                  </button>

                  <div className="qtyValue">{item.qty}</div>

                  <button
                    type="button"
                    onClick={() => void saveCard(item, item.qty + 1, item.note)}
                    disabled={savingId === item.id || (!isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT)}
                    className="qtyButton"
                    style={{
                      border: "1px solid " + rarity.border,
                      background: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.90)",
                      color: rarity.text,
                      opacity: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? 0.55 : 1,
                      cursor: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? "not-allowed" : "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    fontWeight: 800,
                    color:
                      statusText === "Need"
                        ? "#7c3aed"
                        : statusText === "Extra"
                          ? "#2563eb"
                          : "#166534",
                  }}
                >
                  {savingId === item.id ? "Saving..." : statusText}
                </div>

                <textarea
                  value={item.note}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCards((prev) =>
                      prev.map((c) => (c.id === item.id ? { ...c, note: value } : c))
                    );
                  }}
                  placeholder="Notes..."
                  style={{
                    width: "100%",
                    marginTop: 8,
                    minHeight: isMobile ? 58 : 70,
                    borderRadius: 12,
                    border: "1px solid " + rarity.border,
                    background: "rgba(255,255,255,0.82)",
                    padding: 10,
                    color: "#111827",
                    boxSizing: "border-box",
                    fontSize: 14,
                  }}
                />

                <button
                  onClick={() => void saveCard(item, item.qty, item.note)}
                  disabled={savingId === item.id}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 800,
                    background: rarity.badgeBg,
                    color: rarity.badgeText,
                    minHeight: 44,
                  }}
                >
                  {savingId === item.id ? "Saving Note..." : "Save Note"}
                </button>

                <button
                  type="button"
                  className="photoToggleButton"
                  onClick={() => setExpandedPhotoCardId(photoOpen ? "" : item.id)}
                >
                  {photoOpen ? "Hide photo upload" : "Submit better photo"}
                </button>

                {photoOpen && (
                  <div className="photoBox">
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                      Submit a better photo
                    </div>

                    <textarea
                      value={photoNote[item.id] || ""}
                      onChange={(e) =>
                        setPhotoNote((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional note about this image..."
                      style={{
                        width: "100%",
                        minHeight: 56,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        padding: 8,
                        boxSizing: "border-box",
                        marginBottom: 8,
                        background: "rgba(255,255,255,0.9)",
                        color: "#111827",
                        fontSize: 14,
                      }}
                    />

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handlePhotoSubmission(item, e.target.files?.[0] ?? null)}
                      disabled={uploadingPhotoId === item.id}
                      style={{ width: "100%" }}
                    />

                    <div style={{ marginTop: 6, fontSize: 12, color: "#4b5563" }}>
                      {uploadingPhotoId === item.id
                        ? "Submitting photo..."
                        : "Uploads are sent for review before they replace the main image."}
                    </div>
                  </div>
                )}
              </div>
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

        {!isSubscribed && (
          <div className="eliteMobileSticky">
            <div>
              <div className="eliteMobileTop">
                {ownedCount}/{FREE_LIMIT} free saves used
              </div>
              <div className="eliteMobileTrack">
                <div
                  className="eliteMobileFill"
                  style={{ width: `${Math.min(100, Math.round((ownedCount / FREE_LIMIT) * 100))}%` }}
                />
              </div>
            </div>

            <Link href="/pricing" className="eliteMobileButton">
              Upgrade
            </Link>
          </div>
        )}

        {showAutoSellModal && (
          <div className="eliteModalOverlay">
            <div className="eliteModal" style={{ width: "min(860px, 100%)", textAlign: "left" }}>
              <button
                type="button"
                className="eliteModalClose"
                onClick={() => setShowAutoSellModal(false)}
              >
                ×
              </button>

              <div className="eliteModalIcon" style={{ margin: "0 0 12px" }}>💸</div>
              <h2 className="eliteModalTitle">Choose extras to list</h2>

              <div className="eliteModalText" style={{ marginLeft: 0 }}>
                Pick which extras should become Marketplace listings. You can add prices now or leave them blank and edit later.
              </div>

              <div className="autoSellModalList">
                {autoSellDrafts.map((draft) => {
                  const item = cards.find((card) => card.id === draft.cardId);
                  const extraQty = item ? Math.max(1, Number(item.qty || 0) - 1) : 1;

                  return (
                    <div key={draft.cardId} className="autoSellItem">
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          onChange={(e) =>
                            updateAutoSellDraft(draft.cardId, {
                              selected: e.target.checked,
                            })
                          }
                        />
                        List
                      </label>

                      <div className="autoSellThumb">
                        {item?.image ? (
                          <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                        ) : (
                          <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12 }}>No image</div>
                        )}
                      </div>

                      <div className="autoSellFields">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                          <input
                            className="autoSellInput"
                            value={draft.title}
                            onChange={(e) =>
                              updateAutoSellDraft(draft.cardId, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Listing title"
                          />

                          <input
                            className="autoSellInput"
                            value={draft.price}
                            onChange={(e) =>
                              updateAutoSellDraft(draft.cardId, {
                                price: e.target.value,
                              })
                            }
                            placeholder="Price"
                            inputMode="decimal"
                          />
                        </div>

                        <textarea
                          className="autoSellTextarea"
                          value={draft.description}
                          onChange={(e) =>
                            updateAutoSellDraft(draft.cardId, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Description"
                        />

                        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                          Qty extra: {extraQty} • {item?.series || "Unknown Series"} • {item?.rarity || "Unknown rarity"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="autoSellModalActions">
                <button
                  type="button"
                  className="autoSellCancelButton"
                  onClick={() => setShowAutoSellModal(false)}
                  disabled={autoSellLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="eliteModalButton"
                  onClick={() => void handleAutoSellExtras()}
                  disabled={autoSellLoading}
                  style={{ marginTop: 0 }}
                >
                  {autoSellLoading ? "Creating listings..." : "Create Selected Listings 💜"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showUpgradeModal && (
          <div className="eliteModalOverlay">
            <div className="eliteModal">
              <button
                type="button"
                className="eliteModalClose"
                onClick={() => setShowUpgradeModal(false)}
              >
                ×
              </button>

              <div className="eliteModalIcon">💜</div>
              <h2 className="eliteModalTitle">Your free vault is full</h2>

              <div className="eliteModalText">
                Free accounts can save up to {FREE_LIMIT} Doorables. Upgrade for unlimited tracking,
                marketplace tools, selling extras, and full collector access.
              </div>

              <div className="eliteModalPlans">
                <div className="eliteModalPlan">
                  <div className="elitePlanName">Monthly</div>
                  <div className="elitePlanPrice">$3</div>
                  <div className="elitePlanSub">Flexible full access</div>
                </div>

                <div className="eliteModalPlan best">
                  <div className="eliteBestValueTag">Best Value</div>
                  <div className="elitePlanName">Yearly</div>
                  <div className="elitePlanPrice">$15</div>
                  <div className="elitePlanSub">Best for collectors</div>
                </div>
              </div>

              <Link href="/pricing" className="eliteModalButton">
                Upgrade for Full Access
              </Link>

              <button
                type="button"
                className="eliteModalLater"
                onClick={() => setShowUpgradeModal(false)}
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
