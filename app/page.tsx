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
      "Doorables tracker, Disney Doorables tracker, Doorables collection tracker, Doorables checklist, Doorables wishlist, Doorables inventory, Doorables rarity tracker, Doorables marketplace, Doorables trading, Doorables extras, buy sell trade Doorables, Adorable Vault"
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

  const hasPersonalStats = stats.total > 0 && (stats.owned > 0 || stats.extras > 0);
  const displayOwned = hasPersonalStats ? stats.owned : "50";
  const displayNeeded = hasPersonalStats ? stats.needed.toLocaleString() : "Need";
  const displayExtras = hasPersonalStats ? stats.extras : "Extras";
  const displayProgress = hasPersonalStats ? `${stats.progress}%` : "Free";
  const freeUsed = Math.min(stats.owned, FREE_LIMIT);
  const freePercent = Math.min(100, Math.round((freeUsed / FREE_LIMIT) * 100));
  const remainingFree = Math.max(0, FREE_LIMIT - freeUsed);

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
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 110px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.06fr) minmax(360px, 0.94fr);
          gap: 20px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .vaultPreview,
        .launchStrip,
        .whiteCard,
        .darkCard,
        .finalCta {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroCard {
          padding: 34px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 32%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          display: grid;
          align-content: center;
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.35rem, 5.6vw, 4.55rem);
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

        .heroActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 24px;
        }

        .actionCard,
        .actionCard:visited {
          display: grid;
          grid-template-columns: 50px 1fr;
          gap: 12px;
          align-items: center;
          min-height: 84px;
          border-radius: 24px;
          padding: 14px;
          color: white !important;
          text-decoration: none !important;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,0.58), rgba(79,70,229,0.64));
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .actionCard:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.42);
          box-shadow: 0 22px 42px rgba(0,0,0,0.30), 0 0 26px rgba(168,85,247,0.20);
        }

        .actionCard.alt {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.16), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.66), rgba(15,23,42,0.66));
        }

        .actionIcon {
          width: 50px;
          height: 50px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 27px;
          color: #312e81;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          box-shadow: 0 12px 24px rgba(255,255,255,0.12);
        }

        .actionTitle {
          display: block;
          font-weight: 1000;
          line-height: 1.12;
          color: white;
        }

        .actionSub {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.76);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.28;
        }

        .vaultPreview {
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.18), transparent 34%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.18), transparent 36%),
            linear-gradient(135deg, rgba(15,23,42,0.78), rgba(88,28,135,0.80));
          display: grid;
          gap: 13px;
        }

        .previewHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .previewLabel {
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .previewLink,
        .previewLink:visited {
          color: #312e81 !important;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          border-radius: 999px;
          padding: 9px 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .mockSearch {
          min-height: 48px;
          border-radius: 17px;
          padding: 12px 14px;
          color: rgba(255,255,255,0.82);
          font-weight: 900;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
        }

        .previewStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .miniStat {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.14);
          min-height: 74px;
        }

        .miniStatValue {
          font-size: 25px;
          font-weight: 1000;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 6px;
        }

        .miniStatLabel {
          color: rgba(255,255,255,0.78);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.24;
        }

        .mockCards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .mockCard {
          min-height: 205px;
          border-radius: 22px;
          padding: 12px;
          color: #2f1458;
          border: 4px solid #7c3aed;
          background:
            linear-gradient(rgba(0,0,0,0.07), rgba(0,0,0,0.07)),
            #e6d2ff;
          box-shadow: 0 14px 28px rgba(0,0,0,0.18), 0 0 18px rgba(124,58,237,0.20);
        }

        .mockCard.gold {
          color: #403000;
          border-color: #d4a500;
          background:
            linear-gradient(rgba(0,0,0,0.07), rgba(0,0,0,0.07)),
            #f8ef9b;
        }

        .mockImage {
          height: 92px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.88);
          font-size: 40px;
          margin-bottom: 11px;
        }

        .mockCardTop {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .mockTitle {
          font-size: 16px;
          font-weight: 1000;
          line-height: 1.08;
        }

        .mockBadge {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 1000;
          white-space: nowrap;
          background: #c084fc;
          color: #2f1458;
        }

        .mockCard.gold .mockBadge {
          background: #f2d64c;
          color: #403000;
        }

        .mockSub {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.78;
        }

        .mockChipRow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .mockChip {
          border-radius: 999px;
          padding: 5px 8px;
          background: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 1000;
        }

        .progressPanel {
          border-radius: 24px;
          padding: 17px;
          background:
            radial-gradient(circle at top right, rgba(236,72,153,0.24), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.88), rgba(15,23,42,0.95));
          border: 1px solid rgba(217,70,239,0.38);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 12px;
          margin-bottom: 12px;
        }

        .progressTrack {
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

        .launchStrip {
          margin-bottom: 18px;
          padding: 18px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.36), transparent 32%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.22), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(255,255,255,0.62);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
        }

        .launchTitle {
          color: #312e81;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 1000;
          margin-bottom: 5px;
        }

        .launchText {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          font-weight: 800;
        }

        .launchButton,
        .launchButton:visited {
          min-height: 50px;
          border-radius: 999px;
          padding: 13px 17px;
          text-decoration: none;
          color: white !important;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          font-weight: 1000;
          box-shadow: 0 14px 28px rgba(236,72,153,0.26);
          white-space: nowrap;
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
          font-weight: 800;
        }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .featureCard,
        .featureCard:visited {
          min-height: 214px;
          border-radius: 24px;
          padding: 18px;
          color: white !important;
          text-decoration: none !important;
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
          transition: transform 0.16s ease, border-color 0.16s ease;
        }

        .featureCard:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.24);
        }

        .featureIcon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 30px;
          color: #312e81;
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
          font-weight: 800;
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
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          align-items: stretch;
        }

        .whiteCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border: 1px solid rgba(255,255,255,0.60);
          padding: 24px;
        }

        .whiteCard .eyebrow {
          color: #7c3aed;
        }

        .whiteCard .sectionTitle {
          color: #111827;
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
          min-height: 112px;
          line-height: 1.7;
          font-size: 15px;
          color: #374151;
          font-weight: 750;
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
          min-height: 200px;
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
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: start;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #374151;
          line-height: 1.45;
          font-weight: 850;
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
        }

        .priceCard.founding {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.22), transparent 36%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.28), transparent 40%),
            linear-gradient(135deg, rgba(131,24,67,0.94), rgba(49,46,129,0.96));
          border-color: rgba(244,114,182,0.60);
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
          font-weight: 800;
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

        .errorBox {
          margin-bottom: 14px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(254,226,226,0.96);
          color: #991b1b;
          font-weight: 900;
        }

        .primaryButton,
        .secondaryButton,
        .primaryButton:visited,
        .secondaryButton:visited {
          min-height: 52px;
          border-radius: 999px;
          padding: 14px 20px;
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

        .buttonRow,
        .ctaButtons {
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .finalCta {
          text-align: center;
          margin: 22px 0 96px;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 32%),
            linear-gradient(135deg, rgba(79,70,229,0.88), rgba(147,51,234,0.86));
          border: 1px solid rgba(255,255,255,0.16);
        }

        .mobileSticky {
          display: none;
        }

        .page a,
        .page a:visited {
          color: inherit;
        }

        @media (max-width: 1180px) {
          .priceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .featureGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 112px;
          }

          .hero,
          .splitGrid {
            grid-template-columns: 1fr;
          }

          .heroCard,
          .vaultPreview,
          .launchStrip,
          .whiteCard,
          .darkCard,
          .finalCta {
            border-radius: 24px;
          }

          .heroCard {
            padding: 22px;
          }

          .headline {
            font-size: clamp(2rem, 11vw, 3.05rem);
          }

          .heroText {
            font-size: 15.5px;
          }

          .heroActions {
            grid-template-columns: 1fr;
          }

          .previewStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mockCards {
            grid-template-columns: 1fr;
          }

          .launchStrip {
            grid-template-columns: 1fr;
          }

          .launchButton {
            width: 100%;
            box-sizing: border-box;
            justify-content: center;
          }

          .featureGrid,
          .priceGrid {
            grid-template-columns: 1fr;
          }

          .featureCard {
            min-height: 0;
          }

          .sectionHeader {
            display: grid;
            margin-top: 20px;
          }

          .whiteCard {
            padding: 18px;
          }

          .priceCard {
            min-height: 0;
            padding: 22px;
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
          .previewHeader {
            display: grid;
          }

          .previewLink {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }

          .mockCard {
            min-height: 0;
          }

          .buttonRow,
          .ctaButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
            box-sizing: border-box;
          }

          .mobileSticky {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="heroCard">
            <div className="badge">✨ Fan-made collector vault ✨</div>

            <h1 className="headline">
              Your Doorables checklist, wishlist, and extras — all in one vault.
            </h1>

            <div className="heroText">
              Welcome{username ? ` back, ${username}` : ""}! Adorable Vault helps collectors track
              what they own, what they still need, and which extras are ready to sell or trade.
            </div>

            <div className="trustRow">
              <span className="trustPill">Free up to 50 saved Doorables</span>
              <span className="trustPill">Preview before signup</span>
              <span className="trustPill">Unlimited from $3/month</span>
              <span className="trustPill">Marketplace tools</span>
            </div>

            <div className="heroActions">
              <Link href="/demo" className="actionCard">
                <span className="actionIcon">👀</span>
                <span>
                  <span className="actionTitle">Preview the vault</span>
                  <span className="actionSub">No signup needed — see how it works first.</span>
                </span>
              </Link>

              <Link href="/collection" className="actionCard alt">
                <span className="actionIcon">💜</span>
                <span>
                  <span className="actionTitle">Start tracking free</span>
                  <span className="actionSub">Save up to 50 Doorables before upgrading.</span>
                </span>
              </Link>
            </div>
          </div>

          <aside className="vaultPreview">
            <div className="previewHeader">
              <div>
                <div className="previewLabel">Inside the vault</div>
                <div style={{ color: "rgba(255,255,255,0.82)", fontWeight: 850, marginTop: 4 }}>
                  A cleaner collector dashboard at a glance.
                </div>
              </div>

              <Link href="/demo" className="previewLink">
                Open Preview →
              </Link>
            </div>

            <div className="mockSearch">Search name, series, rarity, movie...</div>

            <div className="previewStats">
              <div className="miniStat">
                <div className="miniStatValue">{displayOwned}</div>
                <div className="miniStatLabel">{hasPersonalStats ? "Owned" : "Free saves"}</div>
              </div>
              <div className="miniStat">
                <div className="miniStatValue">{displayNeeded}</div>
                <div className="miniStatLabel">Wishlist</div>
              </div>
              <div className="miniStat">
                <div className="miniStatValue">{displayExtras}</div>
                <div className="miniStatLabel">Extras</div>
              </div>
              <div className="miniStat">
                <div className="miniStatValue">{displayProgress}</div>
                <div className="miniStatLabel">{hasPersonalStats ? "Complete" : "Starter plan"}</div>
              </div>
            </div>

            <div className="mockCards">
              <div className="mockCard">
                <div className="mockImage">💜</div>
                <div className="mockCardTop">
                  <div>
                    <div className="mockTitle">Sparkle Sample</div>
                    <div className="mockSub">Series 12 • Pixel Perfect</div>
                  </div>
                  <div className="mockBadge">Special</div>
                </div>
                <div className="mockChipRow">
                  <span className="mockChip">Have</span>
                  <span className="mockChip">Qty 1</span>
                  <span className="mockChip">Note saved</span>
                </div>
              </div>

              <div className="mockCard gold">
                <div className="mockImage">💎</div>
                <div className="mockCardTop">
                  <div>
                    <div className="mockTitle">Golden Sample</div>
                    <div className="mockSub">Series 10 • Collector Peek</div>
                  </div>
                  <div className="mockBadge">Limited</div>
                </div>
                <div className="mockChipRow">
                  <span className="mockChip">Need</span>
                  <span className="mockChip">Qty 0</span>
                  <span className="mockChip">Wishlist</span>
                </div>
              </div>
            </div>

            {isSubscribed ? (
              <div className="progressPanel">
                <div className="progressTop">
                  <div>
                    <div style={{ fontWeight: 1000, fontSize: 18 }}>Full Access Active 👑</div>
                    <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                      Unlimited tracking and marketplace tools are unlocked.
                    </div>
                  </div>
                  <div style={{ color: "#fde68a", fontWeight: 1000 }}>Unlocked</div>
                </div>
                <div className="progressTrack">
                  <div className="progressFill" style={{ width: "100%" }} />
                </div>
              </div>
            ) : (
              <div className="progressPanel">
                <div className="progressTop">
                  <div>
                    <div style={{ fontWeight: 1000, fontSize: 18 }}>Free collector plan</div>
                    <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                      {hasPersonalStats ? `${remainingFree} free saves left` : "Start free, then upgrade when you need more."}
                    </div>
                  </div>
                  <div style={{ color: "#fde68a", fontWeight: 1000 }}>
                    {hasPersonalStats ? `${freeUsed}/50` : "0/50"}
                  </div>
                </div>
                <div className="progressTrack">
                  <div className="progressFill" style={{ width: `${hasPersonalStats ? freePercent : 0}%` }} />
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="launchStrip">
          <div>
            <div className="launchTitle">Launch special: Founding Collector bundle 💜</div>
            <div className="launchText">
              Get one full year of Adorable Vault plus a limited edition keychain while supplies last.
              Perfect for collectors who want to support the launch and get the full vault experience.
            </div>
          </div>

          <Link href="/pricing" className="launchButton">
            See Founding Bundle
          </Link>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">How it helps</div>
              <h2 className="sectionTitle">
                Stop guessing. Start checking your collection faster.
              </h2>
            </div>

            <div className="sectionText">
              Built for shopping, live sales, trades, blind openings, duplicate clean-up,
              and the eternal question: “Do I already have this one?”
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

            <Link href="/demo" className="featureCard">
              <div className="featureIcon">👀</div>
              <div className="featureTitle">Preview before signup</div>
              <div className="featureText">
                Show new collectors exactly how the vault works before they make an account.
              </div>
              <div className="featureLink">View preview →</div>
            </Link>

            <Link href="/sell" className="featureCard">
              <div className="featureIcon">🔁</div>
              <div className="featureTitle">Organize extras</div>
              <div className="featureText">
                Turn duplicate Doorables into cleaner Marketplace listings with less manual chaos.
              </div>
              <div className="featureLink">List extras →</div>
            </Link>

            <Link href="/marketplace" className="featureCard">
              <div className="featureIcon">🛍️</div>
              <div className="featureTitle">Browse Marketplace</div>
              <div className="featureText">
                Search collector listings and message sellers when you find something you need.
              </div>
              <div className="featureLink">Browse listings →</div>
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
            <h2 className="sectionTitle">A real home base for the collection.</h2>
            <div className="sectionText">
              Adorable Vault keeps the collector workflow simple: save what you have, filter what you need,
              track extras, and use the Marketplace when you are ready.
            </div>

            <div className="miniList">
              <div className="miniListItem">
                <span>✅</span>
                <span>Track owned, needed, and extra Doorables in one place.</span>
              </div>
              <div className="miniListItem">
                <span>🔎</span>
                <span>Use search and filters during shopping, shows, and trades.</span>
              </div>
              <div className="miniListItem">
                <span>💸</span>
                <span>Upgrade when you want unlimited saves, selling tools, and messaging.</span>
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
              Marketplace, selling extras, messaging, and full collector features.
            </div>
          </div>

          {checkoutError && <div className="errorBox">{checkoutError}</div>}

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
                One full year of access plus a limited edition Adorable Vault keychain while supplies last.
              </div>
              <div className="planButton founding">
                {loadingPlan === "founding" ? "Starting checkout..." : "Get Bundle + Keychain 💜"}
              </div>
            </button>
          </div>
        </section>

        <section className="splitGrid section">
          <div className="whiteCard">
            <div className="eyebrow">Fan-made disclaimer</div>
            <h2 className="sectionTitle">Made by collectors, for collectors.</h2>
            <div className="sectionText">
              Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with,
              sponsored by, or endorsed by Disney or Just Play. Character names and references are used only
              to help collectors organize and identify their collections.
            </div>
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Marketplace note</div>
            <h2 className="sectionTitle">Collectors connect directly.</h2>
            <div className="sectionText">
              Adorable Vault helps collectors connect, but buyers and sellers handle payment, pickup,
              shipping, item condition, refunds, and completed transactions directly.
            </div>
          </div>
        </section>

        <section className="finalCta">
          <div className="eyebrow">Ready to organize the chaos?</div>
          <h2 className="sectionTitle">Open your vault and start tracking 💜</h2>
          <div className="sectionText" style={{ margin: "10px auto 0" }}>
            Save what you own, find what you need, and turn collection chaos into something you can actually use.
          </div>

          <div className="ctaButtons" style={{ justifyContent: "center" }}>
            <Link href="/demo" className="primaryButton">
              Preview First 👀
            </Link>
            <Link href="/collection" className="secondaryButton">
              Start Free Tracking
            </Link>
          </div>
        </section>
      </div>

      <div className="mobileSticky">
        <Link href="/demo" className="primaryButton">
          👀 Preview
        </Link>
        <Link href="/collection" className="secondaryButton">
          💜 Start Free
        </Link>
      </div>
    </main>
  );
}
