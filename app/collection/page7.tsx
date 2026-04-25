"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

function rarityTheme(rarity: string): Theme {
  const value = String(rarity || "").toLowerCase().trim();

  if (value === "exclusive" || value.includes("exclusive")) {
    return {
      bg: "#f6e5a8",
      border: "#c89211",
      text: "#332400",
      badgeBg: "#e7bc44",
      badgeText: "#4c3500",
      glow: "rgba(200,146,17,0.24)",
    };
  }

  if (value.includes("special edition")) {
    return {
      bg: "#e6d2ff",
      border: "#7c3aed",
      text: "#2f1458",
      badgeBg: "#c084fc",
      badgeText: "#3b0764",
      glow: "rgba(124,58,237,0.22)",
    };
  }

  if (value.includes("limited edition")) {
    return {
      bg: "#f8ef9b",
      border: "#d4a500",
      text: "#403000",
      badgeBg: "#f2d64c",
      badgeText: "#5c4300",
      glow: "rgba(212,165,0,0.22)",
    };
  }

  if (value.includes("ultra rare")) {
    return {
      bg: "#cfe2ff",
      border: "#2563eb",
      text: "#102a56",
      badgeBg: "#7db7ff",
      badgeText: "#123d92",
      glow: "rgba(37,99,235,0.22)",
    };
  }

  if (value === "rare" || (value.includes("rare") && !value.includes("ultra"))) {
    return {
      bg: "#d5f5df",
      border: "#16a34a",
      text: "#13361d",
      badgeBg: "#7ee29c",
      badgeText: "#14532d",
      glow: "rgba(22,163,74,0.20)",
    };
  }

  return {
    bg: "#f2f4f7",
    border: "#cbd5e1",
    text: "#111827",
    badgeBg: "#e5e7eb",
    badgeText: "#111827",
    glow: "rgba(148,163,184,0.18)",
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

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const [visibility, setVisibility] = useState<"private" | "extras_only" | "full">("private");
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [publicCollectors, setPublicCollectors] = useState<PublicCollector[]>([]);

  const [uploadingPhotoId, setUploadingPhotoId] = useState("");
  const [photoNote, setPhotoNote] = useState<Record<string, string>>({});
  const [expandedCardId, setExpandedCardId] = useState("");

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

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be signed in.");
        setLoading(false);
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
        .select("*")
        .range(0, 4999);

      if (doorablesError) {
        setError(doorablesError.message);
        setLoading(false);
        return;
      }

      const { data: userDoorables, error: userDoorablesError } = await supabase
        .from("user_doorables")
        .select("*")
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
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
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
      setError(err instanceof Error ? err.message : "Collection page crashed while loading.");
      setLoading(false);
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
        setSavingVisibility(false);
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
      const ownedCountNow = cards.filter((c) => c.qty > 0).length;
      const isAddingNewOwned = card.qty <= 0 && qty > 0;

      if (!isSubscribed && isAddingNewOwned && ownedCountNow >= 50) {
        setError("Free accounts can save up to 50 Doorables. Upgrade to unlock unlimited collection 💜");
        return;
      }

      setSavingId(card.id);
      setError("");

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
          prev.map((c) => (c.id === card.id ? { ...c, qty, note } : c))
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
          prev.map((c) => (c.id === card.id ? { ...c, qty, note, rowId: newRowId } : c))
        );
      }

      setSavingId("");
    } catch (err) {
      setSavingId("");
      alert("Save failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function handlePhotoSubmission(card: Card, file: File | null) {
    if (!file) return;

    try {
      setError("");
      setUploadingPhotoId(card.id);

      const supabase = getSupabase();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Auth error:", userError);
        setError("You are not signed in. Refresh and log in again.");
        return;
      }

      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `doorables/${card.id}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setError(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const insertPayload = {
        user_id: user.id,
        doorable_id: card.id,
        image_url: publicUrl,
        status: "pending",
      };

      const { error: insertError } = await supabase
        .from("image_submissions")
        .insert([insertPayload])
        .select();

      if (insertError) {
        console.error("Insert error full:", JSON.stringify(insertError, null, 2));
        setError(insertError.message || "Insert failed");
        setUploadingPhotoId("");
        return;
      }

      alert("Photo submitted 💜");
      setPhotoNote((prev) => ({ ...prev, [card.id]: "" }));
    } catch (err) {
      console.error("Upload crash:", err);
      setError("Upload failed");
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
  const extraCount = cards.filter((c) => c.qty > 1).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;

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
    const grouped = new Map<string, { total: number; owned: number; subcategories: string[] }>();

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

  function jumpToSeries(seriesName: string) {
    setSeriesFilter(seriesName);
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

  const cardsPerPage = isMobile ? 10 : 40;
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedCards = filteredCards.slice((safePage - 1) * cardsPerPage, safePage * cardsPerPage);

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: "100vh", background: "radial-gradient(circle at top, #312e81 0%, #0f172a 45%, #020617 100%)", color: "white" }}>
        Loading collection...
      </div>
    );
  }

  if (error && !cards.length) {
    return (
      <div style={{ padding: 24, minHeight: "100vh", background: "radial-gradient(circle at top, #312e81 0%, #0f172a 45%, #020617 100%)", color: "white" }}>
        <h1>Collection Error</h1>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 18px;
          padding-bottom: 96px;
          color: white;
          background: radial-gradient(circle at 14% 12%, rgba(168,85,247,0.32) 0%, transparent 26%), radial-gradient(circle at 86% 8%, rgba(59,130,246,0.28) 0%, transparent 24%), radial-gradient(circle at 76% 76%, rgba(236,72,153,0.18) 0%, transparent 24%), linear-gradient(180deg, #09090f 0%, #111827 40%, #020617 100%);
        }
        .shell { max-width: 1520px; margin: 0 auto; position: relative; z-index: 1; }
        .hero { position: relative; overflow: hidden; border-radius: 30px; padding: 26px; margin-bottom: 16px; background: radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 30%), linear-gradient(135deg, rgba(17,24,39,0.96), rgba(79,70,229,0.92), rgba(37,99,235,0.88)); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 24px 55px rgba(0,0,0,0.34); }
        .heroGrid { display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 18px; align-items: center; }
        .heroTitle { margin: 0; font-size: clamp(2rem, 5vw, 4rem); font-weight: 950; letter-spacing: -1.5px; line-height: 0.95; }
        .heroText { margin-top: 12px; font-size: 16px; opacity: 0.92; line-height: 1.6; max-width: 760px; }
        .progressCard { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.14); border-radius: 24px; padding: 18px; backdrop-filter: blur(8px); }
        .progressBar { height: 12px; border-radius: 999px; background: rgba(255,255,255,0.15); overflow: hidden; }
        .progressFill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#60a5fa,#c084fc,#f472b6); }
        .quickActions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .quickButton { display: flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 14px; border-radius: 16px; text-decoration: none; color: #111827; background: rgba(255,255,255,0.96); font-weight: 900; box-shadow: 0 12px 24px rgba(0,0,0,0.16); }
        .panelCard, .tierCard, .statButton { background: rgba(255,255,255,0.96); color: #111827; border: 1px solid rgba(255,255,255,0.44); box-shadow: 0 14px 30px rgba(0,0,0,0.18); }
        .panelCard { border-radius: 24px; padding: 18px; margin-bottom: 16px; }
        .tierGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
        .tierCard { border-radius: 22px; padding: 16px; overflow: hidden; position: relative; }
        .tierAccent { position: absolute; inset: 0 auto 0 0; width: 8px; border-radius: 22px 0 0 22px; }
        .statsSection { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .statButton { border-radius: 20px; padding: 16px; cursor: pointer; text-align: left; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .statButton:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(0,0,0,0.22); }
        .filterPanel { position: sticky; top: 10px; z-index: 20; }
        .filterWrap { display: grid; grid-template-columns: minmax(260px, 1.2fr) auto repeat(4, minmax(150px, 1fr)) auto; gap: 10px; align-items: center; }
        .searchBox, .mobileSelect { min-height: 48px; border-radius: 15px; border: 1px solid #d1d5db; padding: 12px 14px; background: white; color: #111827; font-size: 14px; box-sizing: border-box; width: 100%; }
        .collectionToggleWrap { display: flex; gap: 6px; align-items: center; padding: 5px; border-radius: 15px; background: #eef2ff; border: 1px solid #c7d2fe; white-space: nowrap; }
        .toggleButton { padding: 9px 12px; border-radius: 11px; border: none; cursor: pointer; font-weight: 900; min-height: 38px; }
        .publicProfileRow { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .publicProfileButton { display: inline-flex; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 14px; text-decoration: none; color: white; font-weight: 900; background: linear-gradient(135deg, #4f46e5, #7c3aed); box-shadow: 0 10px 18px rgba(79,70,229,0.28); min-height: 46px; }
        .spotlightGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .spotlightCard { display: block; text-decoration: none; background: #ffffff; color: #111827; border-radius: 18px; padding: 14px; border: 1px solid #e5e7eb; box-shadow: 0 8px 18px rgba(0,0,0,0.10); }
        .seriesGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; max-height: 360px; overflow: auto; padding-right: 4px; }
        .seriesButton { border-radius: 18px; border: 1px solid #e5e7eb; padding: 14px; background: #ffffff; text-align: left; cursor: pointer; }
        .cardsGrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        .floatCard { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
        .floatCard:hover { transform: translateY(-4px); }
        .cardImageWrap { height: 170px; background: rgba(255,255,255,0.92); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden; padding: 14px; }
        .cardImage { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.2s ease; }
        .cardImageWrap:hover .cardImage { transform: scale(1.05); }
        .qtyControls { display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; gap: 10px; margin-top: 10px; }
        .qtyButton { width: 48px; height: 48px; min-width: 48px; border-radius: 15px; font-size: 24px; font-weight: 950; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent; }
        .qtyValue { text-align: center; font-weight: 950; font-size: 24px; }
        .detailsToggle { width: 100%; border: none; border-radius: 13px; min-height: 42px; margin-top: 10px; cursor: pointer; font-weight: 900; background: rgba(255,255,255,0.72); color: #111827; }
        .noteArea { width: 100%; margin-top: 8px; min-height: 64px; border-radius: 12px; padding: 10px; color: #111827; box-sizing: border-box; font-size: 14px; }
        .photoBox { margin-top: 10px; padding: 10px; border-radius: 14px; background: rgba(255,255,255,0.58); border: 1px solid rgba(255,255,255,0.62); }
        .pager { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 18px; }
        .pagerButton { padding: 11px 15px; border-radius: 13px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.10); color: white; font-weight: 900; cursor: pointer; min-height: 44px; }
        .pagerButton:disabled { opacity: 0.45; cursor: not-allowed; }
        .upgradeBox { margin-top: 14px; background: rgba(255,255,255,0.96); color: #111827; border-radius: 18px; padding: 14px; border: 1px solid rgba(255,255,255,0.35); }
        .mobileStickyStats { display: none; }
        @media (max-width: 1300px) { .cardsGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); } .filterWrap { grid-template-columns: minmax(260px, 1fr) auto repeat(2, minmax(150px, 1fr)); } }
        @media (max-width: 1000px) { .heroGrid, .tierGrid, .statsSection { grid-template-columns: 1fr; } .quickActions { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cardsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filterPanel { position: sticky; top: 0; margin-left: -14px; margin-right: -14px; border-radius: 0 0 24px 24px; } .filterWrap { grid-template-columns: 1fr; } .collectionToggleWrap { width: 100%; overflow-x: auto; } .toggleButton { flex: 1; } .spotlightGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .publicProfileRow { flex-direction: column; align-items: stretch; } .publicProfileButton { width: 100%; } }
        @media (max-width: 640px) { .page { padding: 14px; padding-bottom: 110px; } .hero { padding: 20px; border-radius: 24px; } .heroTitle { font-size: 2.25rem; } .heroText { font-size: 15px; } .quickActions { grid-template-columns: 1fr 1fr; gap: 10px; } .quickButton { min-height: 46px; padding: 10px 11px; font-size: 13px; } .panelCard, .tierCard, .statButton { border-radius: 22px; padding: 15px; } .cardsGrid { grid-template-columns: 1fr; } .cardImageWrap { height: 190px; } .seriesGrid { max-height: 280px; } .mobileStickyStats { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 50; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px; border-radius: 22px; background: rgba(15,23,42,0.92); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(10px); box-shadow: 0 18px 40px rgba(0,0,0,0.34); } .mobileStickyStats button { border: none; border-radius: 16px; background: rgba(255,255,255,0.10); color: white; padding: 9px 6px; font-weight: 900; } }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="heroGrid">
            <div>
              <h1 className="heroTitle">My Collection 💜</h1>
              <div className="heroText">
                Track your Doorables, mark what you have, organize what you need, and keep extras ready for selling or trading.
                {username ? ` Welcome back, ${username}.` : ""}
              </div>

              <div className="quickActions" style={{ marginTop: 20, marginBottom: 0 }}>
                <Link href="/marketplace" className="quickButton">🛍️ Marketplace</Link>
                <Link href="/sell" className="quickButton">✨ Sell Extras</Link>
                <Link href="/feedback" className="quickButton">💬 Feedback</Link>
                <Link href="/pricing" className="quickButton">🚀 Upgrade</Link>
              </div>
            </div>

            <div className="progressCard">
              <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 8 }}>Collection Completion</div>
              <div style={{ fontSize: 42, fontWeight: 950, marginBottom: 10 }}>{completion}%</div>
              <div className="progressBar"><div className="progressFill" style={{ width: `${completion}%` }} /></div>
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.86 }}>{ownedCount} owned • {needCount} needed • {extraCount} extras</div>
            </div>
          </div>

          {!isSubscribed && (
            <div className="upgradeBox">
              <div style={{ fontWeight: 950, marginBottom: 4 }}>Free plan: up to 50 saved Doorables</div>
              <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>You are using {ownedCount}/50 saved Doorables. Upgrade to unlock unlimited collection, marketplace, and selling.</div>
              <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "#4f46e5", color: "white", textDecoration: "none", fontWeight: 900, minHeight: 44 }}>Upgrade Now</Link>
            </div>
          )}
        </section>

        {!!error && cards.length > 0 && <section className="panelCard" style={{ color: "#b91c1c", fontWeight: 900 }}>{error}</section>}

        <section className="tierGrid">
          {[collectionTier, marketplaceTier, communityTier].map((tier) => (
            <div key={tier.title} className="tierCard">
              <div className="tierAccent" style={{ background: tier.accent }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 900, marginBottom: 6 }}>{tier.title}</div>
                <div style={{ fontSize: 24, fontWeight: 950, marginBottom: 6 }}>{tier.label}</div>
                <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>{tier.subtext}</div>
                {tier.title === "Marketplace Tier" && <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900, color: "#7c3aed" }}>{renderStars(marketplaceTier.stars)} <span style={{ color: "#6b7280", fontWeight: 700 }}>{marketplaceTier.stars > 0 ? `${marketplaceTier.stars.toFixed(1)} · ${marketplaceReviewCount} review${marketplaceReviewCount === 1 ? "" : "s"}` : "No ratings yet"}</span></div>}
                {tier.title === "Community Tier" && <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>{monthlyMessages} chats • {monthlyListings} listings • {monthlyPhotos} photos • {monthlyFeedback} feedback</div>}
              </div>
            </div>
          ))}
        </section>

        <section className="statsSection">
          {[{ label: "Total", value: totalCount, action: "all" }, { label: "Owned", value: ownedCount, action: "have" }, { label: "Needed", value: needCount, action: "need" }, { label: "Extras", value: extraCount, action: "extra" }].map((stat) => (
            <button key={stat.label} type="button" className="statButton" onClick={() => { setCollectionFilter(stat.action); document.getElementById("cards-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 5, fontWeight: 800 }}>{stat.label}</div>
              <div style={{ fontSize: 31, fontWeight: 950 }}>{stat.value}</div>
            </button>
          ))}
        </section>

        <section className="panelCard filterPanel">
          <div className="filterWrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, series, rarity, movie, notes..." className="searchBox" />
            <div className="collectionToggleWrap">
              {[{ value: "all", label: "All" }, { value: "have", label: "Have" }, { value: "need", label: "Need" }, { value: "extra", label: "+Extra" }].map((option) => {
                const active = collectionFilter === option.value;
                return <button key={option.value} onClick={() => setCollectionFilter(option.value)} className="toggleButton" style={{ background: active ? "#4f46e5" : "transparent", color: active ? "white" : "#3730a3" }}>{option.label}</button>;
              })}
            </div>
            <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} className="mobileSelect">{seriesOptions.map((series) => <option key={series} value={series}>{series === "all" ? "All Series" : series}</option>)}</select>
            <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="mobileSelect">{subcategoryOptions.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory === "all" ? "All Subcategories" : subcategory}</option>)}</select>
            <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} className="mobileSelect">{movieOptions.map((movie) => <option key={movie} value={movie}>{movie === "all" ? "All Movies" : movie}</option>)}</select>
            <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="mobileSelect">{rarityOptions.map((rarity) => <option key={rarity} value={rarity}>{rarity === "all" ? "All Rarities" : rarity}</option>)}</select>
            <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 900, whiteSpace: "nowrap" }}>{filteredCards.length} results</div>
          </div>
        </section>

        {username && (
          <section className="panelCard">
            <div className="publicProfileRow">
              <div><div style={{ fontWeight: 950, marginBottom: 6 }}>Public Collector Page</div><div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>Visibility: <strong>{getVisibilityLabel()}</strong><br />Public link: <strong>/collector/{username}</strong></div></div>
              <Link href={`/collector/${username}`} className="publicProfileButton">View Public Profile</Link>
            </div>
          </section>
        )}

        <section className="panelCard">
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Collection Visibility</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ value: "private", label: "Private 🔒" }, { value: "extras_only", label: "Wishlist + Extras 💜" }, { value: "full", label: "Full Collection 🌟" }].map((option) => {
              const active = visibility === option.value;
              return <button key={option.value} onClick={() => void saveVisibility(option.value as "private" | "extras_only" | "full")} disabled={savingVisibility} style={{ padding: "11px 14px", borderRadius: 13, border: "none", cursor: savingVisibility ? "wait" : "pointer", fontWeight: 900, background: active ? "#4f46e5" : "#eef2ff", color: active ? "white" : "#3730a3", opacity: savingVisibility ? 0.7 : 1, minHeight: 44 }}>{option.label}</button>;
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Control what other collectors can see on your public profile.</div>
        </section>

        {publicCollectors.length > 0 && (
          <section className="panelCard">
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Public Collectors Spotlight ✨</div>
            <div className="spotlightGrid">{publicCollectors.map((collector) => <Link key={collector.id} href={`/collector/${collector.username}`} className="spotlightCard"><div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>@{collector.username}</div><div style={{ fontSize: 13, color: "#6b7280" }}>{collector.collection_visibility === "full" ? "Full collection open" : "Wishlist + extras open"}</div></Link>)}</div>
          </section>
        )}

        <section className="panelCard">
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12 }}>Series Progress</div>
          <div className="seriesGrid">
            {seriesProgress.map((entry) => <button key={entry.series} onClick={() => jumpToSeries(entry.series)} className="seriesButton"><div style={{ fontWeight: 900, marginBottom: 6 }}>{entry.series}{entry.subcategoryLabel && <span style={{ marginLeft: 8, color: "#6366f1", fontWeight: 800 }}>• {entry.subcategoryLabel}</span>}</div><div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>{entry.owned}/{entry.total} collected • {entry.percent}%</div><div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${entry.percent}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#a78bfa)" }} /></div></button>)}
          </div>
        </section>

        <section id="cards-grid" className="cardsGrid">
          {pagedCards.map((item) => {
            const rarity = rarityTheme(item.rarity);
            const subtleOverlay = item.qty > 0 ? "linear-gradient(rgba(34,197,94,0.08), rgba(34,197,94,0.08))" : "linear-gradient(rgba(168,85,247,0.08), rgba(168,85,247,0.08))";
            const statusText = collectionStatus(item.qty);
            const isExpanded = expandedCardId === item.id;

            return (
              <article key={item.id} className="floatCard" style={{ background: `${subtleOverlay}, linear-gradient(rgba(0,0,0,0.06), rgba(0,0,0,0.06)), ${rarity.bg}`, color: rarity.text, borderRadius: 24, padding: 13, border: `4px solid ${rarity.border}`, boxShadow: `0 14px 30px rgba(0,0,0,0.16), 0 0 20px ${rarity.glow}`, filter: item.qty > 0 ? "saturate(1.04)" : "saturate(0.98)" }}>
                <div className="cardImageWrap">{item.image ? <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="cardImage" /> : <div>No Image</div>}</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 950, fontSize: 19, lineHeight: 1.1, wordBreak: "break-word" }}>{item.name}</div><div style={{ opacity: 0.82, fontSize: 13, marginTop: 3 }}>{item.series}</div></div>
                  <div style={{ padding: "6px 9px", borderRadius: 999, fontSize: 11, fontWeight: 950, background: rarity.badgeBg, color: rarity.badgeText, whiteSpace: "nowrap", flexShrink: 0 }}>{item.rarity}</div>
                </div>
                <div className="qtyControls">
                  <button type="button" onClick={() => void saveCard(item, item.qty - 1, item.note)} disabled={savingId === item.id} className="qtyButton" style={{ border: "1px solid " + rarity.border, background: "rgba(255,255,255,0.92)", color: rarity.text }} aria-label={`Decrease ${item.name}`}>−</button>
                  <div className="qtyValue">{item.qty}</div>
                  <button type="button" onClick={() => void saveCard(item, item.qty + 1, item.note)} disabled={savingId === item.id} className="qtyButton" style={{ border: "1px solid " + rarity.border, background: "rgba(255,255,255,0.92)", color: rarity.text }} aria-label={`Increase ${item.name}`}>+</button>
                </div>
                <div style={{ marginTop: 9, fontWeight: 950, color: statusText === "Need" ? "#7c3aed" : statusText === "Extra" ? "#2563eb" : "#166534" }}>{savingId === item.id ? "Saving..." : statusText}</div>
                <button type="button" className="detailsToggle" onClick={() => setExpandedCardId(isExpanded ? "" : item.id)}>{isExpanded ? "Hide Details" : "Details + Notes"}</button>
                {isExpanded && <><div style={{ opacity: 0.86, fontSize: 14, marginTop: 10 }}>{item.subcategory && <div>{item.subcategory}</div>}{item.movie && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true">🎬</span><span>{item.movie}</span></div>}</div><textarea value={item.note} onChange={(e) => { const value = e.target.value; setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, note: value } : c))); }} placeholder="Notes..." className="noteArea" style={{ border: "1px solid " + rarity.border, background: "rgba(255,255,255,0.84)" }} /><button onClick={() => void saveCard(item, item.qty, item.note)} disabled={savingId === item.id} style={{ marginTop: 8, width: "100%", padding: "11px 12px", borderRadius: 13, border: "none", cursor: "pointer", fontWeight: 900, background: rarity.badgeBg, color: rarity.badgeText, minHeight: 44 }}>{savingId === item.id ? "Saving Note..." : "Save Note"}</button><div className="photoBox"><div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Submit a better photo</div><textarea value={photoNote[item.id] || ""} onChange={(e) => setPhotoNote((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Optional note about this image..." style={{ width: "100%", minHeight: 54, borderRadius: 11, border: "1px solid #d1d5db", padding: 8, boxSizing: "border-box", marginBottom: 8, background: "rgba(255,255,255,0.92)", color: "#111827", fontSize: 14 }} /><input type="file" accept="image/*" onChange={(e) => void handlePhotoSubmission(item, e.target.files?.[0] ?? null)} disabled={uploadingPhotoId === item.id} style={{ width: "100%" }} /><div style={{ marginTop: 6, fontSize: 12, color: "#4b5563" }}>{uploadingPhotoId === item.id ? "Submitting photo..." : "Uploads are reviewed before replacing the main image."}</div></div></>}
              </article>
            );
          })}
        </section>

        {totalPages > 1 && <div className="pager"><button type="button" className="pagerButton" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button><div style={{ fontWeight: 900 }}>Page {safePage} of {totalPages}</div><button type="button" className="pagerButton" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button></div>}

        <div className="mobileStickyStats">{[{ label: "Have", value: ownedCount, action: "have" }, { label: "Need", value: needCount, action: "need" }, { label: "Extra", value: extraCount, action: "extra" }].map((item) => <button key={item.label} type="button" onClick={() => { setCollectionFilter(item.action); document.getElementById("cards-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><div style={{ fontSize: 12, opacity: 0.82 }}>{item.label}</div><div style={{ fontSize: 18 }}>{item.value}</div></button>)}</div>
      </div>
    </main>
  );
}
