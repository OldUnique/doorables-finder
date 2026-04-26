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

type FeatureCard = {
  icon: string;
  title: string;
  text: string;
  href: string;
  cta: string;
};

type StatPill = {
  value: string;
  label: string;
};

type StepCard = {
  number: string;
  title: string;
  text: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const ADMIN_EMAILS = ["riffeljosh80@gmail.com"];

const features: FeatureCard[] = [
  {
    icon: "💜",
    title: "Collection Tracker",
    text: "Track owned, needed, extras, notes, rarity, series progress, and more.",
    href: "/collection",
    cta: "Open tracker",
  },
  {
    icon: "🛍️",
    title: "Marketplace",
    text: "Browse collector listings and find the missing pieces your vault still needs.",
    href: "/marketplace",
    cta: "Browse finds",
  },
  {
    icon: "✨",
    title: "Sell Extras",
    text: "Turn duplicate Doorables into listings collectors can actually discover.",
    href: "/sell",
    cta: "List extras",
  },
  {
    icon: "💬",
    title: "Feedback Hub",
    text: "Request features, report issues, and help shape what gets added next.",
    href: "/feedback",
    cta: "Share ideas",
  },
];

const statPills: StatPill[] = [
  { value: "Mobile-first", label: "Built for collectors on the go" },
  { value: "Have / Need / Extra", label: "Simple collection status tracking" },
  { value: "Fan-made", label: "Designed for real collector chaos" },
];

const steps: StepCard[] = [
  {
    number: "01",
    title: "Add what you own",
    text: "Mark your Doorables as collected, needed, or extra so your list finally lives somewhere smarter than screenshots.",
  },
  {
    number: "02",
    title: "Find the gaps",
    text: "Search by name, movie, series, rarity, and notes to see what you still need before buying more duplicates.",
  },
  {
    number: "03",
    title: "Trade, sell, complete",
    text: "Use extras and marketplace tools to connect with other collectors and keep building your dream vault.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Is Adorable Vault official?",
    answer:
      "No. Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with Disney or Just Play.",
  },
  {
    question: "Can I use it on my phone?",
    answer:
      "Yes. This homepage and the collector flow are designed to work well on mobile so collectors can check their vault while shopping, trading, or live-selling.",
  },
  {
    question: "What can I track?",
    answer:
      "You can track what you own, what you still need, extras, notes, series progress, and collector-specific details depending on the tool you are using.",
  },
  {
    question: "How do referrals work?",
    answer:
      "If someone signs up with your username and becomes a paying customer, it can count toward your referral rewards. Ten qualified paid referrals can earn a free month.",
  },
];

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("This Week’s Updates");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = useMemo(
    () => ADMIN_EMAILS.includes(userEmail.toLowerCase()),
    [userEmail]
  );

  useEffect(() => {
    void loadPage();
  }, []);

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

  const announcementText =
    body.trim() ||
    "New updates are coming soon. More Doorables, more collector tools, and more ways to track, trade, and showcase your collection are on the way 💜";

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #ffffff;
          background:
            radial-gradient(circle at 8% 8%, rgba(192, 132, 252, 0.42) 0%, transparent 27%),
            radial-gradient(circle at 92% 6%, rgba(96, 165, 250, 0.32) 0%, transparent 25%),
            radial-gradient(circle at 74% 92%, rgba(244, 114, 182, 0.28) 0%, transparent 28%),
            linear-gradient(180deg, #050816 0%, #101827 44%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 74%);
        }

        .shell {
          position: relative;
          max-width: 1220px;
          margin: 0 auto;
          padding: 22px;
        }

        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .brandMark {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #ffffff;
          font-weight: 950;
          letter-spacing: -0.3px;
        }

        .brandIcon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #ffffff, #ddd6fe);
          color: #5b21b6;
          box-shadow: 0 14px 26px rgba(0,0,0,0.22);
        }

        .navLinks {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .navLink {
          color: rgba(255,255,255,0.86);
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.10);
        }

        .hero {
          position: relative;
          display: grid;
          grid-template-columns: 1.02fr 0.98fr;
          gap: 22px;
          align-items: center;
          border-radius: 34px;
          padding: 34px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.18), transparent 30%),
            linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(79, 70, 229, 0.90), rgba(14, 165, 233, 0.80));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 26px 70px rgba(0,0,0,0.38);
          overflow: hidden;
        }

        .hero::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          right: -160px;
          top: -170px;
          border-radius: 999px;
          background: rgba(255,255,255,0.13);
          filter: blur(1px);
        }

        .heroContent {
          position: relative;
          z-index: 2;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.16);
          font-size: 13px;
          font-weight: 950;
          margin-bottom: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .heroTitle {
          font-size: clamp(2.45rem, 6.2vw, 5.55rem);
          font-weight: 1000;
          line-height: 0.92;
          letter-spacing: -2.2px;
          margin: 0;
          text-wrap: balance;
        }

        .gradientText {
          color: #ffffff;
          text-shadow: 0 12px 34px rgba(0,0,0,0.24);
        }

        .heroText {
          margin-top: 18px;
          max-width: 770px;
          color: rgba(255,255,255,0.92);
          font-size: 18px;
          line-height: 1.68;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 26px;
        }

        .primaryButton,
        .secondaryButton,
        .darkButton {
          min-height: 50px;
          border-radius: 17px;
          padding: 13px 18px;
          font-weight: 950;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .darkButton:hover {
          transform: translateY(-2px);
        }

        .primaryButton {
          background: #ffffff;
          color: #312e81;
          box-shadow: 0 14px 26px rgba(255,255,255,0.16);
        }

        .secondaryButton {
          background: rgba(255,255,255,0.12);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.18);
        }

        .darkButton {
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 12px 22px rgba(79,70,229,0.26);
        }

        .microTrust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
          color: rgba(255,255,255,0.9);
          font-size: 13px;
          font-weight: 850;
        }

        .microTrust span {
          border-radius: 999px;
          padding: 8px 11px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .appPreview {
          position: relative;
          z-index: 2;
          border-radius: 30px;
          padding: 16px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(14px);
          box-shadow: 0 24px 56px rgba(0,0,0,0.28);
          text-decoration: none;
          color: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .appPreview:hover {
          transform: translateY(-3px);
          box-shadow: 0 30px 70px rgba(0,0,0,0.34);
        }

        .phoneMock {
          border-radius: 26px;
          background: linear-gradient(180deg, #f8fafc, #eef2ff);
          color: #111827;
          padding: 16px;
          min-height: 440px;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,0.06);
        }

        .phoneTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          font-weight: 950;
          color: #4338ca;
        }

        .searchMock {
          padding: 12px 13px;
          border-radius: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .miniGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .miniCard {
          border-radius: 18px;
          padding: 12px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          min-height: 108px;
          box-shadow: 0 10px 18px rgba(79,70,229,0.08);
        }

        .miniImage {
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ddd6fe, #bfdbfe);
          margin-bottom: 10px;
          display: grid;
          place-items: center;
          font-size: 22px;
        }

        .miniTitle {
          font-weight: 950;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .miniMeta {
          font-size: 12px;
          color: #6b7280;
          font-weight: 750;
        }

        .progressBlock {
          margin-top: 12px;
          border-radius: 20px;
          padding: 14px;
          background: linear-gradient(135deg, #312e81, #7c3aed);
          color: white;
        }

        .progressTitle {
          font-weight: 950;
          margin-bottom: 9px;
        }

        .progressBar {
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
          overflow: hidden;
        }

        .progressFill {
          width: 72%;
          height: 100%;
          border-radius: inherit;
          background: #ffffff;
        }

        .trustStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .statPill {
          border-radius: 22px;
          padding: 18px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.13);
          box-shadow: 0 14px 30px rgba(0,0,0,0.17);
        }

        .statValue {
          font-size: 19px;
          font-weight: 1000;
          margin-bottom: 4px;
        }

        .statLabel {
          color: rgba(255,255,255,0.78);
          font-size: 14px;
          line-height: 1.45;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .grid3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .card,
        .announcementCard {
          background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,252,0.97));
          color: #111827;
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 18px 38px rgba(0,0,0,0.19);
          border: 1px solid rgba(255,255,255,0.52);
        }

        .cardPurple {
          color: white;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent 32%),
            linear-gradient(135deg, #4f46e5, #7c3aed);
          border: 1px solid rgba(255,255,255,0.17);
        }

        .sectionEyebrow {
          color: #6d28d9;
          font-weight: 1000;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .cardPurple .sectionEyebrow {
          color: rgba(255,255,255,0.82);
        }

        .sectionTitle {
          font-size: clamp(1.35rem, 2.2vw, 2rem);
          font-weight: 1000;
          line-height: 1.1;
          letter-spacing: -0.7px;
          margin-bottom: 10px;
        }

        .muted {
          color: #4b5563;
          line-height: 1.72;
          font-size: 15px;
        }

        .cardPurple .muted {
          color: rgba(255,255,255,0.86);
        }

        .painList {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .painItem {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #374151;
          line-height: 1.45;
          font-weight: 800;
        }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .feature {
          background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(243,244,255,0.96));
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          text-decoration: none;
          min-height: 188px;
          box-shadow: 0 16px 32px rgba(0,0,0,0.16);
          border: 1px solid rgba(255,255,255,0.58);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .feature:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 44px rgba(0,0,0,0.22);
        }

        .emoji {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #ede9fe);
          font-size: 23px;
          margin-bottom: 13px;
        }

        .featureTitle {
          font-size: 18px;
          font-weight: 1000;
          margin-bottom: 7px;
          letter-spacing: -0.2px;
        }

        .featureCta {
          margin-top: 12px;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 1000;
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

        .field:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
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

        .saveButton:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .tiny {
          font-size: 13px;
          color: #6b7280;
        }

        .referralBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.16);
          font-weight: 950;
          margin-bottom: 14px;
        }

        .rewardBox {
          margin-top: 16px;
          padding: 16px;
          border-radius: 21px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.16);
          font-weight: 900;
          line-height: 1.55;
        }

        .stepCard {
          border-radius: 24px;
          padding: 20px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border: 1px solid rgba(255,255,255,0.54);
          box-shadow: 0 16px 32px rgba(0,0,0,0.16);
        }

        .stepNumber {
          color: #7c3aed;
          font-weight: 1000;
          font-size: 13px;
          letter-spacing: 0.12em;
          margin-bottom: 10px;
        }

        .miniPricing {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .priceCard {
          border-radius: 22px;
          padding: 18px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .priceCard.featuredPrice {
          background: linear-gradient(135deg, #eef2ff, #faf5ff);
          border-color: #c4b5fd;
        }

        .priceCard.bestValue {
          position: relative;
          background: linear-gradient(135deg, #f5f3ff, #eff6ff);
          border-color: #a78bfa;
          box-shadow: 0 14px 28px rgba(124,58,237,0.13);
        }

        .valueTag {
          display: inline-flex;
          margin-bottom: 9px;
          padding: 6px 10px;
          border-radius: 999px;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          font-size: 12px;
          font-weight: 1000;
        }

        .price {
          font-size: 30px;
          font-weight: 1000;
          color: #312e81;
          margin: 8px 0;
        }

        .price small {
          font-size: 13px;
          color: #6b7280;
        }

        .checkList {
          display: grid;
          gap: 8px;
          margin-top: 12px;
          color: #374151;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 780;
        }

        .faqGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .faqItem {
          border-radius: 19px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 15px;
        }

        .faqQ {
          font-weight: 1000;
          margin-bottom: 7px;
          color: #111827;
        }

        .disclaimer {
          margin-bottom: 90px;
        }

        .mobileSticky {
          display: none;
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 104px;
          }

          .topNav {
            align-items: flex-start;
          }

          .navLinks {
            display: none;
          }

          .hero {
            grid-template-columns: 1fr;
            padding: 22px;
            border-radius: 26px;
          }

          .heroText {
            font-size: 16px;
          }

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton,
          .darkButton {
            width: 100%;
          }

          .appPreview {
            padding: 10px;
            border-radius: 24px;
          }

          .phoneMock {
            min-height: auto;
            border-radius: 21px;
          }

          .trustStrip,
          .grid2,
          .grid3 {
            grid-template-columns: 1fr;
          }

          .featureGrid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .feature {
            min-height: 168px;
            padding: 16px;
            border-radius: 21px;
          }

          .card,
          .announcementCard,
          .stepCard {
            padding: 17px;
            border-radius: 23px;
          }

          .announcementBody {
            padding: 14px;
            font-size: 14px;
            min-height: 95px;
          }

          .miniPricing,
          .faqGrid {
            grid-template-columns: 1fr;
          }

          .mobileSticky {
            position: fixed;
            z-index: 50;
            left: 12px;
            right: 12px;
            bottom: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 10px;
            border-radius: 22px;
            background: rgba(15,23,42,0.82);
            border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 40px rgba(0,0,0,0.36);
          }

          .mobileSticky a {
            min-height: 46px;
            border-radius: 15px;
            font-size: 13px;
            padding: 10px 12px;
          }
        }

        @media (max-width: 560px) {
          .brandTextSmall {
            display: none;
          }

          .heroTitle {
            letter-spacing: -1.4px;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }

          .miniGrid {
            grid-template-columns: 1fr;
          }

          .microTrust {
            display: grid;
            grid-template-columns: 1fr;
          }

          .statPill {
            padding: 15px;
          }

          .disclaimer {
            margin-bottom: 110px;
          }
        }
      `}</style>

      <div className="shell">
        <nav className="topNav" aria-label="Main navigation">
          <Link href="/" className="brandMark">
            <span className="brandIcon">💜</span>
            <span>
              Adorable Vault
              <span className="brandTextSmall" style={{ display: "block", color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: 800 }}>
                Collector hub
              </span>
            </span>
          </Link>

          <div className="navLinks">
            <Link href="/collection" className="navLink">Tracker</Link>
            <Link href="/marketplace" className="navLink">Marketplace</Link>
            <Link href="/sell" className="navLink">Sell Extras</Link>
            <Link href="/pricing" className="navLink">Plans</Link>
          </div>
        </nav>

        <section className="hero">
          <div className="heroContent">
            <div className="badge">✨ Built by collectors, for collectors ✨</div>

            <h1 className="heroTitle">
              Track, trade & complete your <span className="gradientText">Doorables collection</span> 💜
            </h1>

            <div className="heroText">
              Welcome{username ? ` back, ${username}` : ""}! Adorable Vault helps collectors organize what they have,
              mark what they still need, list extras, browse marketplace finds, and stop guessing
              what is already in their collection.
            </div>

            <div className="buttonRow">
              <Link href="/collection" className="primaryButton">
                Start Your Collection
              </Link>
              <Link href="/marketplace" className="secondaryButton">
                Find Missing Pieces
              </Link>
              <Link href="/pricing" className="secondaryButton">
                View Plans
              </Link>
            </div>

            <div className="microTrust">
              <span>✅ Mobile-friendly</span>
              <span>✅ Built for have / need / extras</span>
              <span>✅ Fan-made collector tool</span>
            </div>
          </div>

          <Link href="/collection" className="appPreview" aria-label="Open the real collection tracker">
            <div className="phoneMock">
              <div className="phoneTop">
                <span>Open Your Real Vault</span>
                <span>Tap →</span>
              </div>

              <div className="searchMock">Search by name, series, movie...</div>

              <div className="miniGrid">
                <div className="miniCard">
                  <div className="miniImage">💜</div>
                  <div className="miniTitle">Owned</div>
                  <div className="miniMeta">Track your favorites</div>
                </div>
                <div className="miniCard">
                  <div className="miniImage">🔎</div>
                  <div className="miniTitle">Needed</div>
                  <div className="miniMeta">Find collection gaps</div>
                </div>
                <div className="miniCard">
                  <div className="miniImage">✨</div>
                  <div className="miniTitle">Extras</div>
                  <div className="miniMeta">Ready to trade or sell</div>
                </div>
                <div className="miniCard">
                  <div className="miniImage">🛍️</div>
                  <div className="miniTitle">Marketplace</div>
                  <div className="miniMeta">Browse collector finds</div>
                </div>
              </div>

              <div className="progressBlock">
                <div className="progressTitle">Series progress</div>
                <div className="progressBar">
                  <div className="progressFill" />
                </div>
                <div style={{ marginTop: 9, fontSize: 13, fontWeight: 850, opacity: 0.9 }}>
                  Keep going — your vault is getting closer.
                </div>
              </div>
            </div>
          </Link>
        </section>

        <section className="trustStrip" aria-label="Site highlights">
          {statPills.map((stat) => (
            <div className="statPill" key={stat.value}>
              <div className="statValue">{stat.value}</div>
              <div className="statLabel">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="grid2">
          <div className="announcementCard">
            <div className="sectionEyebrow">Vault news</div>
            <div className="sectionTitle">{loading ? "Loading updates..." : title}</div>
            <div className="muted">
              Weekly notes, new features, collector updates, secret codes, promos, and what is coming next.
            </div>

            <div className="announcementBody">{announcementText}</div>

            {isAdmin && (
              <div className="adminBox">
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Admin update box</div>

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

            {message && <div className="tiny" style={{ marginTop: 10 }}>{message}</div>}
          </div>

          <div className="card cardPurple">
            <div className="referralBadge">🎁 Referral rewards are live</div>
            <div className="sectionTitle">Invite collectors. Earn free months.</div>
            <div className="muted">
              If someone signs up with your username and becomes a paying customer,
              it can count toward your rewards.
            </div>

            <div className="rewardBox">
              Get 10 qualified paid referrals and earn a free month. Plus, keep an eye out
              for secret codes, riddles, giveaways, and limited free-year promos 👀
            </div>

            <Link href="/pricing" className="primaryButton" style={{ marginTop: 16 }}>
              Upgrade or Subscribe
            </Link>
          </div>
        </section>

        <section className="grid2">
          <div className="card">
            <div className="sectionEyebrow">The collector problem</div>
            <div className="sectionTitle">Stop relying on memory, screenshots, and messy spreadsheets.</div>
            <div className="muted">
              Doorables collecting gets chaotic fast. One extra blind bag, one live sale, one trade pile,
              and suddenly nobody knows what is owned, needed, or duplicated.
            </div>

            <div className="painList">
              <div className="painItem">❌ Buying duplicates because your list was not updated</div>
              <div className="painItem">❌ Losing track of extras that could be traded or sold</div>
              <div className="painItem">❌ Scrolling through photos instead of searching your vault</div>
            </div>
          </div>

          <div className="card">
            <div className="sectionEyebrow">The vault solution</div>
            <div className="sectionTitle">Everything a collector needs in one simple hub.</div>
            <div className="muted">
              Search faster, track cleaner, and make better buying decisions before checkout.
              Adorable Vault is designed to feel easy on both mobile and desktop.
            </div>

            <div className="painList">
              <div className="painItem">✅ Mark owned, needed, and extras</div>
              <div className="painItem">✅ Search by name, movie, rarity, series, and notes</div>
              <div className="painItem">✅ Use marketplace tools to find or sell missing pieces</div>
            </div>
          </div>
        </section>

        <section className="featureGrid" aria-label="Core features">
          {features.map((feature) => (
            <Link href={feature.href} className="feature" key={feature.title}>
              <div className="emoji">{feature.icon}</div>
              <div className="featureTitle">{feature.title}</div>
              <div className="muted">{feature.text}</div>
              <div className="featureCta">{feature.cta} →</div>
            </Link>
          ))}
        </section>

        <section className="grid3" aria-label="How it works">
          {steps.map((step) => (
            <div className="stepCard" key={step.number}>
              <div className="stepNumber">{step.number}</div>
              <div className="sectionTitle" style={{ fontSize: 23 }}>{step.title}</div>
              <div className="muted">{step.text}</div>
            </div>
          ))}
        </section>

        <section className="grid2">
          <div className="card">
            <div className="sectionEyebrow">Plans</div>
            <div className="sectionTitle">Start simple. Save big when your vault grows.</div>
            <div className="muted">
              Keep pricing easy to understand and collector-friendly. The $15 yearly plan is the best value for serious collectors who want their vault ready all year.
            </div>

            <div className="miniPricing">
              <div className="priceCard">
                <div style={{ fontWeight: 1000 }}>Starter</div>
                <div className="price">$0 <small>/ limited access</small></div>
                <div className="checkList">
                  <span>✅ Try the vault</span>
                  <span>✅ See how tracking works</span>
                  <span>✅ Great for new collectors</span>
                </div>
              </div>

              <div className="priceCard featuredPrice">
                <div style={{ fontWeight: 1000 }}>Collector Monthly</div>
                <div className="price">$3 <small>/ month</small></div>
                <div className="checkList">
                  <span>✅ Unlock full tracking</span>
                  <span>✅ Organize extras</span>
                  <span>✅ Flexible monthly access</span>
                </div>
              </div>

              <div className="priceCard bestValue">
                <div className="valueTag">Best value</div>
                <div style={{ fontWeight: 1000 }}>Collector Yearly</div>
                <div className="price">$15 <small>/ year</small></div>
                <div className="checkList">
                  <span>✅ Full collector access</span>
                  <span>✅ Save compared to monthly</span>
                  <span>✅ Best for serious collectors</span>
                </div>
              </div>
            </div>

            <Link href="/pricing" className="darkButton" style={{ marginTop: 16 }}>
              Compare Plans
            </Link>
          </div>

          <div className="card">
            <div className="sectionEyebrow">Built to grow</div>
            <div className="sectionTitle">More Doorables, more tools, more collector magic.</div>
            <div className="muted">
              The vault will keep growing with more series, better images, improved mobile tools,
              marketplace upgrades, collector profiles, and community-requested features.
            </div>

            <div className="announcementBody" style={{ minHeight: 0 }}>
              💜 Secret codes and limited promos
              <br />
              🌟 More series added regularly
              <br />
              🛍️ Marketplace and selling tools
              <br />
              📱 Mobile-first improvements
            </div>
          </div>
        </section>

        <section className="card">
          <div className="sectionEyebrow">Questions</div>
          <div className="sectionTitle">Quick answers for new collectors</div>
          <div className="faqGrid">
            {faqs.map((faq) => (
              <div className="faqItem" key={faq.question}>
                <div className="faqQ">{faq.question}</div>
                <div className="muted">{faq.answer}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card disclaimer">
          <div className="sectionTitle">Fan-made disclaimer</div>
          <div className="muted">
            Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with,
            sponsored by, or endorsed by Disney or Just Play. Character names and references are used only
            to help collectors organize and identify their collections.
          </div>
        </section>
      </div>

      <div className="mobileSticky" aria-label="Mobile quick actions">
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
