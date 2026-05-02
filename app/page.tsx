"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
};

type HomeStats = {
  owned: number;
  needed: number;
  extras: number;
  total: number;
  progress: number;
  listings: number;
};

type PlanKey = "monthly" | "yearly" | "founding";

const ADMIN_EMAILS = ["riffeljosh80@gmail.com"];
const FREE_LIMIT = 50;

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("This Week’s Updates");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [stats, setStats] = useState<HomeStats>({
    owned: 0,
    needed: 0,
    extras: 0,
    total: 0,
    progress: 0,
    listings: 0,
  });

  const isAdmin = useMemo(
    () => ADMIN_EMAILS.includes(userEmail.toLowerCase()),
    [userEmail]
  );

  useEffect(() => {
    document.title =
      "Adorable Vault | Doorables Collection Tracker, Checklist & Marketplace";

    const description =
      "Adorable Vault helps Doorables collectors track owned figures, wishlist items, extras, series progress, and marketplace listings in one easy collector vault.";

    function setMeta(name: string, content: string) {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    }

    function setProperty(property: string, content: string) {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    }

    setMeta("description", description);
    setMeta(
      "keywords",
      "Doorables tracker, Disney Doorables tracker, Doorables collection tracker, Disney Doorables collection tracker, Doorables checklist, Doorables wishlist, Doorables inventory, Doorables rarity tracker, Doorables marketplace, Doorables trading, Doorables extras, buy sell trade Doorables, Adorable Vault"
    );
    setMeta("robots", "index, follow");
    setProperty("og:title", "Adorable Vault | Doorables Collection Tracker");
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "Adorable Vault");
  }, []);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadHomeStats(userId?: string) {
    try {
      const supabase = getSupabase();

      const { data: doorables } = await supabase.from("doorables").select("id");
      const total = doorables?.length ?? 0;

      let owned = 0;
      let extras = 0;

      if (userId) {
        const { data: userRows } = await supabase
          .from("user_doorables")
          .select("doorable_id, qty_owned")
          .eq("user_id", userId);

        const ownedIds = new Set<string>();

        (userRows ?? []).forEach((row: any) => {
          const qty = Number(row?.qty_owned ?? 0);

          if (qty > 0 && row?.doorable_id) {
            ownedIds.add(String(row.doorable_id));
          }

          if (qty > 1) {
            extras += qty - 1;
          }
        });

        owned = ownedIds.size;
      }

      const { count: listingCount } = await supabase
        .from("marketplace_listings")
        .select("id", { count: "exact", head: true });

      setStats({
        owned,
        needed: Math.max(total - owned, 0),
        extras,
        total,
        progress: total ? Math.round((owned / total) * 100) : 0,
        listings: listingCount ?? 0,
      });
    } catch {
      // Optional stats should not crash the homepage.
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = String(user?.email ?? "").toLowerCase();
      setUserEmail(email);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("username, is_subscribed")
          .eq("id", user.id)
          .maybeSingle();

        setUsername(String(profile?.username ?? ""));
        setIsSubscribed(!!profile?.is_subscribed);
      }

      await loadHomeStats(user?.id);

      const { data, error } = await supabase
        .from("site_announcements")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && !String(error.message).toLowerCase().includes("no rows")) {
        setMessage(error.message);
      }

      if (data) {
        const row = data as Announcement;
        setAnnouncement(row);
        setTitle(String(row.title ?? "This Week’s Updates"));
        setBody(String(row.body ?? ""));
      }

      setLoading(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load homepage.");
      setLoading(false);
    }
  }

  async function saveAnnouncement() {
    try {
      setSaving(true);
      setMessage("");

      const supabase = getSupabase();

      const payload = {
        title: title.trim() || "This Week’s Updates",
        body,
        is_active: true,
        updated_by: userEmail || null,
        updated_at: new Date().toISOString(),
      };

      if (announcement?.id) {
        const { data, error } = await supabase
          .from("site_announcements")
          .update(payload)
          .eq("id", announcement.id)
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      } else {
        const { data, error } = await supabase
          .from("site_announcements")
          .insert([payload])
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      }

      setMessage("Announcement saved.");
      setSaving(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save announcement.");
      setSaving(false);
    }
  }

  async function handleCheckout(plan: PlanKey) {
    try {
      setCheckoutError("");
      setLoadingPlan(plan);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Something went wrong starting checkout.");
      setLoadingPlan(null);
    }
  }

  const announcementText =
    body.trim() ||
    "New collector tools, marketplace upgrades, secret promos, and smoother Doorables tracking features are coming soon 💜";

  const freeUsed = Math.min(stats.owned, FREE_LIMIT);
  const freePercent = Math.min(100, Math.round((freeUsed / FREE_LIMIT) * 100));
  const remainingFree = Math.max(0, FREE_LIMIT - freeUsed);
  const hasPersonalStats = stats.total > 0 && (stats.owned > 0 || stats.extras > 0);

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.44) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(59, 130, 246, 0.32) 0%, transparent 26%),
            radial-gradient(circle at 72% 96%, rgba(236, 72, 153, 0.26) 0%, transparent 28%),
            linear-gradient(180deg, #030712 0%, #080b1f 44%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.84) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.72) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.62) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.7;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
        }

        .shell {
          position: relative;
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 22px 112px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          min-width: 0;
        }

        .brandIcon {
          width: 64px;
          height: 64px;
          border-radius: 21px;
          display: grid;
          place-items: center;
          font-size: 35px;
          background: radial-gradient(circle at top left, #fef3c7, #a855f7 48%, #020617);
          box-shadow: 0 18px 38px rgba(168, 85, 247, 0.42);
          flex: 0 0 auto;
        }

        .brandTitle {
          display: block;
          font-size: clamp(1.6rem, 4vw, 2.45rem);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -1px;
          background: linear-gradient(90deg, #fef3c7, #f0abfc, #bfdbfe);
          -webkit-background-clip: text;
          color: transparent;
        }

        .brandSub {
          display: block;
          margin-top: 5px;
          color: #d8b4fe;
          font-weight: 950;
          font-size: 15px;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 0.95fr;
          gap: 20px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .previewPanel {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.16);
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 32%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroCard {
          padding: 32px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.25rem, 5.8vw, 4.55rem);
          line-height: 0.94;
          letter-spacing: -2px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 18px;
          color: rgba(255,255,255,0.92);
          font-size: 17px;
          line-height: 1.65;
          max-width: 720px;
        }

        .seoLine {
          margin-top: 14px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 750;
        }

        .trustRow {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 16px;
        }

        .trustPill {
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 1000;
          color: rgba(255,255,255,0.96);
          background: rgba(15,23,42,0.62);
          border: 1px solid rgba(255,255,255,0.24);
          box-shadow: 0 10px 20px rgba(0,0,0,0.18);
        }

        .previewPanel {
          padding: 18px;
          display: grid;
          align-content: stretch;
        }

        .premiumDash {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .statBubble {
          padding: 7px;
          border-radius: 31px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.04)),
            radial-gradient(circle at top, rgba(192,132,252,0.26), transparent 55%);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 16px 34px rgba(0,0,0,0.26);
        }

        .statCard {
          min-height: 148px;
          border-radius: 24px;
          padding: 16px;
          color: white !important;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow:
            0 18px 40px rgba(0,0,0,0.36),
            inset 0 1px 0 rgba(255,255,255,0.14);
          text-decoration: none !important;
          backdrop-filter: blur(12px);
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          display: block;
        }

        .statCard::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 38%),
            radial-gradient(circle at bottom right, rgba(255,255,255,0.12), transparent 42%);
          pointer-events: none;
          z-index: 0;
        }

        .statCard > * {
          position: relative;
          z-index: 1;
        }

        .statIcon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 27px;
          background: rgba(255,255,255,0.22);
          margin-bottom: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .statLabel {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          font-weight: 1000;
          color: #fef3c7 !important;
          opacity: 1;
        }

        .statValue {
          font-size: 40px;
          line-height: 0.95;
          font-weight: 1000;
          letter-spacing: -1px;
          margin: 7px 0;
          text-shadow: 0 2px 14px rgba(0,0,0,0.48);
          color: #ffffff !important;
        }

        .statSub {
          font-size: 13px;
          color: #ffffff !important;
          font-weight: 850;
        }

        .owned {
          background: linear-gradient(135deg, #7e22ce, #4c1d95);
        }

        .needed {
          background: linear-gradient(135deg, #0369a1, #1d4ed8);
        }

        .extras {
          background: linear-gradient(135deg, #92400e, #78350f);
        }

        .market {
          background: linear-gradient(135deg, #166534, #14532d);
        }

        .progressPanel {
          margin-top: 12px;
          border-radius: 24px;
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(236,72,153,0.24), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.88), rgba(15,23,42,0.95));
          border: 1px solid rgba(217,70,239,0.38);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .progressHeader {
          display: grid;
          grid-template-columns: 58px 1fr auto;
          gap: 14px;
          align-items: center;
        }

        .gem {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background: linear-gradient(135deg, #7c3aed, #22d3ee);
          box-shadow: 0 12px 24px rgba(124,58,237,0.28);
        }

        .upgradeButton {
          min-height: 52px;
          border-radius: 18px;
          padding: 13px 20px;
          text-decoration: none !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 1000;
          color: #ffffff !important;
          background: linear-gradient(90deg, #f472b6, #a855f7, #4f46e5);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow:
            0 16px 34px rgba(168,85,247,0.58),
            inset 0 1px 0 rgba(255,255,255,0.20);
          white-space: nowrap;
        }

        .premiumActivePanel {
          margin-top: 12px;
          border-radius: 24px;
          padding: 18px;
          background:
            radial-gradient(circle at 10% 20%, rgba(34,211,238,0.28), transparent 30%),
            radial-gradient(circle at 90% 0%, rgba(244,114,182,0.24), transparent 34%),
            linear-gradient(135deg, rgba(49,46,129,0.96), rgba(88,28,135,0.92));
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow:
            0 18px 40px rgba(124,58,237,0.24),
            0 0 34px rgba(34,211,238,0.14),
            inset 0 1px 0 rgba(255,255,255,0.16);
          overflow: hidden;
          position: relative;
        }

        .premiumActivePanel::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: conic-gradient(from 90deg, transparent, rgba(255,255,255,0.16), transparent);
          opacity: 0.30;
          pointer-events: none;
        }

        .premiumActiveContent {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 58px 1fr auto;
          gap: 14px;
          align-items: center;
        }

        .premiumIcon {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background: linear-gradient(135deg, #22d3ee, #a855f7, #f472b6);
          box-shadow: 0 12px 24px rgba(124,58,237,0.30);
        }

        .premiumBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 999px;
          padding: 10px 14px;
          color: #312e81;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          font-weight: 1000;
          box-shadow: 0 12px 24px rgba(255,255,255,0.14);
          white-space: nowrap;
        }

        .premiumPerks {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.14);
        }

        .premiumPerk {
          border-radius: 18px;
          padding: 12px;
          background: rgba(15,23,42,0.34);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.92);
          font-size: 13px;
          font-weight: 900;
          text-align: center;
        }

        .progressTrack {
          margin-top: 14px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.16);
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #c084fc, #f0abfc);
        }

        .quickActions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.12);
        }

        .quickAction {
          min-height: 92px;
          border-radius: 20px;
          padding: 14px;
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.15), transparent 45%),
            rgba(15,23,42,0.55);
          border: 1px solid rgba(255,255,255,0.18);
          color: #ffffff !important;
          text-decoration: none !important;
          display: grid;
          align-content: center;
          justify-items: center;
          text-align: center;
          gap: 7px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.24);
        }

        .quickAction.previewQuick {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.20), transparent 42%),
            linear-gradient(135deg, rgba(124,58,237,0.78), rgba(236,72,153,0.54));
          border-color: rgba(250,204,21,0.38);
        }

        .quickActionIcon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 24px;
          background: linear-gradient(135deg, rgba(79,70,229,0.95), rgba(168,85,247,0.95));
          box-shadow: 0 10px 20px rgba(124,58,237,0.32);
        }

        .quickActionTitle {
          color: #ffffff !important;
          font-weight: 1000;
          font-size: 14px;
          line-height: 1.12;
        }

        .quickActionSub {
          color: rgba(255,255,255,0.78) !important;
          font-weight: 800;
          font-size: 11px;
          line-height: 1.18;
        }

        .section {
          margin-bottom: 18px;
        }

        .sectionHeader {
          margin: 26px 0 12px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
        }

        .eyebrow {
          color: #fef08a;
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .sectionTitle {
          margin: 0;
          font-size: clamp(1.42rem, 3vw, 2.1rem);
          line-height: 1.05;
          letter-spacing: -0.9px;
          font-weight: 1000;
        }

        .sectionText {
          max-width: 680px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          font-size: 14px;
        }

        .bigPreviewCard {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.02fr 0.98fr;
          gap: 20px;
          align-items: center;
          margin-bottom: 18px;
          border-radius: 32px;
          padding: 24px;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.22), transparent 30%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.22), transparent 34%),
            linear-gradient(135deg, rgba(49,46,129,0.94), rgba(88,28,135,0.90));
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 24px 60px rgba(0,0,0,0.32);
        }

        .bigPreviewCard::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(2px 2px at 22% 28%, rgba(255,255,255,0.80), transparent 40%),
            radial-gradient(1.5px 1.5px at 76% 18%, rgba(255,255,255,0.70), transparent 40%),
            radial-gradient(1.8px 1.8px at 62% 78%, rgba(255,255,255,0.62), transparent 40%);
          pointer-events: none;
          opacity: 0.7;
        }

        .bigPreviewContent,
        .bigPreviewVisual {
          position: relative;
          z-index: 1;
        }

        .previewBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.20);
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 13px;
        }

        .previewHeadline {
          margin: 0;
          font-size: clamp(2rem, 4.4vw, 3.4rem);
          line-height: 0.96;
          letter-spacing: -1.5px;
          font-weight: 1000;
        }

        .previewText {
          margin-top: 14px;
          color: rgba(255,255,255,0.88);
          line-height: 1.65;
          font-size: 15.5px;
          max-width: 640px;
        }

        .previewButton {
          min-height: 58px;
          border-radius: 999px;
          padding: 15px 22px;
          text-decoration: none !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 1000;
          color: #312e81 !important;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          border: 1px solid rgba(255,255,255,0.66);
          box-shadow:
            0 18px 42px rgba(255,255,255,0.18),
            0 16px 34px rgba(168,85,247,0.34);
        }

        .previewMiniGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .previewMini {
          border-radius: 17px;
          padding: 12px;
          background: rgba(15,23,42,0.42);
          border: 1px solid rgba(255,255,255,0.16);
          color: rgba(255,255,255,0.90);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
        }

        .bigPreviewVisual {
          border-radius: 26px;
          padding: 16px;
          background: rgba(15,23,42,0.48);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
        }

        .fakeToolbar {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          margin-bottom: 12px;
        }

        .fakeSearch,
        .fakeChip {
          min-height: 39px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.74);
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .fakeChip {
          justify-content: center;
          color: #fde68a;
        }

        .fakeCards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .fakeCard {
          border-radius: 18px;
          padding: 10px;
          background: #e6d2ff;
          border: 3px solid #7c3aed;
          color: #2f1458;
          min-height: 145px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.18);
        }

        .fakeImage {
          height: 70px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.72);
          font-size: 28px;
          margin-bottom: 8px;
        }

        .fakeTitle {
          font-size: 14px;
          line-height: 1.1;
          font-weight: 1000;
        }

        .fakeSub {
          margin-top: 4px;
          color: rgba(47,20,88,0.72);
          font-size: 12px;
          font-weight: 900;
        }

        .fakeStatus {
          margin-top: 8px;
          display: inline-flex;
          border-radius: 999px;
          padding: 5px 8px;
          background: rgba(255,255,255,0.62);
          color: #166534;
          font-size: 11px;
          font-weight: 1000;
        }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .featureCard {
          color: white !important;
          text-decoration: none !important;
          border-radius: 24px;
          padding: 18px;
          min-height: 200px;
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
        }

        .featureIcon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background: linear-gradient(135deg, #ede9fe, #bfdbfe);
          margin-bottom: 14px;
        }

        .featureTitle {
          color: #fde68a;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 1000;
          margin-bottom: 9px;
        }

        .featureText {
          color: rgba(255,255,255,0.86);
          line-height: 1.55;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .featureLink {
          color: #ffffff !important;
          font-weight: 1000;
          font-size: 13px;
          text-decoration: none;
          display: inline-flex;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(99,102,241,0.55);
          border: 1px solid rgba(255,255,255,0.18);
        }

        .splitGrid {
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          gap: 18px;
          align-items: stretch;
        }

        .whiteCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border-radius: 28px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 38px rgba(0,0,0,0.22);
        }

        .whiteCard .eyebrow {
          color: #7c3aed;
        }

        .whiteCard .sectionText {
          color: #4b5563;
        }

        .announcementBody {
          margin-top: 15px;
          padding: 18px;
          border-radius: 21px;
          background:
            linear-gradient(#ffffff, #ffffff) padding-box,
            linear-gradient(135deg, #c4b5fd, #bfdbfe) border-box;
          border: 1px solid transparent;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 118px;
          line-height: 1.75;
          font-size: 15px;
          color: #374151;
        }

        .adminBox {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .field {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 12px 14px;
          font-size: 15px;
          color: #111827;
          background: white;
          box-sizing: border-box;
          outline: none;
        }

        .textarea {
          min-height: 220px;
          resize: vertical;
          white-space: pre-wrap;
          line-height: 1.6;
          margin-top: 10px;
        }

        .saveButton {
          margin-top: 10px;
          padding: 12px 18px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 950;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 18px rgba(79,70,229,0.28);
        }

        .miniList {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .miniListItem {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 10px;
          align-items: start;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #374151;
          line-height: 1.45;
          font-weight: 800;
        }

        .priceGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .priceCard {
          position: relative;
          overflow: hidden;
          text-align: left;
          border-radius: 28px;
          padding: 24px;
          color: white;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.10), transparent 34%),
            rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 16px 34px rgba(0,0,0,0.22);
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          min-height: 260px;
        }

        .priceCard:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.28);
          box-shadow: 0 22px 48px rgba(0,0,0,0.30);
        }

        .priceCard:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .priceCard.free {
          cursor: default;
        }

        .priceCard.best {
          background:
            radial-gradient(circle at top right, rgba(244,114,182,0.28), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.92), rgba(15,23,42,0.95));
          border-color: rgba(217,70,239,0.46);
          animation: popularGlow 2.8s ease-in-out infinite;
        }

        .priceCard.founding {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.22), transparent 36%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.28), transparent 40%),
            linear-gradient(135deg, rgba(131,24,67,0.94), rgba(49,46,129,0.96));
          border-color: rgba(244,114,182,0.60);
          box-shadow:
            0 22px 50px rgba(236,72,153,0.24),
            0 16px 34px rgba(0,0,0,0.24);
        }

        @keyframes popularGlow {
          0%, 100% {
            box-shadow: 0 16px 34px rgba(0,0,0,0.22), 0 0 0 rgba(217,70,239,0);
          }
          50% {
            box-shadow: 0 22px 48px rgba(0,0,0,0.30), 0 0 34px rgba(217,70,239,0.30);
          }
        }

        .tag {
          display: inline-flex;
          margin-bottom: 10px;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 1000;
          background: linear-gradient(90deg, #f59e0b, #f472b6);
          color: white;
        }

        .saveTag {
          display: inline-flex;
          margin-left: 8px;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 1000;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          color: white;
        }

        .price {
          font-size: 46px;
          font-weight: 1000;
          margin: 12px 0;
          line-height: 0.95;
        }

        .price span {
          color: rgba(255,255,255,0.74);
          font-size: 18px;
        }

        .finePrint {
          color: rgba(255,255,255,0.84);
          line-height: 1.55;
          font-size: 15px;
          margin-bottom: 18px;
        }

        .planButton {
          width: 100%;
          min-height: 50px;
          border-radius: 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 1000;
          color: white !important;
          background: linear-gradient(135deg, #2563eb, #8b5cf6);
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 12px 24px rgba(79,70,229,0.28);
        }

        .planButton.yearly {
          background: linear-gradient(135deg, #f59e0b, #f97316);
          box-shadow: 0 12px 24px rgba(249,115,22,0.30);
        }

        .planButton.founding {
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          box-shadow: 0 12px 26px rgba(236,72,153,0.34);
        }

        .primaryButton,
        .secondaryButton {
          min-height: 50px;
          border-radius: 17px;
          padding: 13px 18px;
          font-weight: 1000;
          text-decoration: none !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .primaryButton {
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          color: #312e81 !important;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton {
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .buttonRow {
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .finalCta {
          text-align: center;
          margin: 22px 0 96px;
          border-radius: 30px;
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 32%),
            linear-gradient(135deg, rgba(79,70,229,0.88), rgba(147,51,234,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 22px 46px rgba(0,0,0,0.28);
        }

        .mobileSticky {
          display: none;
        }

        .page a:not(.brand),
        .page a:not(.brand):visited {
          color: #ffffff !important;
        }

        .page a:not(.brand) *,
        .page a:not(.brand):visited * {
          color: inherit;
        }

        .brand,
        .brand *,
        .brand:visited,
        .brand:visited * {
          color: inherit !important;
        }

        @media (max-width: 1180px) {
          .priceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quickActions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 112px;
          }

          .brandIcon {
            width: 56px;
            height: 56px;
            border-radius: 18px;
            font-size: 30px;
          }

          .hero,
          .bigPreviewCard {
            grid-template-columns: 1fr;
          }

          .heroCard {
            padding: 20px;
          }

          .headline {
            font-size: clamp(2rem, 11vw, 3.05rem);
          }

          .heroText {
            font-size: 15.5px;
          }

          .premiumDash {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .previewPanel {
            padding: 12px;
          }

          .statBubble {
            padding: 5px;
            border-radius: 25px;
          }

          .statCard {
            min-height: 126px;
            padding: 13px;
            border-radius: 20px;
          }

          .statIcon {
            width: 44px;
            height: 44px;
            border-radius: 15px;
            font-size: 23px;
            margin-bottom: 8px;
          }

          .statValue {
            font-size: 31px;
          }

          .statSub {
            font-size: 12px;
          }

          .premiumActiveContent {
            grid-template-columns: 52px 1fr;
          }

          .premiumBadge {
            grid-column: 1 / -1;
            width: 100%;
            box-sizing: border-box;
          }

          .premiumIcon {
            width: 52px;
            height: 52px;
            font-size: 26px;
          }

          .premiumPerks {
            grid-template-columns: 1fr;
          }

          .progressHeader {
            grid-template-columns: 52px 1fr;
          }

          .progressHeader .upgradeButton {
            grid-column: 1 / -1;
          }

          .gem {
            width: 52px;
            height: 52px;
            font-size: 26px;
          }

          .quickActions {
            grid-template-columns: 1fr;
          }

          .quickAction {
            min-height: 76px;
            grid-template-columns: 44px 1fr;
            justify-items: start;
            text-align: left;
          }

          .featureGrid,
          .splitGrid,
          .priceGrid {
            grid-template-columns: 1fr;
          }

          .featureCard {
            min-height: 0;
            padding: 17px;
          }

          .sectionHeader {
            display: grid;
            margin-top: 20px;
          }

          .whiteCard {
            padding: 18px;
            border-radius: 24px;
          }

          .priceCard {
            min-height: 0;
            padding: 22px;
          }

          .previewMiniGrid {
            grid-template-columns: 1fr;
          }

          .fakeToolbar {
            grid-template-columns: 1fr;
          }

          .mobileSticky {
            position: fixed;
            z-index: 60;
            left: 12px;
            right: 12px;
            bottom: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 10px;
            border-radius: 22px;
            background: rgba(15,23,42,0.88);
            border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 40px rgba(0,0,0,0.36);
          }

          .mobileSticky a {
            min-height: 46px;
            border-radius: 15px;
            padding: 10px 12px;
            font-size: 13px;
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          }

          .mobileSticky .primaryButton {
            background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.38);
            box-shadow: 0 12px 28px rgba(124,58,237,0.44);
          }

          .mobileSticky .secondaryButton {
            background: linear-gradient(135deg, #f59e0b, #f97316);
            color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.38);
            box-shadow: 0 12px 28px rgba(249,115,22,0.34);
          }
        }

        @media (max-width: 560px) {
          .brandTitle {
            font-size: 1.62rem;
          }

          .brandSub {
            font-size: 13px;
          }

          .statLabel {
            font-size: 10px;
          }

          .progressPanel {
            padding: 16px;
          }

          .fakeCards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="heroCard">
            <div className="badge">✨ Fan-made collector vault ✨</div>

            <h1 className="headline">
              Track your Doorables without the chaos.
            </h1>

            <div className="heroText">
              Welcome{username ? ` back, ${username}` : ""}! Adorable Vault helps you track what you own,
              what you still need, and which extras are ready to sell or trade.
            </div>

            <div className="seoLine">
              Made for collectors who want one clean place to track sets, manage extras,
              and stop wondering, “Do I already have this one?”
            </div>

            <div className="trustRow">
              <span className="trustPill">Free up to 50 saved Doorables</span>
              <span className="trustPill">Preview before signup</span>
              <span className="trustPill">Unlimited plans from $3/month</span>
              <span className="trustPill">Mobile-friendly collector hub</span>
            </div>

            <div className="buttonRow">
              <Link href="/demo" className="primaryButton">
                Preview the Vault 👀
              </Link>
              <Link href="/collection" className="secondaryButton">
                Start Free 💜
              </Link>
            </div>
          </div>

          <div className="previewPanel">
            <div className="premiumDash">
              <div className="statBubble">
                <Link href="/collection" className="statCard owned">
                  <div className="statIcon">📦</div>
                  <div className="statLabel">{hasPersonalStats ? "Total Owned" : "Your Vault"}</div>
                  <div className="statValue">{hasPersonalStats ? stats.owned : "—"}</div>
                  <div className="statSub">{hasPersonalStats ? "Doorables you own" : "Sign in to see your count"}</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/collection" className="statCard needed">
                  <div className="statIcon">📋</div>
                  <div className="statLabel">{hasPersonalStats ? "Still Needed" : "Wishlist"}</div>
                  <div className="statValue">{hasPersonalStats ? stats.needed.toLocaleString() : "—"}</div>
                  <div className="statSub">{hasPersonalStats ? "Doorables to collect" : "Track what you need"}</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/sell" className="statCard extras">
                  <div className="statIcon">⭐</div>
                  <div className="statLabel">{hasPersonalStats ? "Extras" : "Extras"}</div>
                  <div className="statValue">{hasPersonalStats ? stats.extras : "—"}</div>
                  <div className="statSub">{hasPersonalStats ? "Ready to trade or sell" : "List duplicates later"}</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/marketplace" className="statCard market">
                  <div className="statIcon">🛍️</div>
                  <div className="statLabel">Marketplace</div>
                  <div className="statValue">{stats.listings > 0 ? stats.listings : "→"}</div>
                  <div className="statSub">{stats.listings > 0 ? "Current marketplace listings" : "Browse collector listings"}</div>
                </Link>
              </div>
            </div>

            {isSubscribed ? (
              <div className="premiumActivePanel">
                <div className="premiumActiveContent">
                  <div className="premiumIcon">👑</div>

                  <div>
                    <div style={{ fontWeight: 1000, fontSize: 20 }}>
                      Full Access Active
                    </div>
                    <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                      Unlimited tracking, marketplace tools, selling, and collector features are unlocked.
                    </div>
                  </div>

                  <div className="premiumBadge">Unlocked 💜</div>
                </div>

                <div className="premiumPerks">
                  <div className="premiumPerk">∞ Unlimited saves</div>
                  <div className="premiumPerk">🛍️ Marketplace access</div>
                  <div className="premiumPerk">🏷️ Sell extras</div>
                </div>
              </div>
            ) : (
              <div className="progressPanel">
                <div className="progressHeader">
                  <div className="gem">💎</div>

                  <div>
                    <div style={{ fontWeight: 1000, fontSize: 19 }}>
                      Free collector plan
                    </div>
                    <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                      {hasPersonalStats ? `Save up to 50 Doorables • ${remainingFree} free saves left` : "Your free saves appear here after sign in"}
                    </div>
                  </div>

                  <Link href="/pricing" className="upgradeButton">
                    <span>Upgrade Now</span>
                  </Link>
                </div>

                <div className="progressTrack">
                  <div className="progressFill" style={{ width: `${hasPersonalStats ? freePercent : 0}%` }} />
                </div>

                <div style={{ marginTop: 10, color: "rgba(255,255,255,0.80)", fontWeight: 800, fontSize: 13 }}>
                  {hasPersonalStats ? `${freeUsed} / 50 free saved Doorables used` : "Start free, save up to 50 Doorables, then upgrade when you need more."}
                </div>
              </div>
            )}

            <div className="quickActions">
              <Link href="/demo" className="quickAction previewQuick">
                <span className="quickActionIcon">👀</span>
                <span>
                  <span className="quickActionTitle">Preview first</span>
                  <br />
                  <span className="quickActionSub">No signup needed</span>
                </span>
              </Link>

              <Link href="/collection" className="quickAction">
                <span className="quickActionIcon">🎯</span>
                <span>
                  <span className="quickActionTitle">Open tracker</span>
                  <br />
                  <span className="quickActionSub">View collection</span>
                </span>
              </Link>

              <Link href="/marketplace" className="quickAction">
                <span className="quickActionIcon">🛍️</span>
                <span>
                  <span className="quickActionTitle">Browse Marketplace</span>
                  <br />
                  <span className="quickActionSub">Find extras & gaps</span>
                </span>
              </Link>

              <Link href="/feedback" className="quickAction">
                <span className="quickActionIcon">💬</span>
                <span>
                  <span className="quickActionTitle">Send feedback</span>
                  <br />
                  <span className="quickActionSub">Help us improve</span>
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bigPreviewCard">
          <div className="bigPreviewContent">
            <div className="previewBadge">👀 No signup preview</div>
            <h2 className="previewHeadline">Want to peek before making an account?</h2>
            <div className="previewText">
              Open the sample vault and see what collectors get: colorful rarity cards, have/need/extras tracking,
              wishlist filters, progress stats, and marketplace-style organization. It is the easiest way to show new
              people what Adorable Vault feels like before they commit.
            </div>

            <div className="buttonRow">
              <Link href="/demo" className="previewButton">
                Open Sample Vault 👀
              </Link>
              <Link href="/collection" className="secondaryButton">
                Start Your Own Vault 💜
              </Link>
            </div>

            <div className="previewMiniGrid">
              <div className="previewMini">✅ See tracking before signup</div>
              <div className="previewMini">🔎 Try search and filters</div>
              <div className="previewMini">💜 Then save 50 free</div>
            </div>
          </div>

          <div className="bigPreviewVisual" aria-hidden="true">
            <div className="fakeToolbar">
              <div className="fakeSearch">Search sample vault...</div>
              <div className="fakeChip">Have</div>
              <div className="fakeChip">Extras</div>
            </div>

            <div className="fakeCards">
              <div className="fakeCard">
                <div className="fakeImage">💜</div>
                <div className="fakeTitle">Sparkle Sample</div>
                <div className="fakeSub">Series Preview • Special Edition</div>
                <div className="fakeStatus">Have · Qty 1</div>
              </div>

              <div className="fakeCard" style={{ background: "#f8ef9b", borderColor: "#d4a500", color: "#403000" }}>
                <div className="fakeImage">💎</div>
                <div className="fakeTitle">Golden Sample</div>
                <div className="fakeSub" style={{ color: "rgba(64,48,0,0.72)" }}>
                  Series Preview • Limited
                </div>
                <div className="fakeStatus" style={{ color: "#7c3aed" }}>Need · Qty 0</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">What you can do</div>
              <h2 className="sectionTitle">
                One collector hub instead of screenshots, spreadsheets, and memory.
              </h2>
            </div>

            <div className="sectionText">
              Track your collection, manage your wishlist, organize extras, and browse collector listings from one mobile-friendly vault.
            </div>
          </div>

          <div className="featureGrid">
            <Link href="/collection" className="featureCard">
              <div className="featureIcon">💜</div>
              <div className="featureTitle">Track your collection</div>
              <div className="featureText">
                Mark what you own, what you need, your extras, notes, rarity, movie, and series progress.
              </div>
              <div className="featureLink">Open tracker →</div>
            </Link>

            <Link href="/collection" className="featureCard">
              <div className="featureIcon">🔎</div>
              <div className="featureTitle">Find what you need</div>
              <div className="featureText">
                Check your wishlist before buying, trading, or joining another live sale.
              </div>
              <div className="featureLink">Find gaps →</div>
            </Link>

            <Link href="/sell" className="featureCard">
              <div className="featureIcon">🔁</div>
              <div className="featureTitle">Sell extras faster</div>
              <div className="featureText">
                Turn duplicate Doorables into Marketplace listings with cleaner tools and auto-listing support.
              </div>
              <div className="featureLink">List extras →</div>
            </Link>

            <Link href="/marketplace" className="featureCard">
              <div className="featureIcon">🛍️</div>
              <div className="featureTitle">Browse marketplace</div>
              <div className="featureText">
                Search collector listings and message sellers when you find something you need.
              </div>
              <div className="featureLink">Browse marketplace →</div>
            </Link>
          </div>
        </section>

        <section className="splitGrid section">
          <div className="whiteCard">
            <div className="eyebrow">Vault news</div>
            <h2 className="sectionTitle">
              {loading ? "Loading updates..." : title}
            </h2>
            <div className="sectionText">
              Weekly updates, feature drops, secret codes, collector news, promos, and launch notes.
            </div>

            <div className="announcementBody">{announcementText}</div>

            {isAdmin && (
              <div className="adminBox">
                <div style={{ fontWeight: 950, marginBottom: 8 }}>
                  Admin weekly update box
                </div>

                <input
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />

                <textarea
                  className="field textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Paste this week’s update here..."
                />

                <button
                  type="button"
                  className="saveButton"
                  onClick={() => void saveAnnouncement()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Homepage Update"}
                </button>
              </div>
            )}

            {message && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
                {message}
              </div>
            )}
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Why collectors use it</div>
            <h2 className="sectionTitle">
              It answers: “Do I already have this one?”
            </h2>
            <div className="sectionText">
              Adorable Vault is made for real collector habits: shopping, live sales, blind bags, trades, duplicates,
              wishlists, and set completion.
            </div>

            <div className="miniList">
              <div className="miniListItem">
                <span>✅</span>
                <span>Track owned Doorables, still-needed Doorables, and extras in one place.</span>
              </div>
              <div className="miniListItem">
                <span>✅</span>
                <span>Use filters for series, rarity, movie, subcategory, notes, have, need, and extra.</span>
              </div>
              <div className="miniListItem">
                <span>✅</span>
                <span>Preview the sample vault first, then start saving up to 50 Doorables free.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">Plans</div>
              <h2 className="sectionTitle">
                Start free, then unlock the full collector vault.
              </h2>
            </div>

            <div className="sectionText">
              Free accounts can save up to 50 Doorables. Paid plans unlock unlimited tracking,
              Marketplace, selling extras, messaging, and full collector features. The limited founding bundle adds a physical keychain thank-you gift while supplies last.
            </div>
          </div>

          {checkoutError && (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 18,
                padding: 14,
                background: "rgba(254,226,226,0.96)",
                color: "#991b1b",
                fontWeight: 900,
              }}
            >
              {checkoutError}
            </div>
          )}

          <div className="priceGrid">
            <Link href="/collection" className="priceCard free">
              <div style={{ fontWeight: 1000 }}>Starter</div>
              <div className="price">
                $0 <span>/ free</span>
              </div>
              <div className="finePrint">
                Save up to 50 Doorables and try the tracker before upgrading.
              </div>
              <div className="planButton">Start Tracking</div>
            </Link>

            <button
              type="button"
              className="priceCard"
              onClick={() => void handleCheckout("monthly")}
              disabled={loadingPlan === "monthly"}
            >
              <div style={{ fontWeight: 1000 }}>Collector Monthly</div>
              <div className="price">
                $3 <span>/ month</span>
              </div>
              <div className="finePrint">
                Unlimited tracking, marketplace tools, and full collector access with flexible billing.
              </div>
              <div className="planButton">
                {loadingPlan === "monthly" ? "Starting checkout..." : "Start Monthly ✨"}
              </div>
            </button>

            <button
              type="button"
              className="priceCard best"
              onClick={() => void handleCheckout("yearly")}
              disabled={loadingPlan === "yearly"}
            >
              <div>
                <span className="tag">Most popular</span>
                <span className="saveTag">Save $21/year</span>
              </div>
              <div style={{ fontWeight: 1000 }}>Collector Yearly</div>
              <div className="price">
                $15 <span>/ year</span>
              </div>
              <div className="finePrint">
                Best value for collectors who want the full Doorables vault all year.
              </div>
              <div className="planButton yearly">
                {loadingPlan === "yearly" ? "Starting checkout..." : "Get Best Deal 🚀"}
              </div>
            </button>

            <button
              type="button"
              className="priceCard founding"
              onClick={() => void handleCheckout("founding")}
              disabled={loadingPlan === "founding"}
            >
              <div>
                <span className="tag">Limited launch</span>
              </div>
              <div style={{ fontWeight: 1000 }}>Founding Collector</div>
              <div className="price">
                $20 <span>/ year</span>
              </div>
              <div className="finePrint">
                1 full year of access plus a limited edition Adorable Vault keychain while supplies last.
              </div>
              <div className="planButton founding">
                {loadingPlan === "founding" ? "Starting checkout..." : "Get Bundle + Keychain 💜"}
              </div>
            </button>
          </div>
        </section>

        <section className="section splitGrid">
          <div className="whiteCard">
            <div className="eyebrow">Built for real collecting</div>
            <h2 className="sectionTitle">
              Your collection, wishlist, extras, and listings in one place.
            </h2>
            <div className="sectionText">
              Use Adorable Vault while you are opening blind bags, shopping lives, checking duplicates,
              or getting extras ready to sell or trade.
            </div>
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Fan-made disclaimer</div>
            <h2 className="sectionTitle">Made for collectors.</h2>
            <div className="sectionText">
              Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with,
              sponsored by, or endorsed by Disney or Just Play. Character names and references are used only
              to help collectors organize and identify their collections. Founding keychain bundle is limited and available while supplies last.
            </div>
          </div>
        </section>

        <section className="finalCta">
          <div className="eyebrow">Ready to organize the chaos?</div>
          <h2 className="sectionTitle">Start your collection today 💜</h2>
          <div className="sectionText" style={{ margin: "10px auto 0" }}>
            Open your vault, save your first Doorables, and see exactly what you own, need, and can trade.
          </div>

          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href="/demo" className="primaryButton">
              Preview First 👀
            </Link>
            <Link href="/collection" className="secondaryButton">
              Open My Collection
            </Link>
          </div>
        </section>
      </div>

      <div className="mobileSticky">
        <Link href="/demo" className="primaryButton">
          👀 Preview
        </Link>
        <Link href="/collection" className="secondaryButton">
          🚀 Start Free
        </Link>
      </div>
    </main>
  );
}
