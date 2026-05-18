"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Visibility = "private" | "extras_only" | "full";
type ViewMode = "cards" | "list";

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
  collection_visibility: Visibility;
};

type AutoSellDraft = {
  cardId: string;
  title: string;
  price: string;
  description: string;
  selected: boolean;
};

type SeriesProgressItem = {
  series: string;
  total: number;
  owned: number;
  remaining: number;
  percent: number;
  subcategoryLabel: string;
  isMissingSeries: boolean;
};

const FREE_LIMIT = 50;
const MONTHLY_PRICE_LABEL = "$3/month";
const YEARLY_PRICE_LABEL = "$15/year";

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeVisibility(value: unknown): Visibility {
  const clean = cleanText(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_").replace(/\+/g, "_");
  if (["full", "public", "full_collection", "full_public", "all"].includes(clean)) return "full";
  if (["extras_only", "wishlist_extras", "wishlist_and_extras", "wishlist", "extras"].includes(clean)) return "extras_only";
  return "private";
}

function alphaSort(a: string, b: string) {
  return cleanText(a).localeCompare(cleanText(b), undefined, { numeric: true, sensitivity: "base" });
}

function seriesSort(a: string, b: string) {
  const cleanA = cleanText(a);
  const cleanB = cleanText(b);
  const aNum = cleanA.match(/\d+/);
  const bNum = cleanB.match(/\d+/);

  if (aNum && bNum) {
    const diff = Number(aNum[0]) - Number(bNum[0]);
    if (diff !== 0) return diff;
  }

  if (cleanA.toLowerCase().includes("unassigned") && !cleanB.toLowerCase().includes("unassigned")) return 1;
  if (!cleanA.toLowerCase().includes("unassigned") && cleanB.toLowerCase().includes("unassigned")) return -1;

  return alphaSort(cleanA, cleanB);
}

function collectionStatus(qty: number) {
  if (qty > 1) return "Extra";
  if (qty > 0) return "Have";
  return "Need";
}

function renderStars(value: number) {
  if (value <= 0) return "☆☆☆☆☆";
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function average(nums: number[]) {
  return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : 0;
}

function rarityTheme(rarity: string) {
  const value = cleanText(rarity).toLowerCase();

  if (value.includes("exclusive")) return { bg: "#f6e5a8", border: "#c89211", text: "#332400", badgeBg: "#e7bc44", badgeText: "#4c3500", glow: "rgba(200,146,17,0.22)" };
  if (value.includes("special edition")) return { bg: "#e6d2ff", border: "#7c3aed", text: "#2f1458", badgeBg: "#c084fc", badgeText: "#3b0764", glow: "rgba(124,58,237,0.20)" };
  if (value.includes("limited edition")) return { bg: "#f8ef9b", border: "#d4a500", text: "#403000", badgeBg: "#f2d64c", badgeText: "#5c4300", glow: "rgba(212,165,0,0.20)" };
  if (value.includes("ultra rare")) return { bg: "#cfe2ff", border: "#2563eb", text: "#102a56", badgeBg: "#7db7ff", badgeText: "#123d92", glow: "rgba(37,99,235,0.20)" };
  if (value === "rare" || (value.includes("rare") && !value.includes("ultra"))) return { bg: "#d5f5df", border: "#16a34a", text: "#13361d", badgeBg: "#7ee29c", badgeText: "#14532d", glow: "rgba(22,163,74,0.18)" };

  return { bg: "#f2f4f7", border: "#cbd5e1", text: "#111827", badgeBg: "#e5e7eb", badgeText: "#111827", glow: "rgba(148,163,184,0.16)" };
}

function getCollectionTier(completion: number, ownedCount: number) {
  if (completion >= 90 || ownedCount >= 400) return { label: "Crown Collector", subtext: `${completion}% complete`, accent: "linear-gradient(135deg,#f59e0b,#facc15)" };
  if (completion >= 70 || ownedCount >= 250) return { label: "Elite Collector", subtext: `${completion}% complete`, accent: "linear-gradient(135deg,#7c3aed,#c084fc)" };
  if (completion >= 45 || ownedCount >= 125) return { label: "Vault Builder", subtext: `${completion}% complete`, accent: "linear-gradient(135deg,#2563eb,#60a5fa)" };
  if (completion >= 20 || ownedCount >= 50) return { label: "Treasure Tracker", subtext: `${completion}% complete`, accent: "linear-gradient(135deg,#16a34a,#4ade80)" };
  return { label: "Starter Shelf", subtext: `${completion}% complete`, accent: "linear-gradient(135deg,#64748b,#94a3b8)" };
}

function getMarketplaceTier(stars: number, reviewCount: number, activeListings: number, soldListings: number) {
  const fallbackStars = reviewCount > 0 ? stars : soldListings >= 10 ? 5 : soldListings >= 5 ? 4.7 : soldListings >= 2 ? 4.3 : activeListings >= 3 ? 4 : 0;

  if ((reviewCount >= 10 && stars >= 4.8) || soldListings >= 15) {
    return { label: "Vault Legend", subtext: fallbackStars ? `${fallbackStars.toFixed(1)} ★ marketplace rating` : "Top marketplace energy", accent: "linear-gradient(135deg,#f59e0b,#fb7185)", stars: fallbackStars };
  }
  if ((reviewCount >= 5 && stars >= 4.5) || soldListings >= 7) {
    return { label: "Marketplace MVP", subtext: fallbackStars ? `${fallbackStars.toFixed(1)} ★ marketplace rating` : "Strong seller momentum", accent: "linear-gradient(135deg,#7c3aed,#ec4899)", stars: fallbackStars };
  }
  if ((reviewCount >= 3 && stars >= 4.2) || soldListings >= 3) {
    return { label: "Trusted Trader", subtext: fallbackStars ? `${fallbackStars.toFixed(1)} ★ marketplace rating` : "Growing trade trust", accent: "linear-gradient(135deg,#2563eb,#7c3aed)", stars: fallbackStars };
  }
  if (activeListings > 0 || soldListings > 0) {
    return { label: "Smooth Seller", subtext: fallbackStars ? `${fallbackStars.toFixed(1)} ★ marketplace rating` : "Getting active in marketplace", accent: "linear-gradient(135deg,#0ea5e9,#38bdf8)", stars: fallbackStars };
  }

  return { label: "New Seller", subtext: "No marketplace rating yet", accent: "linear-gradient(135deg,#64748b,#94a3b8)", stars: fallbackStars };
}

function getCommunityTier(monthlyMessages: number, monthlyListings: number, monthlyPhotos: number, monthlyFeedback: number, isPublic: boolean) {
  const score = monthlyMessages * 2 + monthlyListings * 2 + monthlyPhotos * 2 + monthlyFeedback + (isPublic ? 2 : 0);

  if (score >= 20) return { label: "Heart of the Vault", subtext: "Very active this month", accent: "linear-gradient(135deg,#ec4899,#f472b6)", score };
  if (score >= 12) return { label: "Vault Favorite", subtext: "Strong community energy", accent: "linear-gradient(135deg,#8b5cf6,#c084fc)", score };
  if (score >= 7) return { label: "Chat Champ", subtext: "Nicely active this month", accent: "linear-gradient(135deg,#2563eb,#60a5fa)", score };
  if (score >= 3) return { label: "Community Spark", subtext: "Building momentum this month", accent: "linear-gradient(135deg,#14b8a6,#34d399)", score };

  return { label: "Quiet Gem", subtext: "Low-key month so far", accent: "linear-gradient(135deg,#64748b,#94a3b8)", score };
}

function getVaultMilestone(ownedCount: number, isSubscribed: boolean) {
  if (isSubscribed) return { eyebrow: "👑 Unlimited Vault Active", title: "Your vault can keep growing without a cap.", body: "Keep adding Doorables, notes, extras, public profile updates, marketplace listings, and photo submissions whenever you want." };
  if (ownedCount >= FREE_LIMIT) return { eyebrow: "💜 Free Vault Full", title: "You hit 50 saved Doorables — the vault did its job.", body: "Upgrade to keep tracking every figure, series, extra, wishlist item, and seller tool without hitting another wall." };
  if (ownedCount >= 40) return { eyebrow: "🔥 Almost full", title: "Your vault is getting serious.", body: `You have ${FREE_LIMIT - ownedCount} free saves left. This is the perfect time to unlock unlimited before your next hunt or live sale.` };
  if (ownedCount >= 25) return { eyebrow: "✨ Halfway hooked", title: "You are officially building a real collector vault.", body: "Keep filling it in, check your progress by series, and use the Need/Extras filters before you buy another duplicate." };
  if (ownedCount >= 10) return { eyebrow: "💜 Vault started", title: "The useful part is kicking in now.", body: "The more you save, the better this becomes during shopping, trades, Whatnot shows, and blind-box chaos." };
  if (ownedCount > 0) return { eyebrow: "🌱 First shelf started", title: "Add a few more and the magic starts showing.", body: "Try adding your newest favorites first, then use filters to track what you have, need, and can trade." };
  return { eyebrow: "👀 Start with your favorites", title: "Build your vault before your next Doorables hunt.", body: "Tap + on the Doorables you own. Once your collection is saved, you can stop guessing and start checking." };
}

function getSeriesProgressTheme(percent: number) {
  if (percent >= 100) return { label: "Complete", icon: "🏆", fill: "linear-gradient(90deg,#f59e0b,#facc15,#fde68a)", background: "linear-gradient(135deg,#fff7ed,#fef3c7)", border: "#f59e0b", text: "#78350f", glow: "0 14px 28px rgba(245,158,11,0.22)" };
  if (percent >= 75) return { label: "Almost there", icon: "🔥", fill: "linear-gradient(90deg,#f97316,#f59e0b)", background: "linear-gradient(135deg,#fff7ed,#ffffff)", border: "#fdba74", text: "#9a3412", glow: "0 12px 24px rgba(249,115,22,0.15)" };
  if (percent >= 50) return { label: "Halfway+", icon: "💜", fill: "linear-gradient(90deg,#7c3aed,#c084fc)", background: "linear-gradient(135deg,#f5f3ff,#ffffff)", border: "#c4b5fd", text: "#5b21b6", glow: "0 12px 24px rgba(124,58,237,0.14)" };
  if (percent >= 25) return { label: "Building", icon: "🧩", fill: "linear-gradient(90deg,#2563eb,#60a5fa)", background: "linear-gradient(135deg,#eff6ff,#ffffff)", border: "#bfdbfe", text: "#1d4ed8", glow: "0 12px 24px rgba(37,99,235,0.12)" };
  return { label: "Started", icon: "🌱", fill: "linear-gradient(90deg,#64748b,#94a3b8)", background: "linear-gradient(135deg,#f8fafc,#ffffff)", border: "#e5e7eb", text: "#475569", glow: "0 10px 20px rgba(15,23,42,0.08)" };
}

function getSeriesHook(entry: SeriesProgressItem) {
  if (entry.percent >= 100) return "Series complete — gold vault status unlocked.";
  if (entry.remaining === 1) return "Only 1 left. This is the danger zone 👀";
  if (entry.remaining <= 3) return `Only ${entry.remaining} left to finish this series.`;
  if (entry.percent >= 75) return `${entry.remaining} left — this one is almost gold.`;
  if (entry.percent >= 50) return "Halfway there. Keep the momentum going.";
  if (entry.owned > 0) return "Started. Add more to build this shelf.";
  return "No saves yet. Tap to start this series.";
}

async function getAllDoorables(supabase: any) {
  const batchSize = 1000;
  let from = 0;
  const allRows: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("doorables")
      .select("id, name, series, rarity, subcategory, movie, image_url")
      .order("series", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true, nullsFirst: false })
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return allRows;
}

function LoggedOutCollectionLanding() {
  return (
    <main className="guestCollectionPage">
      <style jsx>{styles}</style>
      <div className="guestShell">
        <section className="guestHero">
          <div>
            <div className="guestBadge">✨ Preview before signing up ✨</div>
            <h1 className="guestTitle">Stop guessing what you have. Start building your vault.</h1>
            <p className="guestText">
              Save what you own, mark what you still need, organize extras, and check your collection before you buy another duplicate.
              Free accounts can save up to 50 Doorables before upgrading.
            </p>

            <div className="guestPills">
              <span className="guestPill">Free up to 50 saves</span>
              <span className="guestPill">Mobile-friendly hunt list</span>
              <span className="guestPill">Extras + wishlist tracking</span>
              <span className="guestPill">Series progress dopamine</span>
            </div>

            <div className="guestActions">
              <Link href="/demo" className="guestButton primary">👀 Preview First</Link>
              <Link href="/login?next=/collection" className="guestButton secondary">💜 Start Free</Link>
            </div>
          </div>

          <div className="guestPreviewCard">
            <div className="mockSearch">Search name, series, rarity, movie...</div>
            <div className="guestStats">
              <div className="guestStat"><strong>50</strong><span>free saves</span></div>
              <div className="guestStat"><strong>Need</strong><span>hunt list</span></div>
              <div className="guestStat"><strong>Extras</strong><span>trade/sell</span></div>
              <div className="guestStat"><strong>Gold</strong><span>complete series</span></div>
            </div>

            <div className="mockList">
              <div className="mockRow">
                <div className="mockThumb">💜</div>
                <div><div className="mockName">Collection item</div><div className="mockMeta">Series • Rarity • Movie</div></div>
                <div className="mockQty">1</div>
              </div>

              <div className="mockRow">
                <div className="mockThumb">🏆</div>
                <div><div className="mockName">Complete a series</div><div className="mockMeta">Watch it turn gold.</div></div>
                <div className="mockQty">✓</div>
              </div>
            </div>
          </div>
        </section>

        <section className="guestGrid">
          <Link href="/demo" className="guestFeature"><div><div className="guestIcon">👀</div><div className="guestFeatureTitle">Preview the vault</div></div><div className="guestFeatureText">See how the tracker works before making an account.</div></Link>
          <Link href="/login?next=/collection" className="guestFeature"><div><div className="guestIcon">💜</div><div className="guestFeatureTitle">Start free</div></div><div className="guestFeatureText">Create a free account and save up to 50 Doorables.</div></Link>
          <Link href="/marketplace" className="guestFeature"><div><div className="guestIcon">🛍️</div><div className="guestFeatureTitle">Browse marketplace</div></div><div className="guestFeatureText">Look for collector extras and see what others are listing.</div></Link>
          <Link href="/feedback" className="guestFeature"><div><div className="guestIcon">💬</div><div className="guestFeatureTitle">Send feedback</div></div><div className="guestFeatureText">Tell us what to fix, add, clarify, or improve next.</div></Link>
        </section>

        <section className="guestSoftCard">
          <div>
            <div className="guestSoftTitle">Built for the moment you ask, “Do I already have this one?”</div>
            <div className="guestSoftText">
              The collection tracker saves your personal collection, so you will still need an account to use it.
              But you can preview the experience first, browse public areas, and decide if it is useful before signing up.
            </div>
          </div>
          <Link href="/demo" className="guestButton primary">Open Demo</Link>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  const router = useRouter();

  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [publicCollectors, setPublicCollectors] = useState<PublicCollector[]>([]);

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
  const [collectionViewMode, setCollectionViewMode] = useState<ViewMode>("cards");
  const viewModeTouchedRef = useRef(false);
  const mobileDefaultAppliedRef = useRef(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSeriesProgress, setShowSeriesProgress] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const [uploadingPhotoId, setUploadingPhotoId] = useState("");
  const [expandedPhotoCardId, setExpandedPhotoCardId] = useState("");
  const [photoNote, setPhotoNote] = useState<Record<string, string>>({});

  const [autoSellLoading, setAutoSellLoading] = useState(false);
  const [showAutoSellModal, setShowAutoSellModal] = useState(false);
  const [autoSellDrafts, setAutoSellDrafts] = useState<AutoSellDraft[]>([]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const updateMobile = () => {
      const nextIsMobile = window.innerWidth <= 920;
      setIsMobile(nextIsMobile);

      if (nextIsMobile && !mobileDefaultAppliedRef.current && !viewModeTouchedRef.current) {
        setCollectionViewMode("list");
        mobileDefaultAppliedRef.current = true;
      }
    };

    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter, collectionViewMode, isMobile]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setNotice("");
      const supabase = getSupabase();

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;

      if (authError || !user) {
        setUserId("");
        setUsername("");
        setIsSubscribed(false);
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
      setUsername(cleanText(profile?.username));
      setVisibility(normalizeVisibility(profile?.collection_visibility));

      const spotlightResult = await supabase
        .from("users")
        .select("id, username, collection_visibility")
        .not("username", "is", null)
        .order("username", { ascending: true })
        .limit(50);

      if (!spotlightResult.error) {
        setPublicCollectors(
          ((spotlightResult.data || []) as any[])
            .map((row) => ({
              id: String(row.id),
              username: cleanText(row.username),
              collection_visibility: normalizeVisibility(row.collection_visibility),
            }))
            .filter((row) => row.username && row.collection_visibility !== "private")
            .slice(0, 24)
        );
      }

      const [doorablesData, userDoorablesResult] = await Promise.all([
        getAllDoorables(supabase),
        supabase
          .from("user_doorables")
          .select("id, doorable_id, qty_owned, custom_tag")
          .eq("user_id", user.id),
      ]);

      if (userDoorablesResult.error) {
        setError(userDoorablesResult.error.message);
        setLoading(false);
        return;
      }

      const userMap = new Map<string, any>();
      (userDoorablesResult.data || []).forEach((row: any) => {
        userMap.set(String(row.doorable_id), row);
      });

      const merged: Card[] = (doorablesData || [])
        .map((d: any) => {
          const row = userMap.get(String(d.id));
          return {
            id: String(d.id ?? ""),
            name: cleanText(d.name ?? d.character_name ?? d.title) || "Unknown",
            series: cleanText(d.series),
            rarity: cleanText(d.rarity) || "Common",
            subcategory: cleanText(d.subcategory),
            movie: cleanText(d.movie),
            image: String(d.image_url ?? "").trim(),
            qty: Number(row?.qty_owned ?? 0),
            note: String(row?.custom_tag ?? ""),
            rowId: row?.id ? String(row.id) : null,
          };
        })
        .filter((card) => card.id)
        .sort((a, b) => alphaSort(a.name, b.name));

      setCards(merged);
      await loadActivityStats(user.id);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection page crashed while loading.");
      setLoading(false);
    }
  }

  async function loadActivityStats(currentUserId: string) {
    const supabase = getSupabase();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    const [listingsResult, reviewsResult, messagesResult, submissionsBySubmittedByResult, submissionsByUserIdResult, feedbackResult] =
      await Promise.allSettled([
        supabase.from("marketplace_listings").select("id, status, created_at, sold_at").eq("user_id", currentUserId),
        supabase.from("collector_reviews").select("rating").eq("reviewed_user_id", currentUserId),
        supabase.from("marketplace_messages").select("id").eq("sender_id", currentUserId).gte("created_at", startOfMonthIso),
        supabase.from("image_submissions").select("id").eq("submitted_by", currentUserId).gte("created_at", startOfMonthIso),
        supabase.from("image_submissions").select("id").eq("user_id", currentUserId).gte("created_at", startOfMonthIso),
        supabase.from("feedback_posts").select("id").eq("user_id", currentUserId).gte("created_at", startOfMonthIso),
      ]);

    if (listingsResult.status === "fulfilled" && !listingsResult.value.error) {
      const listings = listingsResult.value.data || [];
      setActiveListingsCount(listings.filter((row: any) => String(row.status || "") === "active").length);
      setSoldListingsCount(listings.filter((row: any) => String(row.status || "") === "sold" || !!row.sold_at).length);
      setMonthlyListings(listings.filter((row: any) => row.created_at && new Date(row.created_at).getTime() >= new Date(startOfMonthIso).getTime()).length);
    }

    if (reviewsResult.status === "fulfilled" && !reviewsResult.value.error) {
      const ratings = (reviewsResult.value.data || []).map((row: any) => Number(row.rating || 0)).filter((n: number) => n > 0);
      setMarketplaceStars(average(ratings));
      setMarketplaceReviewCount(ratings.length);
    }

    if (messagesResult.status === "fulfilled" && !messagesResult.value.error) {
      setMonthlyMessages((messagesResult.value.data || []).length);
    }

    const submittedByCount = submissionsBySubmittedByResult.status === "fulfilled" && !submissionsBySubmittedByResult.value.error ? (submissionsBySubmittedByResult.value.data || []).length : 0;
    const userIdCount = submissionsByUserIdResult.status === "fulfilled" && !submissionsByUserIdResult.value.error ? (submissionsByUserIdResult.value.data || []).length : 0;
    setMonthlyPhotos(Math.max(submittedByCount, userIdCount));

    if (feedbackResult.status === "fulfilled" && !feedbackResult.value.error) {
      setMonthlyFeedback((feedbackResult.value.data || []).length);
    }
  }

  async function saveVisibility(next: Visibility) {
    try {
      const normalizedNext = normalizeVisibility(next);
      setSavingVisibility(true);
      setError("");
      setNotice("");

      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace("/login?next=/collection");
        return;
      }

      const { data: updatedById, error: updateError } = await supabase
        .from("users")
        .update({ collection_visibility: normalizedNext })
        .eq("id", user.id)
        .select("id, username")
        .maybeSingle();

      if (updateError) {
        setError("Could not save visibility: " + updateError.message);
        setSavingVisibility(false);
        return;
      }

      if (!updatedById?.id) {
        const { error: upsertError } = await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email,
            username: username || null,
            collection_visibility: normalizedNext,
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          setError("Could not save visibility: " + upsertError.message);
          setSavingVisibility(false);
          return;
        }
      }

      setVisibility(normalizedNext);
      setNotice(
        `Visibility saved as ${
          normalizedNext === "full" ? "Full Collection" : normalizedNext === "extras_only" ? "Wishlist + Extras" : "Private"
        } 💜`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save visibility.");
    } finally {
      setSavingVisibility(false);
    }
  }

  async function saveCard(card: Card, nextQty: number, nextNote: string) {
    try {
      const supabase = getSupabase();
      const qty = Math.max(0, Number(nextQty ?? card.qty ?? 0));
      const note = String(nextNote ?? card.note ?? "");
      const currentOwnedCount = cards.filter((c) => c.qty > 0).length;
      const isAddingNewOwned = card.qty <= 0 && qty > 0;

      if (!isSubscribed && isAddingNewOwned && currentOwnedCount >= FREE_LIMIT) {
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
        const { error: updateError } = await supabase.from("user_doorables").update(payload).eq("id", card.rowId);
        if (updateError) throw updateError;
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, qty, note } : c)));
      } else {
        const { data, error: insertError } = await supabase.from("user_doorables").insert([payload]).select().single();
        if (insertError) throw insertError;
        const newRowId = data?.id ? String(data.id) : null;
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, qty, note, rowId: newRowId } : c)));
      }

      setNotice(qty > 0 ? "Saved to your collection 💜" : "Removed from owned collection.");
    } catch (err) {
      setError("Save failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSavingId("");
    }
  }

  async function handlePhotoSubmission(card: Card, file: File | null) {
    if (!file) return;

    try {
      setError("");
      setNotice("");
      setUploadingPhotoId(card.id);

      const supabase = getSupabase();
      const { data: authData, error: userError } = await supabase.auth.getUser();
      const user = authData.user;

      if (userError || !user) {
        router.replace("/login?next=/collection");
        return;
      }

      const rawExt = file.name.split(".").pop() || "jpg";
      const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `doorables/${card.id}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("submissions").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("submissions").getPublicUrl(filePath);
      const basePayload = { doorable_id: card.id, image_url: publicUrlData.publicUrl, status: "pending" };

      const { error: submittedByError } = await supabase.from("image_submissions").insert([{ ...basePayload, submitted_by: user.id }]);

      if (submittedByError) {
        const { error: userIdError } = await supabase.from("image_submissions").insert([{ ...basePayload, user_id: user.id }]);

        if (userIdError) {
          setError("Photo uploaded, but it could not be added to the review queue. submitted_by error: " + submittedByError.message + " | user_id error: " + userIdError.message);
          return;
        }
      }

      setNotice("Photo submitted for review 💜");
      setPhotoNote((prev) => ({ ...prev, [card.id]: "" }));
      setExpandedPhotoCardId("");
      await loadActivityStats(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingPhotoId("");
    }
  }

  async function sharePublicProfile() {
    if (!username) {
      setShareStatus("Add a username before sharing your public profile.");
      return;
    }

    const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/collector/${username}` : `https://www.mydoorables.com/collector/${username}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My Adorable Vault collection", text: "Check out my Adorable Vault collection 💜", url: profileUrl });
        setShareStatus("Profile shared! 💜");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        setShareStatus("Public profile link copied! 💜");
      } else {
        setShareStatus(`Copy this link: ${profileUrl}`);
      }

      window.setTimeout(() => setShareStatus(""), 3000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareStatus("Could not share automatically. Try copying the public link.");
    }
  }

  function openAutoSellModal() {
    setError("");
    setNotice("");

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      document.getElementById("upgrade-wall")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const extras = cards.filter((card) => Number(card.qty || 0) > 1);

    if (!extras.length) {
      setNotice("No extras to auto-list yet 💜");
      return;
    }

    setAutoSellDrafts(
      extras.map((item) => {
        const extraQty = Math.max(1, Number(item.qty || 0) - 1);
        const details = [
          item.series ? `Series: ${item.series}` : "",
          item.rarity ? `Rarity: ${item.rarity}` : "",
          item.movie ? `Movie: ${item.movie}` : "",
          item.subcategory ? `Category: ${item.subcategory}` : "",
          `Extra quantity available: ${extraQty}`,
          item.note ? `Collector note: ${item.note}` : "",
        ].filter(Boolean);

        return { cardId: item.id, title: item.name, price: "", description: `Auto-listed from collection extras. ${details.join(" • ")}`, selected: true };
      })
    );

    setShowAutoSellModal(true);
  }

  function updateAutoSellDraft(cardId: string, patch: Partial<AutoSellDraft>) {
    setAutoSellDrafts((prev) => prev.map((draft) => (draft.cardId === cardId ? { ...draft, ...patch } : draft)));
  }

  function setAllAutoSellDraftsSelected(selected: boolean) {
    setAutoSellDrafts((prev) => prev.map((draft) => ({ ...draft, selected })));
  }

  async function handleAutoSellExtras() {
    try {
      setError("");
      setNotice("");
      setAutoSellLoading(true);

      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace("/login?next=/collection");
        return;
      }

      if (!isSubscribed) {
        setShowUpgradeModal(true);
        return;
      }

      const selectedDrafts = autoSellDrafts.filter((draft) => draft.selected);

      if (!selectedDrafts.length) {
        setError("Choose at least one extra to list.");
        return;
      }

      const invalidPrice = selectedDrafts.find((draft) => draft.price.trim() !== "" && Number.isNaN(Number(draft.price.trim())));
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

      const existingKeys = new Set((existingListings || []).map((row: any) => cleanText(row.title).toLowerCase()));
      const cardMap = new Map(cards.map((card) => [card.id, card]));

      const listingsToCreate = selectedDrafts
        .filter((draft) => !existingKeys.has(cleanText(draft.title).toLowerCase()))
        .map((draft) => {
          const item = cardMap.get(draft.cardId);

          return {
            title: draft.title.trim() || item?.name || "Doorable Extra",
            description: draft.description.trim() || null,
            price: draft.price.trim() === "" ? null : Number(draft.price.trim()),
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

      const { error: insertError } = await supabase.from("marketplace_listings").insert(listingsToCreate);

      if (insertError) {
        setError("Could not auto-list extras: " + insertError.message);
        return;
      }

      setNotice(`Auto-listed ${listingsToCreate.length} extra${listingsToCreate.length === 1 ? "" : "s"} in Marketplace 💜`);
      setActiveListingsCount((prev) => prev + listingsToCreate.length);
      setMonthlyListings((prev) => prev + listingsToCreate.length);
      setShowAutoSellModal(false);
      setAutoSellDrafts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not auto-list extras.");
    } finally {
      setAutoSellLoading(false);
    }
  }

  const seriesOptions = useMemo(() => {
    const values = cards.map((card) => cleanText(card.series)).filter(Boolean).sort(seriesSort);
    return ["all", ...Array.from(new Set(values))];
  }, [cards]);

  const subcategoryOptions = useMemo(() => {
    const values = cards.map((card) => cleanText(card.subcategory)).filter(Boolean).sort(alphaSort);
    return ["all", ...Array.from(new Set(values))];
  }, [cards]);

  const rarityOptions = useMemo(() => {
    const values = cards.map((card) => cleanText(card.rarity)).filter(Boolean).sort(alphaSort);
    return ["all", ...Array.from(new Set(values))];
  }, [cards]);

  const movieOptions = useMemo(() => {
    const values = cards.map((card) => cleanText(card.movie)).filter(Boolean).sort(alphaSort);
    return ["all", ...Array.from(new Set(values))];
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards
      .filter((card) => {
        const detailText = [card.subcategory, card.movie].filter(Boolean).join(" ");
        const matchesSearch = !q || [card.name, card.series, card.rarity, detailText, card.note].join(" ").toLowerCase().includes(q);
        const matchesSeries = seriesFilter === "all" || cleanText(card.series) === cleanText(seriesFilter);
        const matchesSubcategory = subcategoryFilter === "all" || cleanText(card.subcategory) === cleanText(subcategoryFilter);
        const matchesRarity = rarityFilter === "all" || cleanText(card.rarity) === cleanText(rarityFilter);
        const matchesMovie = movieFilter === "all" || cleanText(card.movie) === cleanText(movieFilter);
        const matchesCollection = collectionFilter === "all" ? true : collectionFilter === "have" ? card.qty > 0 : collectionFilter === "need" ? card.qty <= 0 : card.qty > 1;

        return matchesSearch && matchesSeries && matchesSubcategory && matchesRarity && matchesMovie && matchesCollection;
      })
      .sort((a, b) => alphaSort(a.name, b.name));
  }, [cards, search, seriesFilter, subcategoryFilter, rarityFilter, movieFilter, collectionFilter]);

  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;
  const extrasCount = cards.reduce((sum, card) => sum + Math.max(0, Number(card.qty || 0) - 1), 0);
  const freeSlotsLeft = Math.max(0, FREE_LIMIT - ownedCount);
  const freeLimitReached = !isSubscribed && ownedCount >= FREE_LIMIT;
  const freeSavePercent = Math.min(100, Math.round((ownedCount / FREE_LIMIT) * 100));
  const vaultMilestone = useMemo(() => getVaultMilestone(ownedCount, isSubscribed), [ownedCount, isSubscribed]);

  const collectionTier = useMemo(() => getCollectionTier(completion, ownedCount), [completion, ownedCount]);
  const marketplaceTier = useMemo(() => getMarketplaceTier(marketplaceStars, marketplaceReviewCount, activeListingsCount, soldListingsCount), [marketplaceStars, marketplaceReviewCount, activeListingsCount, soldListingsCount]);
  const communityTier = useMemo(() => getCommunityTier(monthlyMessages, monthlyListings, monthlyPhotos, monthlyFeedback, visibility !== "private"), [monthlyMessages, monthlyListings, monthlyPhotos, monthlyFeedback, visibility]);

  const seriesProgress = useMemo<SeriesProgressItem[]>(() => {
    const grouped = new Map<string, { total: number; owned: number; subcategories: string[]; isMissingSeries: boolean }>();

    cards.forEach((card) => {
      const cleanSeries = cleanText(card.series);
      const cleanSubcategory = cleanText(card.subcategory);
      const key = cleanSeries || cleanSubcategory || "Unassigned Series";

      const current = grouped.get(key) || { total: 0, owned: 0, subcategories: [], isMissingSeries: !cleanSeries };
      current.total += 1;
      if (card.qty > 0) current.owned += 1;

      if (cleanSeries && cleanSubcategory && cleanSubcategory !== cleanSeries && !current.subcategories.includes(cleanSubcategory)) {
        current.subcategories.push(cleanSubcategory);
      }

      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([series, value]) => ({
        series,
        total: value.total,
        owned: value.owned,
        remaining: Math.max(0, value.total - value.owned),
        percent: value.total ? Math.round((value.owned / value.total) * 100) : 0,
        subcategoryLabel: value.subcategories.join(", "),
        isMissingSeries: value.isMissingSeries,
      }))
      .sort((a, b) => seriesSort(a.series, b.series));
  }, [cards]);

  const closestSeries = useMemo(() => {
    return seriesProgress
      .filter((entry) => entry.owned > 0 && entry.percent < 100)
      .sort((a, b) => {
        if (a.remaining !== b.remaining) return a.remaining - b.remaining;
        return b.percent - a.percent;
      })
      .slice(0, 3);
  }, [seriesProgress]);

  const visibleSeriesProgress = isMobile && !expandedSeries ? seriesProgress.slice(0, 8) : seriesProgress;

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

  function jumpToSeries(seriesName: string) {
    const matchingSeries = cards.some((card) => cleanText(card.series) === cleanText(seriesName));

    if (matchingSeries) {
      setSeriesFilter(seriesName);
    } else {
      setSearch(seriesName);
      setSeriesFilter("all");
    }

    setShowMobileFilters(false);
    requestAnimationFrame(() => {
      document.getElementById("cards-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const activeFilterCount = (seriesFilter !== "all" ? 1 : 0) + (subcategoryFilter !== "all" ? 1 : 0) + (rarityFilter !== "all" ? 1 : 0) + (movieFilter !== "all" ? 1 : 0) + (collectionFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);
  const cardsPerPage = collectionViewMode === "list" ? (isMobile ? 35 : 60) : isMobile ? 12 : 24;
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / cardsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedCards = filteredCards.slice((safePage - 1) * cardsPerPage, safePage * cardsPerPage);
  const autoSellStats = useMemo(() => ({ total: autoSellDrafts.length, selected: autoSellDrafts.filter((draft) => draft.selected).length }), [autoSellDrafts]);

  const tierCards: Array<{ title: string; label: string; subtext: string; accent: string; stars?: number; score?: number }> = [
    { title: "Collection Tier", ...collectionTier },
    { title: "Marketplace Tier", ...marketplaceTier },
    { title: "Community Tier", ...communityTier },
  ];

  if (loading) {
    return (
      <div className="loadingPage">
        <style jsx>{styles}</style>
        <div className="loadingCard">
          <div className="loadingIcon">💜</div>
          <h1>Loading your vault...</h1>
          <p>Pulling your full Doorables collection together.</p>
        </div>
      </div>
    );
  }

  if (!userId) return <LoggedOutCollectionLanding />;

  if (error && !cards.length) {
    return (
      <div className="loadingPage">
        <style jsx>{styles}</style>
        <div className="loadingCard">
          <h1>Collection Error</h1>
          <p>{error}</p>
          <Link href="/login?next=/collection" className="primaryButton">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="collectionPage">
      <style jsx>{styles}</style>

      <div className="shell">
        <div className="statusStack">
          {notice && <div className="notice">{notice}</div>}
          {error && <div className="error">{error}</div>}
        </div>

        <section className="hero">
          <div className="heroTop">
            <div>
              <h1 className="heroTitle">My Collection 💜</h1>
              <div className="heroSubtitle">Stop guessing what you have. Check your collection before your next Doorables hunt, live sale, trade, or duplicate buy.</div>
            </div>

            <div className="heroProgress">
              <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 8 }}>Collection Completion</div>
              <div style={{ fontSize: 30, fontWeight: 1000, marginBottom: 10 }}>{completion}%</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${completion}%`, background: completion >= 100 ? "linear-gradient(90deg,#f59e0b,#facc15,#fde68a)" : undefined }} />
              </div>
            </div>
          </div>

          {!isSubscribed && (
            <div className="upgradeBox">
              <div style={{ fontWeight: 1000, marginBottom: 4 }}>{vaultMilestone.eyebrow}</div>
              <div className="mutedText">You are using {ownedCount}/50 saved Doorables. Upgrade when your vault outgrows the starter shelf.</div>
              <div style={{ marginTop: 10 }}>
                <Link href="/pricing" className="primaryButton">Unlock Unlimited Vault</Link>
              </div>
            </div>
          )}
        </section>

        <section className="hookPanel">
          <div className="hookTile primary">
            <div className="hookTitle">{vaultMilestone.title}</div>
            <div className="hookText">{vaultMilestone.body}</div>
            {!isSubscribed && (
              <div style={{ marginTop: 12 }}>
                <div className="progressTrack" style={{ background: "#e5e7eb" }}>
                  <div className="progressFill" style={{ width: `${freeSavePercent}%`, background: freeSavePercent >= 100 ? "linear-gradient(90deg,#f97316,#ec4899)" : freeSavePercent >= 80 ? "linear-gradient(90deg,#f97316,#f59e0b)" : "linear-gradient(90deg,#60a5fa,#c084fc)" }} />
                </div>
                <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12, marginTop: 7 }}>{ownedCount}/{FREE_LIMIT} free saves used • {freeSlotsLeft} left</div>
              </div>
            )}
          </div>

          <div className="hookTile">
            <div className="hookTitle">Finish a series, turn it gold 🏆</div>
            <div className="hookText">Series cards shift colors as you collect more. When a series reaches 100%, it gets a gold completed look.</div>
          </div>

        </section>

        <section id="upgrade-wall" className="upgradeWall">
          <div>
            <div className="eyebrow">{isSubscribed ? "👑 Full Access Active" : freeLimitReached ? "💜 Free Vault Full" : "✨ Free Collector Plan"}</div>
            <div className="upgradeTitle">{isSubscribed ? "Unlimited collector tracking unlocked" : freeLimitReached ? "You reached 50 saved Doorables" : `Save ${freeSlotsLeft} more Doorables for free`}</div>
            <div className="mutedText">
              {isSubscribed ? "You have unlimited collection tracking, marketplace access, selling tools, photo submissions, public collector features, and full vault access." : freeLimitReached ? "Upgrade to keep adding Doorables, organize unlimited extras, use marketplace tools, and unlock full collector access." : `You are using ${ownedCount}/${FREE_LIMIT} free saved Doorables. Upgrade anytime for unlimited tracking.`}
            </div>

            {!isSubscribed && (
              <div className="planRow">
                <div className="miniPlan"><span>Monthly</span><strong>{MONTHLY_PRICE_LABEL}</strong></div>
                <div className="miniPlan best"><span>Best Value</span><strong>{YEARLY_PRICE_LABEL}</strong></div>
              </div>
            )}
          </div>

          {!isSubscribed && <Link href="/pricing" className="primaryButton">Upgrade for Full Access</Link>}
        </section>

        <section className="tierGrid">
          {tierCards.map((tier) => (
            <div key={tier.title} className="tierCard">
              <div className="tierAccent" style={{ background: tier.accent }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 800, marginBottom: 6 }}>{tier.title}</div>
                <div style={{ fontSize: 24, fontWeight: 1000, marginBottom: 6 }}>{tier.label}</div>
                <div className="mutedText" style={{ fontSize: 14 }}>{tier.subtext}</div>

                {tier.title === "Marketplace Tier" && (
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>
                    {renderStars(tier.stars || 0)}{" "}
                    <span style={{ color: "#6b7280", fontWeight: 700 }}>
                      {(tier.stars || 0) > 0 ? `${(tier.stars || 0).toFixed(1)} · ${marketplaceReviewCount} review${marketplaceReviewCount === 1 ? "" : "s"}` : "No ratings yet"}
                    </span>
                  </div>
                )}

                {tier.title === "Community Tier" && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>This month: {monthlyMessages} chats • {monthlyListings} listings • {monthlyPhotos} photos • {monthlyFeedback} feedback</div>
                )}
              </div>
            </div>
          ))}
        </section>

        {closestSeries.length > 0 && (
          <section className="finishPanel">
            <div className="eyebrow">🏆 Closest to gold</div>
            <div className="upgradeTitle" style={{ marginBottom: 4 }}>These series are closest to complete.</div>
            <div className="mutedText" style={{ fontSize: 14 }}>Tap one to jump to it and chase those last few pieces.</div>
            <div className="finishGrid">
              {closestSeries.map((entry) => {
                const theme = getSeriesProgressTheme(entry.percent);
                return (
                  <button key={entry.series} type="button" className="finishCard" onClick={() => jumpToSeries(entry.series)} style={{ borderColor: theme.border, boxShadow: theme.glow }}>
                    <div style={{ color: theme.text, fontWeight: 1000, marginBottom: 5 }}>{theme.icon} {entry.series}</div>
                    <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13, marginBottom: 8 }}>{entry.owned}/{entry.total} collected • {entry.remaining} left</div>
                    <div style={{ height: 9, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                      <div style={{ width: `${entry.percent}%`, height: "100%", background: theme.fill }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {username && (
          <section className="panel">
            <div className="publicProfileRow">
              <div>
                <div style={{ fontWeight: 1000, marginBottom: 6 }}>Public Collector Page</div>
                <div className="mutedText" style={{ fontSize: 13 }}>
                  Your current visibility: <strong>{getVisibilityLabel()}</strong><br />
                  Public link: <Link href={`/collector/${username}`} style={{ color: "#4f46e5", fontWeight: 900, textDecoration: "underline", textUnderlineOffset: 3 }}>/collector/{username}</Link>
                </div>
                {shareStatus && <div className="copyStatus">{shareStatus}</div>}
              </div>

              <div className="publicProfileActions">
                <Link href={`/collector/${username}`} className="primaryButton">View Profile</Link>
                <button type="button" onClick={() => void sharePublicProfile()} className="primaryButton">Share 🔗</button>
              </div>
            </div>
          </section>
        )}

        <section className="panel">
          <div style={{ fontWeight: 1000, marginBottom: 10 }}>Collection Visibility</div>
          <div className="visibilityButtons">
            {[
              { value: "private", label: "Private 🔒" },
              { value: "extras_only", label: "Wishlist + Extras 💜" },
              { value: "full", label: "Full Collection 🌟" },
            ].map((option) => (
              <button key={option.value} type="button" onClick={() => void saveVisibility(option.value as Visibility)} disabled={savingVisibility} className={`chipButton ${visibility === option.value ? "active" : ""}`} style={{ opacity: savingVisibility ? 0.7 : 1 }}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="mutedText" style={{ marginTop: 8, fontSize: 13 }}>Control what other collectors can see on your public profile.</div>
        </section>

        {publicCollectors.length > 0 && (
          <section className="panel">
            <div style={{ fontSize: 18, fontWeight: 1000, marginBottom: 12 }}>Public Collectors Spotlight ✨</div>
            <div className="spotlightGrid">
              {publicCollectors.map((collector) => (
                <Link key={collector.id} href={`/collector/${collector.username}`} className="spotlightCard">
                  <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 6 }}>@{collector.username}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{collector.collection_visibility === "full" ? "Full collection open" : "Wishlist + extras open"}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="autoSellCard">
          <div>
            <div className="eyebrow">Marketplace Shortcut</div>
            <div className="autoSellTitle">Auto-list your extras 💸</div>
            <div className="mutedText" style={{ fontSize: 14 }}>
              You currently have <strong>{extrasCount}</strong> extra Doorable{extrasCount === 1 ? "" : "s"}.
              Review your extras first, add prices, and choose exactly which ones become Marketplace listings.
            </div>
          </div>
          <button type="button" className="primaryButton" onClick={openAutoSellModal} disabled={autoSellLoading || extrasCount <= 0}>
            {autoSellLoading ? "Listing extras..." : extrasCount > 0 ? `Review ${extrasCount} Extra${extrasCount === 1 ? "" : "s"}` : "No Extras Yet"}
          </button>
        </section>

        <section className="statsGrid">
          {[
            { label: "Total", value: totalCount, action: "all" },
            { label: "Owned", value: ownedCount, action: "have" },
            { label: "Chase / Need", value: needCount, action: "need" },
            { label: "Extras", value: extrasCount, action: "extra" },
          ].map((stat) => (
            <button key={stat.label} type="button" className="statCard" onClick={() => { setCollectionFilter(stat.action); document.getElementById("cards-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <div className="statLabel">{stat.label}</div>
              <div className="statValue">{stat.value}</div>
            </button>
          ))}
        </section>

        <section className="panel">
          <div className="filterHeader">
            <div>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>Find Doorables</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                Showing {pagedCards.length} of {filteredCards.length}
                {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
                {collectionViewMode === "list" ? " • List view" : " • Card view"}
              </div>
            </div>

            <div className="filterHeaderActions">
              <div className="viewModeToggle" aria-label="Collection view mode">
                <button type="button" className={`viewModeButton ${collectionViewMode === "cards" ? "active" : ""}`} onClick={() => { viewModeTouchedRef.current = true; setCollectionViewMode("cards"); }}>Cards</button>
                <button type="button" className={`viewModeButton ${collectionViewMode === "list" ? "active" : ""}`} onClick={() => { viewModeTouchedRef.current = true; setCollectionViewMode("list"); }}>List</button>
              </div>

              <button type="button" className="filterToggleButton" onClick={() => setShowMobileFilters((prev) => !prev)}>{showMobileFilters ? "Hide Filters" : "Filters"}</button>
            </div>
          </div>

          <div className="quickMobileChips">
            {[
              { value: "all", label: "All" },
              { value: "have", label: "Have" },
              { value: "need", label: "Chase" },
              { value: "extra", label: "Extras" },
            ].map((option) => (
              <button key={option.value} type="button" className={`chipButton ${collectionFilter === option.value ? "active" : ""}`} onClick={() => setCollectionFilter(option.value)}>{option.label}</button>
            ))}
            {activeFilterCount > 0 && <button type="button" className="chipButton" onClick={clearFilters}>Clear</button>}
          </div>

          <div className={`filterBody ${showMobileFilters || !isMobile ? "open" : ""}`}>
            <div className="filterWrap">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, series, rarity, movie, notes..." className="searchBox" />

              <div className="chipWrap">
                {[
                  { value: "all", label: "All" },
                  { value: "have", label: "Have" },
                  { value: "need", label: "Chase / Need" },
                  { value: "extra", label: "+Extra" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setCollectionFilter(option.value)} className={`chipButton ${collectionFilter === option.value ? "active" : ""}`}>{option.label}</button>
                ))}
              </div>

              <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} className="mobileSelect">
                {seriesOptions.map((series) => <option key={series} value={series}>{series === "all" ? "All Series" : series}</option>)}
              </select>

              <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="mobileSelect">
                {subcategoryOptions.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory === "all" ? "All Subcategories" : subcategory}</option>)}
              </select>

              <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} className="mobileSelect">
                {movieOptions.map((movie) => <option key={movie} value={movie}>{movie === "all" ? "All Movies" : movie}</option>)}
              </select>

              <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="mobileSelect">
                {rarityOptions.map((rarity) => <option key={rarity} value={rarity}>{rarity === "all" ? "All Rarities" : rarity}</option>)}
              </select>

              {activeFilterCount > 0 && <button type="button" className="secondaryButton" onClick={clearFilters}>Clear Filters</button>}
            </div>
          </div>
        </section>

        <section className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: showSeriesProgress ? 12 : 0, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>Series Progress</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3, fontWeight: 700 }}>{seriesProgress.length} series tracked • colors slowly shift as progress grows • complete series turn gold</div>
            </div>
            <button type="button" className="secondaryButton" onClick={() => setShowSeriesProgress((prev) => !prev)}>{showSeriesProgress ? "Hide Series" : "Show Series"}</button>
          </div>

          {showSeriesProgress && (
            <>
              <div className="seriesProgressGrid" style={{ marginTop: 12 }}>
                {visibleSeriesProgress.map((entry) => {
                  const theme = getSeriesProgressTheme(entry.percent);
                  return (
                    <button key={entry.series} onClick={() => jumpToSeries(entry.series)} className="seriesProgressButton" style={{ background: theme.background, borderColor: theme.border, boxShadow: theme.glow }}>
                      <div className="seriesTitle" style={{ color: theme.text }}>{theme.icon} {entry.series}</div>
                      {entry.subcategoryLabel ? <div className="seriesSubtitle">{entry.subcategoryLabel}</div> : entry.isMissingSeries ? <div className="seriesSubtitle">Series field is blank in Supabase — using this group name for now.</div> : null}
                      <div className="seriesMeta">{entry.owned}/{entry.total} collected • {entry.percent}% • {entry.remaining} left</div>
                      <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{ width: `${entry.percent}%`, height: "100%", background: theme.fill }} />
                      </div>
                      <div className="seriesHook" style={{ color: theme.text, background: entry.percent >= 100 ? "rgba(245,158,11,0.14)" : "rgba(79,70,229,0.10)" }}>
                        {theme.label}: {getSeriesHook(entry)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isMobile && seriesProgress.length > 8 && (
                <button type="button" className="secondaryButton" style={{ width: "100%", marginTop: 12 }} onClick={() => setExpandedSeries((prev) => !prev)}>
                  {expandedSeries ? "Show fewer series" : `Show all ${seriesProgress.length} series`}
                </button>
              )}
            </>
          )}
        </section>

        <section id="cards-grid" className={collectionViewMode === "list" ? "cardsList" : "cardsGrid"}>
          {pagedCards.map((item, index) => {
            const rarity = rarityTheme(item.rarity);
            const subtleOverlay = item.qty > 0 ? "linear-gradient(rgba(34,197,94,0.08), rgba(34,197,94,0.08))" : "linear-gradient(rgba(168,85,247,0.08), rgba(168,85,247,0.08))";
            const statusText = collectionStatus(item.qty);
            const photoOpen = expandedPhotoCardId === item.id;
            const canAdd = isSubscribed || item.qty > 0 || ownedCount < FREE_LIMIT;

            if (collectionViewMode === "list") {
              return (
                <div key={item.id} className="listCard" style={{ borderLeft: `6px solid ${rarity.border}` }}>
                  <div className="listThumb">
                    {item.image ? <img src={item.image} alt={item.name} loading={index < 6 ? "eager" : "lazy"} decoding="async" /> : <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>No Image</div>}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="listTopRow">
                      <div>
                        <div className="listName">{item.name}</div>
                        <div className="listMeta">{item.series || "Series not set"}{item.subcategory ? ` • ${item.subcategory}` : ""}{item.movie ? ` • ${item.movie}` : ""}</div>
                      </div>
                      <div className="rarityBadge" style={{ background: rarity.badgeBg, color: rarity.badgeText }}>{item.rarity}</div>
                    </div>

                    {!canAdd && <div className="limitBox" style={{ marginTop: 6 }}>Free limit reached. Upgrade to add more.</div>}

                    <div className="statusText" style={{ color: statusText === "Need" ? "#7c3aed" : statusText === "Extra" ? "#2563eb" : "#166534", marginTop: 6 }}>
                      {savingId === item.id ? "Saving..." : statusText === "Need" ? "Chase / Need" : statusText}
                    </div>

                    <div className="listControls">
                      <div className="listQtyControls">
                        <button type="button" onClick={() => void saveCard(item, item.qty - 1, item.note)} disabled={savingId === item.id} className="listQtyButton" aria-label={`Decrease quantity for ${item.name}`}><span aria-hidden="true">-</span></button>
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={(e) => {
                            const nextQty = Math.max(0, Number(e.target.value || 0));
                            setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, qty: nextQty } : c)));
                          }}
                          onBlur={(e) => void saveCard(item, Math.max(0, Number(e.target.value || 0)), item.note)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          className="listQtyInput"
                          aria-label={`Quantity owned for ${item.name}`}
                        />
                        <button type="button" onClick={() => void saveCard(item, item.qty + 1, item.note)} disabled={savingId === item.id || !canAdd} className="listQtyButton" aria-label={`Increase quantity for ${item.name}`} style={{ opacity: !canAdd ? 0.45 : 1, cursor: !canAdd ? "not-allowed" : "pointer" }}><span aria-hidden="true">+</span></button>
                      </div>

                      <input value={item.note} onChange={(e) => setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, note: e.target.value } : c)))} placeholder="Note..." className="listNoteInput" />
                      <button type="button" onClick={() => void saveCard(item, item.qty, item.note)} disabled={savingId === item.id} className="smallButton saveButton">{savingId === item.id ? "Saving..." : "Save"}</button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="card" style={{ background: `${subtleOverlay}, ${rarity.bg}`, color: rarity.text, borderColor: rarity.border, boxShadow: `0 12px 28px rgba(0,0,0,0.14), 0 0 18px ${rarity.glow}` }}>
                <div className="cardImageBox">
                  {item.image ? <img src={item.image} alt={item.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" /> : <div>No Image</div>}
                </div>

                <div>
                  <div className="cardName">{item.name}</div>
                  <div className="cardMeta">{item.series || "Series not set"}{item.subcategory ? ` • ${item.subcategory}` : ""}{item.movie ? ` • ${item.movie}` : ""}</div>
                </div>

                <div className="rarityBadge" style={{ background: rarity.badgeBg, color: rarity.badgeText }}>{item.rarity}</div>
                {!canAdd && <div className="limitBox">Free limit reached. Upgrade to add more.</div>}

                <div className="qtyRow">
                  <button type="button" onClick={() => void saveCard(item, item.qty - 1, item.note)} disabled={savingId === item.id} className="qtyButton" aria-label={`Decrease quantity for ${item.name}`}><span aria-hidden="true">-</span></button>
                  <input
                    type="number"
                    min="0"
                    value={item.qty}
                    onChange={(e) => {
                      const nextQty = Math.max(0, Number(e.target.value || 0));
                      setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, qty: nextQty } : c)));
                    }}
                    onBlur={(e) => void saveCard(item, Math.max(0, Number(e.target.value || 0)), item.note)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="qtyInput"
                    aria-label={`Quantity owned for ${item.name}`}
                  />
                  <button type="button" onClick={() => void saveCard(item, item.qty + 1, item.note)} disabled={savingId === item.id || !canAdd} className="qtyButton" aria-label={`Increase quantity for ${item.name}`} style={{ opacity: !canAdd ? 0.45 : 1, cursor: !canAdd ? "not-allowed" : "pointer" }}><span aria-hidden="true">+</span></button>
                </div>

                <div className="statusText" style={{ color: statusText === "Need" ? "#7c3aed" : statusText === "Extra" ? "#2563eb" : "#166534" }}>
                  {savingId === item.id ? "Saving..." : statusText === "Need" ? "Chase / Need" : statusText}
                </div>

                {isMobile ? (
                  <input value={item.note} onChange={(e) => setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, note: e.target.value } : c)))} placeholder="Note..." className="noteInput" />
                ) : (
                  <textarea value={item.note} onChange={(e) => setCards((prev) => prev.map((c) => (c.id === item.id ? { ...c, note: e.target.value } : c)))} placeholder="Notes..." className="noteInput" style={{ minHeight: 70 }} />
                )}

                <div className="cardButtonRow">
                  <button type="button" onClick={() => void saveCard(item, item.qty, item.note)} disabled={savingId === item.id} className="smallButton saveButton">{savingId === item.id ? "Saving..." : "Save"}</button>
                  <button type="button" className="smallButton photoButton" onClick={() => setExpandedPhotoCardId(photoOpen ? "" : item.id)}>{photoOpen ? "Hide" : "Photo"}</button>
                </div>

                {photoOpen && (
                  <div className="photoBox">
                    <textarea value={photoNote[item.id] || ""} onChange={(e) => setPhotoNote((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Optional image note..." className="noteInput" style={{ minHeight: 52, marginBottom: 8 }} />
                    <input type="file" accept="image/*" onChange={(e) => void handlePhotoSubmission(item, e.target.files?.[0] ?? null)} disabled={uploadingPhotoId === item.id} style={{ width: "100%" }} />
                    <div style={{ marginTop: 6, fontSize: 11, color: "#4b5563" }}>{uploadingPhotoId === item.id ? "Submitting..." : "Sent for review."}</div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {totalPages > 1 && (
          <div className="pager">
            <button type="button" className="pagerButton" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
            <div style={{ fontWeight: 900 }}>Page {safePage} of {totalPages}</div>
            <button type="button" className="pagerButton" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button>
          </div>
        )}

        {!isSubscribed && (
          <div className="mobileSticky">
            <div>
              <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 1000, marginBottom: 7 }}>{ownedCount}/{FREE_LIMIT} free saves used</div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${freeSavePercent}%`, background: freeSavePercent >= 80 ? "linear-gradient(90deg,#f97316,#f59e0b)" : undefined }} />
              </div>
            </div>
            <Link href="/pricing" className="secondaryButton">Upgrade</Link>
          </div>
        )}

        {showAutoSellModal && (
          <div className="modalOverlay">
            <div className="modal">
              <button type="button" className="modalClose" onClick={() => setShowAutoSellModal(false)}>×</button>
              <h2 style={{ marginTop: 0, fontSize: "clamp(1.7rem, 5vw, 2.4rem)", lineHeight: 1, fontWeight: 1000 }}>Choose extras to list</h2>
              <div className="mutedText">Check the extras you want to post, add a price, and keep the description short.</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" className="secondaryButton" onClick={() => setAllAutoSellDraftsSelected(true)}>Select All</button>
                <button type="button" className="secondaryButton" onClick={() => setAllAutoSellDraftsSelected(false)}>Deselect All</button>
              </div>

              <div className="autoSellList">
                {autoSellDrafts.map((draft) => (
                  <div key={draft.cardId} className="autoSellItem">
                    <label style={{ display: "grid", gap: 4, justifyItems: "center", fontWeight: 1000, fontSize: 12 }}>
                      <input type="checkbox" checked={draft.selected} onChange={(e) => updateAutoSellDraft(draft.cardId, { selected: e.target.checked })} />
                      {draft.selected ? "List" : "Skip"}
                    </label>
                    <input className="autoSellInput" value={draft.title} onChange={(e) => updateAutoSellDraft(draft.cardId, { title: e.target.value })} placeholder="Listing title" />
                    <input className="autoSellInput" value={draft.price} onChange={(e) => updateAutoSellDraft(draft.cardId, { price: e.target.value })} placeholder="Price" inputMode="decimal" />
                    <textarea className="autoSellInput" value={draft.description} onChange={(e) => updateAutoSellDraft(draft.cardId, { description: e.target.value })} placeholder="Description" style={{ gridColumn: "1 / -1", minHeight: 62 }} />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", marginTop: 14 }}>
                <div style={{ color: "#475569", fontWeight: 900 }}>{autoSellStats.selected} selected</div>
                <button type="button" className="secondaryButton" onClick={() => setShowAutoSellModal(false)} disabled={autoSellLoading}>Cancel</button>
                <button type="button" className="primaryButton" onClick={() => void handleAutoSellExtras()} disabled={autoSellLoading || autoSellStats.selected <= 0}>
                  {autoSellLoading ? "Creating..." : "Create Listings 💜"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showUpgradeModal && (
          <div className="modalOverlay">
            <div className="modal" style={{ textAlign: "center", width: "min(540px, 100%)" }}>
              <button type="button" className="modalClose" onClick={() => setShowUpgradeModal(false)}>×</button>
              <div style={{ width: 64, height: 64, margin: "0 auto 12px", borderRadius: 22, display: "grid", placeItems: "center", fontSize: 31, background: "linear-gradient(135deg, #ddd6fe, #bfdbfe)" }}>💜</div>
              <h2 style={{ margin: 0, fontSize: "clamp(1.8rem, 6vw, 2.6rem)", lineHeight: 1, letterSpacing: -1, fontWeight: 1000 }}>Your free vault is full</h2>
              <div className="mutedText" style={{ marginTop: 13 }}>Free accounts can save up to {FREE_LIMIT} Doorables. Upgrade for unlimited tracking, marketplace tools, selling extras, and full collector access.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
                <div className="miniPlan"><span>Monthly</span><strong>$3</strong></div>
                <div className="miniPlan best"><span>Best Value</span><strong>$15</strong></div>
              </div>
              <Link href="/pricing" className="primaryButton" style={{ marginTop: 18, width: "100%" }}>Upgrade for Full Access</Link>
              <button type="button" className="secondaryButton" style={{ marginTop: 10, width: "100%" }} onClick={() => setShowUpgradeModal(false)}>Maybe later</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = `
.collectionPage,.guestCollectionPage{min-height:100vh;padding:24px;color:#fff;background:radial-gradient(circle at 20% 20%,rgba(168,85,247,.3),transparent 22%),radial-gradient(circle at 80% 10%,rgba(59,130,246,.26),transparent 22%),linear-gradient(180deg,#09090f,#111827 45%,#020617)}
.shell,.guestShell{max-width:1500px;margin:0 auto;position:relative;z-index:1;display:grid;gap:16px}
.loadingPage{min-height:100vh;display:grid;place-items:center;padding:20px;color:#fff;background:radial-gradient(circle at top,#312e81,#0f172a 45%,#020617)}
.loadingCard{width:min(520px,100%);border-radius:28px;padding:28px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center}
.loadingIcon{width:64px;height:64px;display:grid;place-items:center;margin:0 auto 12px;border-radius:22px;background:linear-gradient(135deg,#a855f7,#60a5fa);font-size:30px}
.statusStack{position:sticky;top:8px;z-index:60;display:grid;gap:8px}.notice,.error{border-radius:18px;padding:12px 14px;font-weight:900;box-shadow:0 12px 26px rgba(0,0,0,.2)}.notice{background:#ecfdf5;color:#065f46;border:1px solid #bbf7d0}.error{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}
.hero,.guestHero{background:radial-gradient(circle at top right,rgba(255,255,255,.14),transparent 30%),linear-gradient(135deg,rgba(17,24,39,.92),rgba(67,56,202,.88));border-radius:28px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08)}
.heroTop,.publicProfileRow,.autoSellCard,.upgradeWall{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;align-items:center}
.heroTitle,.guestTitle{margin:0;font-size:clamp(2rem,5vw,3.1rem);font-weight:1000;letter-spacing:-1px;line-height:1}.heroSubtitle,.guestText{margin-top:8px;opacity:.92;font-size:16px;font-weight:750;max-width:780px;line-height:1.5}
.heroProgress{min-width:250px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;max-width:320px}.progressTrack{height:10px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}.progressFill{height:100%;background:linear-gradient(90deg,#60a5fa,#c084fc)}
.upgradeBox,.panel,.tierCard,.statCard,.autoSellCard,.finishPanel,.upgradeWall,.hookTile{background:rgba(255,255,255,.94);color:#111827;box-shadow:0 10px 24px rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.35);border-radius:24px;padding:16px}.upgradeBox{margin-top:12px;border-radius:18px}
.primaryButton,.secondaryButton,.guestButton{min-height:46px;border-radius:14px;padding:12px 16px;font-weight:1000;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-family:inherit}.primaryButton,.guestButton.primary{background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff!important;box-shadow:0 14px 26px rgba(79,70,229,.26)}.secondaryButton,.guestButton.secondary{background:#eef2ff;color:#3730a3!important;border:1px solid #c7d2fe}
.hookPanel{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hookTitle{font-size:20px;line-height:1.08;font-weight:1000;color:#312e81;margin-bottom:7px}.hookText,.mutedText{color:#4b5563;line-height:1.6;font-size:15px}.hookTile.primary{background:radial-gradient(circle at top right,rgba(244,114,182,.22),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.99),rgba(245,243,255,.96));border-color:rgba(216,180,254,.8)}
.eyebrow{color:#6d28d9;font-size:13px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}.upgradeTitle{font-size:clamp(1.35rem,3vw,2rem);font-weight:1000;letter-spacing:-.6px;line-height:1.1;margin-bottom:8px}.planRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.miniPlan{border-radius:17px;padding:11px 13px;background:#f8fafc;border:1px solid #e5e7eb;min-width:130px}.miniPlan.best{background:linear-gradient(135deg,#f5f3ff,#eff6ff);border-color:#a78bfa}.miniPlan span{display:block;color:#64748b;font-size:12px;font-weight:900;margin-bottom:4px}.miniPlan strong{color:#312e81;font-size:20px;font-weight:1000}
.tierGrid,.statsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.tierGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.tierCard{position:relative;overflow:hidden}.tierAccent{position:absolute;inset:0 auto 0 0;width:8px;border-radius:22px 0 0 22px}.statCard{cursor:pointer;text-align:left}.statLabel{font-size:14px;color:#6b7280;margin-bottom:6px}.statValue{font-size:30px;font-weight:1000}
.finishPanel{background:radial-gradient(circle at top right,rgba(250,204,21,.28),transparent 32%),linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,252,.96))}.finishGrid,.seriesProgressGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.finishCard,.seriesProgressButton{border-radius:18px;padding:13px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 8px 18px rgba(15,23,42,.08);text-align:left;cursor:pointer}
.visibilityButtons,.chipWrap,.filterWrap,.publicProfileActions,.filterHeaderActions,.quickMobileChips{display:flex;gap:8px;flex-wrap:wrap}.chipButton{min-height:42px;border:none;border-radius:999px;padding:10px 14px;font-weight:900;background:#eef2ff;color:#3730a3;cursor:pointer;font-family:inherit}.chipButton.active{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}.copyStatus{margin-top:8px;display:inline-flex;padding:8px 10px;border-radius:999px;background:#ecfdf5;color:#065f46;border:1px solid #bbf7d0;font-size:12px;font-weight:900}
.spotlightGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.spotlightCard{display:block;text-decoration:none;background:#fff;color:#111827;border-radius:18px;padding:14px;border:1px solid #e5e7eb;box-shadow:0 8px 18px rgba(0,0,0,.1)}
.filterHeader{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.viewModeToggle{display:inline-flex;align-items:center;gap:6px;padding:6px;border-radius:14px;background:#eef2ff;border:1px solid #c7d2fe}.viewModeButton{min-height:38px;border:none;border-radius:10px;padding:8px 12px;background:transparent;color:#3730a3;font-weight:950;cursor:pointer}.viewModeButton.active{background:#4f46e5;color:#fff}.filterToggleButton,.quickMobileChips{display:none}.filterBody{margin-top:12px}.searchBox,.mobileSelect{padding:14px;border-radius:14px;border:1px solid #d1d5db;font-size:15px;background:#fff;box-sizing:border-box}.searchBox{flex:1 1 280px;min-width:280px}.mobileSelect{min-width:180px}
.seriesTitle{font-size:16px;line-height:1.18;font-weight:1000;word-break:break-word}.seriesSubtitle{color:#64748b;font-size:12px;line-height:1.35;font-weight:820}.seriesMeta{color:#475569;font-size:14px;font-weight:900}.seriesHook{font-size:12px;line-height:1.35;font-weight:900;border-radius:999px;padding:6px 9px;width:fit-content}
.cardsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.cardsList{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px;align-items:start}.card{display:grid;gap:10px;border-radius:22px;padding:12px;border:4px solid #cbd5e1;box-shadow:0 12px 28px rgba(0,0,0,.14);min-width:0}.cardImageBox{height:180px;background:rgba(255,255,255,.95);border-radius:18px;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:10px}.cardImageBox img,.listThumb img{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;display:block;transition:transform .22s ease}.cardName{font-size:19px;font-weight:1000;line-height:1.1;word-break:break-word}.cardMeta{opacity:.82;font-size:13px;line-height:1.35}.rarityBadge{width:fit-content;max-width:100%;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qtyRow{display:grid;grid-template-columns:46px 1fr 46px;gap:8px;align-items:center}.qtyButton{width:46px;height:46px;border-radius:14px;font-size:28px;line-height:1;font-weight:1000;border:1px solid rgba(15,23,42,.16);background:rgba(255,255,255,.96);color:#111827!important;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif}.qtyValue{text-align:center;font-weight:1000;font-size:22px}.qtyInput{text-align:center;font-weight:1000;font-size:20px;width:100%;min-width:0;height:46px;border-radius:14px;border:1px solid rgba(15,23,42,.16);background:rgba(255,255,255,.92);color:#111827;box-sizing:border-box}.statusText{font-size:13px;font-weight:1000}.noteInput{width:100%;min-height:42px;border-radius:12px;border:1px solid rgba(15,23,42,.2);background:rgba(255,255,255,.88);padding:9px 10px;color:#111827;box-sizing:border-box;font-size:13px;font-family:inherit}.cardButtonRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}.smallButton{min-height:40px;border:none;border-radius:12px;padding:8px 9px;font-size:12px;font-weight:1000;cursor:pointer}.saveButton{background:#4f46e5;color:#fff}.photoButton{background:rgba(255,255,255,.75);color:#111827;border:1px solid rgba(15,23,42,.14)}.photoBox{padding:10px;border-radius:12px;background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.6)}.limitBox{padding:9px;border-radius:12px;background:#fff1f2;color:#9f1239;font-weight:900;font-size:12px;line-height:1.35}
.listCard{display:grid;grid-template-columns:68px minmax(0,1fr);gap:10px;align-items:start;border-radius:18px;padding:10px;background:rgba(255,255,255,.96);color:#111827;border:1px solid rgba(255,255,255,.35);box-shadow:0 8px 18px rgba(0,0,0,.14);min-width:0}.listThumb{width:68px;height:68px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:6px;box-sizing:border-box}.listTopRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start}.listName{font-size:15px;font-weight:1000;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.listMeta{color:#64748b;font-size:11.5px;font-weight:800;margin-top:3px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.listControls{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;margin-top:8px}.listQtyControls{display:inline-flex;align-items:center;gap:7px}.listQtyButton{width:34px;height:34px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#111827!important;font-size:24px;line-height:1;font-weight:1000;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif}.listQtyInput{text-align:center;font-weight:1000;font-size:15px;width:54px;height:34px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#111827;box-sizing:border-box}.listNoteInput,.autoSellInput{min-height:36px;width:100%;box-sizing:border-box;border-radius:11px;border:1px solid #d1d5db;padding:8px 10px;color:#111827;background:#fff;font-family:inherit;font-size:13px}
.pager{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:18px}.pagerButton{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;font-weight:800;cursor:pointer}.pagerButton:disabled{opacity:.45;cursor:not-allowed}.mobileSticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:80;display:none;grid-template-columns:1fr auto;gap:11px;align-items:center;padding:11px;border-radius:22px;background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);box-shadow:0 18px 40px rgba(0,0,0,.36)}
.modalOverlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(2,6,23,.72);backdrop-filter:blur(10px)}.modal{position:relative;width:min(760px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:30px;padding:24px;color:#111827;background:radial-gradient(circle at top right,rgba(196,181,253,.55),transparent 32%),linear-gradient(180deg,#fff,#f8fafc);border:1px solid rgba(255,255,255,.75);box-shadow:0 28px 80px rgba(0,0,0,.42)}.modalClose{position:absolute;right:14px;top:12px;width:38px;height:38px;border-radius:999px;border:none;background:#eef2ff;color:#312e81;font-size:25px;font-weight:900;cursor:pointer}.autoSellList{display:grid;gap:10px;margin-top:12px}.autoSellItem{display:grid;grid-template-columns:auto 1fr 110px;gap:8px;align-items:center;padding:10px;border-radius:16px;border:1px solid #e5e7eb;background:#fff}
.guestBadge{display:inline-flex;width:fit-content;align-items:center;gap:8px;padding:9px 13px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);color:#fde68a;font-weight:1000;font-size:13px;margin-bottom:14px}.guestHero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:18px;align-items:center}.guestPills{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.guestPill{border-radius:999px;padding:8px 11px;background:rgba(15,23,42,.55);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.94);font-size:12px;font-weight:1000}.guestActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.guestPreviewCard{border-radius:28px;padding:18px;background:radial-gradient(circle at top right,rgba(250,204,21,.18),transparent 34%),linear-gradient(135deg,rgba(15,23,42,.72),rgba(79,70,229,.55));border:1px solid rgba(255,255,255,.15);display:grid;gap:12px}.mockSearch{border-radius:17px;min-height:48px;padding:12px 14px;display:flex;align-items:center;color:rgba(255,255,255,.78);background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-weight:900}.guestStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.guestStat{border-radius:18px;min-height:74px;padding:12px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.14)}.guestStat strong{display:block;font-size:25px;line-height:1;margin-bottom:6px}.guestStat span{display:block;color:rgba(255,255,255,.76);font-size:11px;font-weight:900;line-height:1.25}.mockList{display:grid;gap:9px}.mockRow{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:10px;align-items:center;border-radius:18px;padding:10px;background:rgba(255,255,255,.92);color:#111827;border:1px solid rgba(255,255,255,.22)}.mockThumb{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#ede9fe,#bfdbfe);font-size:26px}.mockName{font-weight:1000;line-height:1.1;margin-bottom:3px}.mockMeta{font-size:12px;color:#64748b;font-weight:850}.mockQty{min-width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;background:#4f46e5;font-weight:1000}.guestGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.guestFeature{min-height:200px;border-radius:24px;padding:18px;color:#fff!important;text-decoration:none!important;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 34px rgba(0,0,0,.24)}.guestIcon{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#fef3c7,#ede9fe);color:#312e81;font-size:28px;line-height:1;margin-bottom:12px}.guestFeatureTitle{color:#fde68a;font-size:17px;line-height:1.12;font-weight:1000;margin-bottom:8px}.guestFeatureText{color:rgba(255,255,255,.82);line-height:1.5;font-size:14px;font-weight:800}.guestSoftCard{border-radius:28px;padding:22px;color:#111827;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,252,.96));border:1px solid rgba(255,255,255,.64);box-shadow:0 20px 44px rgba(0,0,0,.26);display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}.guestSoftTitle{color:#312e81;font-size:22px;line-height:1.1;font-weight:1000;margin-bottom:6px}.guestSoftText{color:#475569;line-height:1.55;font-size:14px;font-weight:820}
@media (hover:hover) and (pointer:fine){.cardImageBox:hover img,.listThumb:hover img{transform:scale(1.08)}}
@media (max-width:1200px){.cardsGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.hookPanel{grid-template-columns:1fr}}
@media (max-width:920px){.collectionPage,.guestCollectionPage{padding:11px;padding-bottom:104px}.hero,.guestHero{border-radius:22px;padding:15px}.heroTop,.publicProfileRow,.autoSellCard,.upgradeWall{display:grid}.heroTitle,.guestTitle{font-size:clamp(1.85rem,10vw,2.55rem)}.heroSubtitle,.guestText{font-size:13px;line-height:1.42}.heroProgress{width:100%;max-width:none;min-width:0;box-sizing:border-box;padding:13px;border-radius:18px}.hookTile,.panel,.finishPanel{border-radius:20px;padding:14px}.tierGrid{grid-template-columns:repeat(3,minmax(220px,1fr));overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory;scrollbar-width:none}.tierGrid::-webkit-scrollbar{display:none}.tierCard{scroll-snap-align:start}.finishGrid,.seriesProgressGrid{grid-template-columns:1fr}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.publicProfileActions{display:grid;grid-template-columns:1fr 1fr;width:100%}.visibilityButtons{display:grid;grid-template-columns:1fr}.spotlightGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.filterHeader{grid-template-columns:1fr}.filterHeaderActions{justify-content:stretch;width:100%}.viewModeToggle{width:100%;box-sizing:border-box}.viewModeButton{flex:1}.filterToggleButton{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:50px;border:none;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:950;cursor:pointer;font-family:inherit}.quickMobileChips{display:flex;margin-top:12px;overflow-x:auto}.filterBody{display:none}.filterBody.open{display:block}.filterWrap{flex-direction:column;align-items:stretch}.chipWrap{width:100%}.chipButton{flex:1 1 calc(50% - 8px)}.searchBox,.mobileSelect{width:100%;min-width:0}.cardsGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cardsList{grid-template-columns:1fr;gap:10px}.card{border-radius:18px;padding:9px;border-width:3px;gap:8px}.cardImageBox{height:112px;border-radius:15px;padding:8px}.cardName{font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cardMeta{font-size:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rarityBadge{font-size:10px;padding:5px 8px}.qtyRow{grid-template-columns:36px 1fr 36px;gap:6px}.qtyButton{width:36px;height:36px;border-radius:12px;font-size:24px;color:#111827!important}.qtyValue{font-size:19px}.qtyInput{height:36px;border-radius:12px;font-size:17px}.noteInput{min-height:38px;font-size:12px;padding:8px 9px}.smallButton{min-height:38px;font-size:12px}.listCard{grid-template-columns:64px minmax(0,1fr);gap:10px;padding:9px;border-radius:16px}.listThumb{width:64px;height:64px}.listControls{grid-template-columns:auto minmax(0,1fr)}.listControls .smallButton{grid-column:1/-1;width:100%}.mobileSticky{display:grid}.modal{border-radius:24px;padding:18px}.autoSellItem{grid-template-columns:auto 1fr}.autoSellItem .autoSellInput:last-child{grid-column:1/-1}.guestHero{grid-template-columns:1fr}.guestStats{grid-template-columns:repeat(2,minmax(0,1fr))}.guestGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.guestFeature{min-height:0;aspect-ratio:1/1;border-radius:20px;padding:12px;display:flex;flex-direction:column;justify-content:space-between}.guestFeatureText{display:none}.guestSoftCard{grid-template-columns:1fr}}
@media (max-width:420px){.spotlightGrid{grid-template-columns:1fr}.publicProfileActions{grid-template-columns:1fr}.cardImageBox{height:98px}.cardName{font-size:13px}.cardMeta{font-size:10.5px}.mobileSticky{grid-template-columns:1fr}.guestActions{grid-template-columns:1fr}}
@media (max-width:360px){.cardsGrid{grid-template-columns:1fr}.cardImageBox{height:140px}}
`;
