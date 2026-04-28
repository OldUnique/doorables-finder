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
      "Adorable Vault is a premium fan-made Doorables collection tracker, Disney Doorables checklist, wishlist, extras organizer, inventory tool, rarity tracker, series progress tracker, trading helper, and collector marketplace hub.";

    function setMeta(name: string, content: string) {
      let tag = document.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement | null;

      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }

      tag.content = content;
    }

    function setProperty(property: string, content: string) {
      let tag = document.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement | null;

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
      "Doorables tracker, Disney Doorables tracker, Doorables collection tracker, Disney Doorables collection tracker, Doorables checklist, Disney Doorables checklist, Doorables wishlist, Doorables inventory, Doorables rarity tracker, Doorables series tracker, Doorables marketplace, Doorables trading, Doorables extras, Doorables duplicates, buy sell trade Doorables, Doorables collector app, Adorable Vault"
    );
    setMeta("robots", "index, follow");
    setProperty("og:title", "Adorable Vault | Doorables Collection Tracker");
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "Adorable Vault");

    let schema = document.getElementById(
      "adorable-vault-home-schema"
    ) as HTMLScriptElement | null;

    if (!schema) {
      schema = document.createElement("script");
      schema.id = "adorable-vault-home-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }

    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Adorable Vault",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description,
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description:
            "Free Doorables collection tracking up to 50 saved Doorables.",
        },
        {
          "@type": "Offer",
          price: "3",
          priceCurrency: "USD",
          description: "Monthly full collector access.",
        },
        {
          "@type": "Offer",
          price: "15",
          priceCurrency: "USD",
          description: "Yearly full collector access.",
        },
      ],
    });
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
        progress: total > 0 ? Math.round((owned / total) * 100) : 0,
        listings: listingCount ?? 0,
      });
    } catch {
      // Optional stats should not break homepage.
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
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        setUsername(String(profile?.username ?? ""));
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
      setMessage(
        error instanceof Error ? error.message : "Could not load homepage."
      );
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
      setMessage(
        error instanceof Error ? error.message : "Could not save announcement."
      );
      setSaving(false);
    }
  }

  const announcementText =
    body.trim() ||
    "New collector tools, marketplace upgrades, secret promos, and smoother Doorables tracking features are coming soon 💜";

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
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 112px;
        }

        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
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

        .navActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .navPill {
          color: white;
          text-decoration: none;
          font-weight: 950;
          padding: 12px 15px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 10px 24px rgba(0,0,0,0.15);
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 0.95fr;
          gap: 20px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .previewPanel,
        .premiumPanel {
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
          color: rgba(255,255,255,0.76);
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
          color: rgba(255,255,255,0.92);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .buttonRow {
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .primaryButton,
        .secondaryButton,
        .purpleButton {
          min-height: 50px;
          border-radius: 17px;
          padding: 13px 18px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .purpleButton:hover {
          transform: translateY(-2px);
        }

        .primaryButton {
          background: white;
          color: #312e81;
          box-shadow: 0 14px 28px rgba(255,255,255,0.16);
        }

.secondaryButton {
  background: rgba(15,23,42,0.72);
  color: #ffffff;
  border: 1px solid rgba(255,255,255,0.28);
  box-shadow: 0 10px 22px rgba(0,0,0,0.22);
}

.purpleButton {
  background: linear-gradient(90deg, #ffffff, #fef3c7);
  color: #312e81;
  box-shadow: 0 14px 26px rgba(255,255,255,0.18);
}

.trustPill {
  color: #ffffff;
  background: rgba(15,23,42,0.52);
  border: 1px solid rgba(255,255,255,0.24);
}

.miniAction {
  background: linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
  backdrop-filter: blur(10px);
  color: #ffffff;
  border: 1px solid rgba(255,255,255,0.35);
  box-shadow: 0 12px 28px rgba(0,0,0,0.25);
  font-weight: 900;
  text-decoration: none;
  transition: all 0.2s ease;
}

.miniAction:hover {
  background: linear-gradient(90deg, #6366f1, #a855f7);
  color: #ffffff;
  box-shadow: 0 16px 34px rgba(124,58,237,0.45);
  transform: translateY(-2px);
}

.heroActions a:first-child {
  background: linear-gradient(90deg, #4f46e5, #a855f7);
  box-shadow: 0 18px 40px rgba(124,58,237,0.55);
}
.statSub {
  color: #ffffff;
}

.statValue {
  color: #ffffff;
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
          color: white;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow:
            0 18px 40px rgba(0,0,0,0.36),
            inset 0 1px 0 rgba(255,255,255,0.14);
          text-decoration: none;
          backdrop-filter: blur(12px);
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          display: block;
        }

        .statBubble:hover .statCard {
          transform: translateY(-4px) scale(1.01);
          border-color: rgba(255,255,255,0.36);
          box-shadow:
            0 24px 55px rgba(0,0,0,0.46),
            0 0 25px rgba(168,85,247,0.25);
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
          opacity: 0.94;
        }

        .statValue {
          font-size: 40px;
          line-height: 0.95;
          font-weight: 1000;
          letter-spacing: -1px;
          margin: 7px 0;
          text-shadow: 0 2px 14px rgba(0,0,0,0.48);
        }

        .statSub {
          font-size: 13px;
          color: rgba(255,255,255,0.9);
          font-weight: 850;
        }

        .owned { background: linear-gradient(135deg, #7e22ce, #4c1d95); }
        .needed { background: linear-gradient(135deg, #0369a1, #1d4ed8); }
        .extras { background: linear-gradient(135deg, #92400e, #78350f); }
        .market { background: linear-gradient(135deg, #166534, #14532d); }

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

        .miniActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .miniAction {
          text-decoration: none;
          color: white;
          border-radius: 18px;
          padding: 13px;
          min-height: 72px;
          background: rgba(255,255,255,0.09);
          border: 1px solid rgba(255,255,255,0.13);
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 1000;
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

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .featureCard {
          color: white;
          text-decoration: none;
          border-radius: 24px;
          padding: 18px;
          min-height: 200px;
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
          transition: transform 0.15s ease, border 0.15s ease;
        }

        .featureCard:hover {
          transform: translateY(-3px);
          border-color: rgba(192,132,252,0.55);
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
          color: #c4b5fd;
          font-weight: 1000;
          font-size: 13px;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .priceCard {
          border-radius: 24px;
          padding: 20px;
          color: white;
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 16px 34px rgba(0,0,0,0.22);
        }

        .priceCard.best {
          background:
            radial-gradient(circle at top right, rgba(244,114,182,0.24), transparent 36%),
            linear-gradient(135deg, rgba(88,28,135,0.88), rgba(15,23,42,0.95));
          border-color: rgba(217,70,239,0.4);
        }

        .tag {
          display: inline-flex;
          margin-bottom: 10px;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 1000;
          background: linear-gradient(90deg, #f59e0b, #f472b6);
          color: white;
        }

        .price {
          font-size: 34px;
          font-weight: 1000;
          margin: 10px 0;
        }

        .price span {
          color: rgba(255,255,255,0.74);
          font-size: 13px;
        }

        .finePrint {
          color: rgba(255,255,255,0.8);
          line-height: 1.55;
          font-size: 14px;
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

.heroCard a,
.previewPanel a,
.finalCta a {
  color: inherit;
}

.previewPanel a:not(.statCard),
.heroCard a:not(.primaryButton),
.finalCta a:not(.primaryButton) {
  color: #ffffff;
}

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 112px;
          }

          .topNav {
            align-items: flex-start;
          }

          .brandIcon {
            width: 56px;
            height: 56px;
            border-radius: 18px;
            font-size: 30px;
          }

          .navPill:not(.menuPill) {
            display: none;
          }

          .hero {
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

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton,
          .purpleButton {
            width: 100%;
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

          .progressHeader {
            grid-template-columns: 52px 1fr;
          }

          .progressHeader .purpleButton {
            grid-column: 1 / -1;
          }

          .gem {
            width: 52px;
            height: 52px;
            font-size: 26px;
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

          .miniActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <nav className="topNav">
          <Link href="/" className="brand">
            <span className="brandIcon">💎</span>
            <span>
              <span className="brandTitle">Adorable Vault</span>
              <span className="brandSub">track • trade • showcase</span>
            </span>
          </Link>

          <div className="navActions">
            <Link href="/collection" className="navPill">Tracker</Link>
            <Link href="/marketplace" className="navPill">Marketplace</Link>
            <Link href="/pricing" className="navPill">Plans</Link>
            <Link href="/feedback" className="navPill menuPill">Feedback</Link>
          </div>
        </nav>

        <section className="hero">
          <div className="heroCard">
            <div className="badge">✨ Premium Doorables tracker • fan-made collector vault ✨</div>

            <h1 className="headline">
              The Doorables tracker for collectors who are done guessing.
            </h1>

            <div className="heroText">
              Welcome{username ? ` back, ${username}` : ""}! Adorable Vault helps you track your Doorables collection,
              build a wishlist, organize extras, find missing pieces, browse marketplace listings, and complete more sets with less chaos.
            </div>

            <div className="seoLine">
              Built as a Doorables collection tracker, Disney Doorables checklist, Doorables wishlist,
              Doorables inventory manager, Doorables rarity tracker, Doorables series tracker, and marketplace companion.
            </div>

            <div className="trustRow">
              <span className="trustPill">Free up to 50 saved Doorables</span>
              <span className="trustPill">$3/month or $15/year</span>
              <span className="trustPill">Mobile-friendly collector hub</span>
            </div>

            <div className="buttonRow">
              <Link href="/collection" className="primaryButton">🎯 Start Tracking Free</Link>
              <Link href="/marketplace" className="secondaryButton">🛍️ Browse Finds</Link>
              <Link href="/pricing" className="secondaryButton">👑 View Plans</Link>
            </div>
          </div>

          <div className="previewPanel">
            <div className="premiumDash">
              <div className="statBubble">
                <Link href="/collection" className="statCard owned">
                  <div className="statIcon">📦</div>
                  <div className="statLabel">Total Owned</div>
                  <div className="statValue">{stats.owned}</div>
                  <div className="statSub">Doorables you own</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/collection" className="statCard needed">
                  <div className="statIcon">📋</div>
                  <div className="statLabel">Still Needed</div>
                  <div className="statValue">{stats.needed.toLocaleString()}</div>
                  <div className="statSub">Doorables to collect</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/sell" className="statCard extras">
                  <div className="statIcon">⭐</div>
                  <div className="statLabel">Extras</div>
                  <div className="statValue">{stats.extras}</div>
                  <div className="statSub">Ready to trade or sell</div>
                </Link>
              </div>

              <div className="statBubble">
                <Link href="/marketplace" className="statCard market">
                  <div className="statIcon">🛍️</div>
                  <div className="statLabel">Marketplace</div>
                  <div className="statValue">{stats.listings}</div>
                  <div className="statSub">Current listings</div>
                </Link>
              </div>
            </div>

            <div className="progressPanel">
              <div className="progressHeader">
                <div className="gem">💎</div>

                <div>
                  <div style={{ fontWeight: 1000, fontSize: 19 }}>
                    Free collector plan
                  </div>
                  <div style={{ color: "#d8b4fe", fontWeight: 900, marginTop: 4 }}>
                    Save up to 50 Doorables • {remainingFree} free saves left
                  </div>
                </div>

                <Link href="/pricing" className="purpleButton">Upgrade Now</Link>
              </div>

              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${freePercent}%` }} />
              </div>

              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.80)", fontWeight: 800, fontSize: 13 }}>
                {freeUsed} / 50 free saved Doorables used
              </div>
            </div>

            <div className="miniActions">
              <Link href="/collection" className="miniAction">🎯 Open tracker</Link>
              <Link href="/feedback" className="miniAction">💬 Send feedback</Link>
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
              A premium Doorables tracker for owned figures, needed figures, extras, rarities, movies, series,
              duplicates, trades, and collector marketplace finds.
            </div>
          </div>

          <div className="featureGrid">
            <Link href="/collection" className="featureCard">
              <div className="featureIcon">💜</div>
              <div className="featureTitle">Track your collection</div>
              <div className="featureText">
                Mark owned, needed, extras, custom notes, rarity, movie, subcategory, and series progress.
              </div>
              <div className="featureLink">Open tracker →</div>
            </Link>

            <Link href="/collection" className="featureCard">
              <div className="featureIcon">🔎</div>
              <div className="featureTitle">Find what you need</div>
              <div className="featureText">
                Search your Doorables checklist before buying, trading, or joining another live sale.
              </div>
              <div className="featureLink">Find gaps →</div>
            </Link>

            <Link href="/sell" className="featureCard">
              <div className="featureIcon">🔁</div>
              <div className="featureTitle">Trade or sell extras</div>
              <div className="featureText">
                Turn duplicate Doorables into organized extras so other collectors can discover them.
              </div>
              <div className="featureLink">List extras →</div>
            </Link>

            <Link href="/marketplace" className="featureCard">
              <div className="featureIcon">🛍️</div>
              <div className="featureTitle">Browse marketplace</div>
              <div className="featureText">
                Use collector listings to search for missing Doorables and complete more sets.
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
              Adorable Vault is made for real collector habits: shopping, live sales, blind bags,
              trades, duplicates, wishlists, and set completion.
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
                <span>Upgrade from a free Doorables checklist to unlimited collector access.</span>
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
              Free accounts can save up to 50 Doorables. Paid plans unlock unlimited Doorables collection tracking,
              marketplace tools, selling extras, and full collector features.
            </div>
          </div>

          <div className="priceGrid">
            <div className="priceCard">
              <div style={{ fontWeight: 1000 }}>Starter</div>
              <div className="price">
                $0 <span>/ free</span>
              </div>
              <div className="finePrint">
                Save up to 50 Doorables, try the checklist, and start organizing your collection.
              </div>
            </div>

            <div className="priceCard">
              <div style={{ fontWeight: 1000 }}>Collector Monthly</div>
              <div className="price">
                $3 <span>/ month</span>
              </div>
              <div className="finePrint">
                Unlimited tracking, marketplace tools, and full collector access with flexible billing.
              </div>
            </div>

            <div className="priceCard best">
              <div className="tag">Best value</div>
              <div style={{ fontWeight: 1000 }}>Collector Yearly</div>
              <div className="price">
                $15 <span>/ year</span>
              </div>
              <div className="finePrint">
                The best plan for serious collectors who want the full Doorables vault all year.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/pricing" className="purpleButton">
              Compare Plans
            </Link>
          </div>
        </section>

        <section className="section splitGrid">
          <div className="whiteCard">
            <div className="eyebrow">SEO-friendly collector tool</div>
            <h2 className="sectionTitle">
              A Doorables tracker, checklist, wishlist, inventory, and marketplace hub.
            </h2>
            <div className="sectionText">
              Use Adorable Vault as a Disney Doorables collection tracker, Doorables checklist,
              Doorables wishlist, Doorables inventory manager, Doorables rarity tracker, Doorables series tracker,
              and Doorables marketplace companion.
            </div>
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Fan-made disclaimer</div>
            <h2 className="sectionTitle">Made for collectors.</h2>
            <div className="sectionText">
              Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with,
              sponsored by, or endorsed by Disney or Just Play. Character names and references are used only
              to help collectors organize and identify their collections.
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
            <Link href="/collection" className="primaryButton">
              Open My Collection
            </Link>
            <Link href="/pricing" className="secondaryButton">
              Unlock Full Access
            </Link>
          </div>
        </section>
      </div>

      <div className="mobileSticky">
        <Link href="/collection" className="primaryButton">
          Start Tracking
        </Link>
        <Link href="/pricing" className="secondaryButton">
          View Plans
        </Link>
      </div>
    </main>
  );
}
