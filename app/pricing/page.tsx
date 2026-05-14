"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type PlanKey = "monthly" | "yearly" | "founding";

function cleanReferralUsername(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

export default function PricingPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");
  const [referralUsername, setReferralUsername] = useState("");

  const cleanReferral = cleanReferralUsername(referralUsername);

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        router.push("/login?next=/pricing");
        return;
      }

      if (cleanReferral) {
        const { error: referralError } = await supabase
          .from("users")
          .update({ referral_username_used: cleanReferral })
          .eq("id", user.id);

        if (referralError) {
          throw new Error("Could not save referral username: " + referralError.message);
        }
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          referralUsername: cleanReferral || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  };

  return (
    <main className="page">
      <style jsx global>{`
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
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.74) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.58) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.48) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.7;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active,
        .button,
        .button:visited,
        .primaryButton,
        .secondaryButton {
          color: inherit;
          text-decoration: none !important;
          text-decoration-line: none !important;
          -webkit-text-decoration-line: none !important;
          border-bottom: none !important;
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1240px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 108px;
        }

        .hero {
          text-align: center;
          border-radius: 34px;
          padding: 34px 26px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.18), transparent 38%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .badge {
          display: inline-flex;
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
          font-size: clamp(2.2rem, 6vw, 4.35rem);
          line-height: 0.95;
          letter-spacing: -1.9px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin: 16px auto 0;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          line-height: 1.65;
          max-width: 850px;
        }

        .heroActions {
          display: flex;
          justify-content: center;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .primaryButton,
        .secondaryButton,
        .primaryButton:visited,
        .secondaryButton:visited {
          min-height: 52px;
          border-radius: 999px;
          padding: 14px 20px;
          font-weight: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .primaryButton {
          color: #312e81 !important;
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton {
          color: white !important;
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .valueStrip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .valueBubble {
          border-radius: 22px;
          padding: 15px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
        }

        .valueNumber {
          font-size: 26px;
          font-weight: 1000;
          color: #fde68a;
          line-height: 1;
          margin-bottom: 6px;
        }

        .valueLabel {
          color: rgba(255,255,255,0.82);
          font-weight: 850;
          font-size: 13px;
          line-height: 1.35;
        }

        .conversionStrip {
          margin-bottom: 18px;
          border-radius: 28px;
          padding: 18px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.30), transparent 34%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.18), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(255,255,255,0.62);
          box-shadow: 0 20px 44px rgba(0,0,0,0.24);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .conversionTitle {
          color: #312e81;
          font-size: clamp(1.4rem, 3vw, 2rem);
          line-height: 1.06;
          font-weight: 1000;
          letter-spacing: -0.6px;
          margin-bottom: 6px;
        }

        .mutedText {
          color: #475569;
          line-height: 1.6;
          font-size: 15px;
          font-weight: 780;
        }

        .referralCard,
        .infoCard,
        .faqCard {
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.22), transparent 34%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border-radius: 26px;
          padding: 22px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.24);
          border: 1px solid rgba(255,255,255,0.60);
        }

        .referralCard {
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          align-items: center;
        }

        .referralTitle,
        .infoTitle {
          font-size: 23px;
          font-weight: 1000;
          margin-bottom: 6px;
          color: #312e81;
          letter-spacing: -0.4px;
        }

        .field {
          width: 100%;
          min-height: 50px;
          padding: 0 16px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          font-size: 16px;
          box-sizing: border-box;
          background: white;
          color: #111827;
          outline: none;
        }

        .field:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .cleanPreview {
          color: #64748b;
          font-size: 13px;
          margin-top: 7px;
          font-weight: 850;
        }

        .planGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
          margin-top: 8px;
          margin-bottom: 24px;
        }

        .planCard {
          position: relative;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.22), transparent 34%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          color: #0f172a;
          border-radius: 32px;
          padding: 24px;
          box-shadow:
            0 20px 42px rgba(0,0,0,0.24),
            inset 0 1px 0 rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.72);
          overflow: hidden;
          min-height: 0;
          height: auto;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .planCard:hover {
          transform: translateY(-3px);
          box-shadow:
            0 26px 58px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.90);
        }

        .planCard.popular {
          border: 3px solid #f59e0b;
          box-shadow:
            0 24px 50px rgba(245,158,11,0.18),
            0 20px 42px rgba(0,0,0,0.24),
            inset 0 1px 0 rgba(255,255,255,0.90);
        }

        .planCard.founding {
          background:
            radial-gradient(circle at top right, rgba(244,114,182,0.32), transparent 36%),
            radial-gradient(circle at bottom left, rgba(250,204,21,0.20), transparent 36%),
            linear-gradient(180deg, #ffffff, #fdf2f8);
          border: 3px solid #ec4899;
          box-shadow:
            0 24px 54px rgba(236,72,153,0.24),
            0 20px 42px rgba(0,0,0,0.24),
            inset 0 1px 0 rgba(255,255,255,0.90);
        }

        .popularTag,
        .foundingTag {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-bottom: 12px;
          color: #111827;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 1000;
          box-shadow: 0 12px 24px rgba(245,158,11,0.24);
        }

        .popularTag {
          background: linear-gradient(135deg, #f59e0b, #facc15);
        }

        .foundingTag {
          background: linear-gradient(135deg, #f472b6, #fde68a);
        }

        .planLabel {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }

        .planLabel.gold {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .planLabel.pink {
          background: #fce7f3;
          color: #be185d;
          border-color: #fbcfe8;
        }

        .planTitle {
          font-size: 27px;
          font-weight: 1000;
          line-height: 1.05;
          margin: 0;
          letter-spacing: -0.7px;
        }

        .priceRow {
          margin-top: 16px;
          margin-bottom: 10px;
        }

        .price {
          font-size: 48px;
          font-weight: 1000;
          letter-spacing: -1.8px;
          line-height: 1;
        }

        .period {
          font-size: 19px;
          font-weight: 850;
          color: #64748b;
          margin-left: 3px;
        }

        .description {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          margin: 0;
          font-weight: 780;
        }

        .dealNote {
          margin-top: 10px;
          border-radius: 14px;
          padding: 9px 10px;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 950;
        }

        .featureList {
          display: grid;
          gap: 10px;
          margin: 22px 0 18px;
          padding: 0;
          list-style: none;
        }

        .featureList li {
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 8px;
          color: #334155;
          line-height: 1.4;
          font-weight: 820;
          font-size: 14px;
        }

        .button,
        .button:visited {
          margin-top: auto;
          min-height: 52px;
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 14px 18px;
          font-size: 15px;
          font-weight: 1000;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          color: white;
          box-shadow: 0 14px 28px rgba(79,70,229,0.22);
          font-family: inherit;
        }

        .buttonFree,
        .buttonFree:visited {
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          box-shadow: 0 10px 18px rgba(99,102,241,0.10);
        }

        .buttonMonthly {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }

        .buttonYearly {
          background: linear-gradient(135deg, #f59e0b, #f97316);
          color: white;
          box-shadow: 0 14px 28px rgba(245,158,11,0.26);
        }

        .buttonFounding {
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          box-shadow: 0 14px 30px rgba(236,72,153,0.32);
        }

        .button:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .compareCard {
          margin-bottom: 18px;
          border-radius: 28px;
          padding: 20px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.20), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(255,255,255,0.62);
          box-shadow: 0 20px 44px rgba(0,0,0,0.24);
        }

        .compareGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 14px;
        }

        .compareBox {
          border-radius: 20px;
          padding: 15px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
        }

        .compareBox.best {
          background: linear-gradient(135deg, #fef3c7, #fce7f3);
          border-color: #f9a8d4;
        }

        .belowGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .miniList {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .miniItem {
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
          font-weight: 800;
        }

        .errorBox {
          margin-bottom: 18px;
          background: rgba(239,68,68,0.14);
          border: 1px solid rgba(254,202,202,0.36);
          color: #fecaca;
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 850;
        }

        .finePrint {
          text-align: center;
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
          max-width: 900px;
          margin: 22px auto 0;
        }

        .mobileSticky {
          display: none;
        }

        @media (max-width: 1180px) {
          .planGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .shell {
            padding: 12px;
            padding-bottom: 92px;
          }

          .hero {
            border-radius: 24px;
            padding: 22px 16px;
            margin-bottom: 12px;
          }

          .badge {
            padding: 7px 10px;
            font-size: 12px;
            margin-bottom: 11px;
          }

          .headline {
            font-size: clamp(1.85rem, 9.4vw, 2.8rem);
            line-height: 0.98;
            letter-spacing: -1.3px;
          }

          .heroText {
            font-size: 14px;
            line-height: 1.48;
            margin-top: 12px;
          }

          .heroActions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 14px;
          }

          .valueStrip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 12px 0;
          }

          .valueBubble {
            padding: 11px;
            border-radius: 17px;
          }

          .valueNumber {
            font-size: 22px;
          }

          .valueLabel {
            font-size: 11px;
          }

          .conversionStrip {
            grid-template-columns: 1fr;
            padding: 15px;
            border-radius: 22px;
            margin-bottom: 12px;
          }

          .conversionTitle {
            font-size: clamp(1.25rem, 6vw, 1.6rem);
          }

          .mutedText {
            font-size: 13px;
            line-height: 1.5;
          }

          .referralCard {
            grid-template-columns: 1fr;
            border-radius: 22px;
            padding: 15px;
            margin-bottom: 12px;
          }

          .referralTitle,
          .infoTitle {
            font-size: 19px;
          }

          .field {
            min-height: 48px;
            font-size: 15px;
          }

          .planGrid,
          .belowGrid,
          .compareGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .planGrid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 12px;
            padding-bottom: 6px;
            scrollbar-width: none;
            margin-bottom: 14px;
          }

          .planGrid::-webkit-scrollbar {
            display: none;
          }

          .planCard {
            flex: 0 0 84%;
            border-radius: 24px;
            padding: 18px;
            scroll-snap-align: start;
          }

          .planTitle {
            font-size: 23px;
          }

          .price {
            font-size: 38px;
          }

          .period {
            font-size: 15px;
          }

          .description,
          .featureList li {
            font-size: 12.5px;
          }

          .featureList {
            gap: 8px;
            margin-top: 15px;
          }

          .button {
            min-height: 46px;
            font-size: 13px;
          }

          .compareCard,
          .infoCard,
          .faqCard {
            border-radius: 22px;
            padding: 15px;
          }

          .miniItem {
            grid-template-columns: 28px 1fr;
            padding: 10px;
            border-radius: 14px;
            font-size: 12.5px;
          }

          .finePrint {
            margin-bottom: 70px;
          }

          .mobileSticky {
            position: fixed;
            z-index: 60;
            left: 12px;
            right: 12px;
            bottom: 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-radius: 18px;
            background: rgba(15,23,42,0.9);
            border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 40px rgba(0,0,0,0.36);
          }

          .mobileSticky a,
          .mobileSticky button {
            min-height: 42px;
            border-radius: 15px;
            padding: 10px 12px;
            font-size: 12.5px;
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
            border: 1px solid rgba(255,255,255,0.38);
            font-weight: 1000;
            font-family: inherit;
            cursor: pointer;
          }

          .mobileSticky .stickyBest {
            background: linear-gradient(135deg, #f59e0b, #f97316);
            box-shadow: 0 12px 28px rgba(249,115,22,0.34);
          }

          .mobileSticky .stickyFree {
            background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
            box-shadow: 0 12px 28px rgba(124,58,237,0.44);
          }
        }

        @media (max-width: 520px) {
          .valueStrip {
            grid-template-columns: 1fr 1fr;
          }

          .planCard {
            flex-basis: 88%;
          }

          .mobileSticky {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 390px) {
          .valueStrip {
            grid-template-columns: 1fr;
          }

          .planCard {
            flex-basis: 92%;
          }

          .price {
            font-size: 34px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="badge">✨ Collector plans ✨</div>

          <h1 className="headline">Start free. Upgrade when your collection outgrows chaos.</h1>

          <p className="heroText">
            Try Adorable Vault with up to <strong>50 saved Doorables</strong>. When you are ready,
            unlock unlimited tracking, Marketplace access, selling tools, collector messages, public profiles,
            and the full ad-free vault experience.
          </p>

          <div className="heroActions">
            <Link href="/demo" className="primaryButton">
              Preview First 👀
            </Link>
            <Link href="/login?next=/collection" className="secondaryButton">
              Start Free Tracking 💜
            </Link>
          </div>

          <div className="valueStrip">
            <div className="valueBubble">
              <div className="valueNumber">50</div>
              <div className="valueLabel">free saved Doorables</div>
            </div>
            <div className="valueBubble">
              <div className="valueNumber">$3</div>
              <div className="valueLabel">monthly full access</div>
            </div>
            <div className="valueBubble">
              <div className="valueNumber">$15</div>
              <div className="valueLabel">best yearly value</div>
            </div>
            <div className="valueBubble">
              <div className="valueNumber">0 ads</div>
              <div className="valueLabel">clean collector experience</div>
            </div>
          </div>
        </section>

        <section className="conversionStrip">
          <div>
            <div className="conversionTitle">Best value: $15/year keeps the whole vault unlocked.</div>
            <div className="mutedText">
              Monthly is flexible, but yearly is the collector-friendly deal: unlimited tracking,
              marketplace tools, messaging, profile sharing, and selling extras for about $1.25/month.
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleCheckout("yearly")}
            disabled={loadingPlan !== null}
            className="button buttonYearly"
            style={{ maxWidth: 260 }}
          >
            {loadingPlan === "yearly" ? "Opening..." : "Get Yearly 🚀"}
          </button>
        </section>

        <section className="referralCard">
          <div>
            <div className="referralTitle">Referral username 💜</div>
            <div className="mutedText">
              If another collector sent you here, enter their username before checkout. After 10 paid referrals,
              they earn a free month. You can enter it with or without the @ symbol.
            </div>
          </div>

          <div>
            <input
              value={referralUsername}
              onChange={(e) => setReferralUsername(e.target.value)}
              placeholder="Example: old_unique"
              className="field"
              autoComplete="off"
            />
            {cleanReferral ? (
              <div className="cleanPreview">
                Saving referral as: @{cleanReferral}
              </div>
            ) : null}
          </div>
        </section>

        {error ? <div className="errorBox">{error}</div> : null}

        <section className="planGrid">
          <PlanCard
            label="Free"
            title="Starter Vault 💜"
            price="$0"
            period=""
            description="Perfect for trying the tracker and organizing a smaller starter collection."
            bullets={[
              "Save up to 50 Doorables",
              "Track Have, Need, and Extras",
              "Use collection search and filters",
              "See series progress",
              "Upgrade only when you are ready",
            ]}
            buttonElement={
              <Link href="/login?next=/collection" className="button buttonFree">
                Start Free
              </Link>
            }
          />

          <PlanCard
            label="Flexible"
            title="Monthly 💎"
            price="$3"
            period="/month"
            description="Unlock everything without a big commitment. Great for testing the full vault."
            dealNote="Recurring monthly subscription. Renews until canceled."
            bullets={[
              "Unlimited collection saves",
              "Marketplace browsing",
              "Create and manage listings",
              "Message sellers and collectors",
              "Public collector profile tools",
              "Photo submissions",
            ]}
            buttonElement={
              <button
                type="button"
                onClick={() => void handleCheckout("monthly")}
                disabled={loadingPlan !== null}
                className="button buttonMonthly"
              >
                {loadingPlan === "monthly" ? "Opening Checkout..." : "Start Monthly ✨"}
              </button>
            }
          />

          <PlanCard
            label="Best Value"
            popular
            title="Yearly 🔥"
            price="$15"
            period="/year"
            description="The best deal for collectors who want the full vault open all year."
            dealNote="Only about $1.25/month when paid yearly. Renews yearly until canceled."
            bullets={[
              "Lowest overall cost",
              "Unlimited collection saves",
              "Marketplace and selling unlocked",
              "Collector messages",
              "Public collector profile tools",
              "Best for serious collectors",
            ]}
            buttonElement={
              <button
                type="button"
                onClick={() => void handleCheckout("yearly")}
                disabled={loadingPlan !== null}
                className="button buttonYearly"
              >
                {loadingPlan === "yearly" ? "Opening Checkout..." : "Get Best Deal 🚀"}
              </button>
            }
          />

          <PlanCard
            label="Launch Bundle"
            founding
            title="Founding Collector 🎁"
            price="$20"
            period="/year"
            description="A limited launch bundle for collectors who want yearly access plus a physical thank-you gift."
            dealNote="Includes one year of access plus a fan-made keychain while supplies last. Renews yearly until canceled."
            bullets={[
              "1 full year of unlimited access",
              "Limited edition Adorable Vault keychain",
              "Marketplace and selling unlocked",
              "Collector messages",
              "Shipping address collected in Stripe",
              "Available while supplies last",
            ]}
            buttonElement={
              <button
                type="button"
                onClick={() => void handleCheckout("founding")}
                disabled={loadingPlan !== null}
                className="button buttonFounding"
              >
                {loadingPlan === "founding" ? "Opening Checkout..." : "Get Bundle + Keychain 💜"}
              </button>
            }
          />
        </section>

        <section className="compareCard">
          <div className="infoTitle">Which plan should I pick?</div>
          <div className="mutedText">
            Most collectors should start free or choose yearly. Monthly is great for trying full access,
            but yearly gives the best value if Adorable Vault becomes your main collector hub.
          </div>

          <div className="compareGrid">
            <div className="compareBox">
              <div className="infoTitle" style={{ fontSize: 18 }}>Start Free</div>
              <div className="mutedText">
                Choose this if you are curious, want to test the tracker, or only need up to 50 saves right now.
              </div>
            </div>
            <div className="compareBox best">
              <div className="infoTitle" style={{ fontSize: 18 }}>Go Yearly</div>
              <div className="mutedText">
                Choose this if you collect regularly, sell/trade extras, or want unlimited tracking all year.
              </div>
            </div>
          </div>
        </section>

        <section className="belowGrid">
          <div className="infoCard">
            <div className="infoTitle">Why upgrade?</div>
            <div className="mutedText">
              Full Access is for collectors who want Adorable Vault as their main collection home base —
              not just a tiny starter checklist.
            </div>

            <div className="miniList">
              <div className="miniItem">
                <span>♾️</span>
                <span>Track unlimited Doorables instead of stopping at the free 50-save limit.</span>
              </div>
              <div className="miniItem">
                <span>🛍️</span>
                <span>Browse Marketplace, create listings, and organize extras you want to sell or trade.</span>
              </div>
              <div className="miniItem">
                <span>💬</span>
                <span>Message sellers and collectors directly through the site.</span>
              </div>
              <div className="miniItem">
                <span>🚫</span>
                <span>Support a clean, ad-free collector tool instead of banner clutter.</span>
              </div>
            </div>
          </div>

          <div className="faqCard">
            <div className="infoTitle">Quick answers</div>

            <div className="miniList">
              <div className="miniItem">
                <span>✅</span>
                <span>Free users can save up to 50 Doorables and still try the collection tracker.</span>
              </div>
              <div className="miniItem">
                <span>🔐</span>
                <span>Checkout is handled through Stripe. Adorable Vault does not store card details.</span>
              </div>
              <div className="miniItem">
                <span>🎁</span>
                <span>The Founding Collector Bundle collects a shipping address in Stripe for keychain mailing.</span>
              </div>
              <div className="miniItem">
                <span>🔁</span>
                <span>Paid plans are recurring subscriptions and renew until canceled.</span>
              </div>
            </div>
          </div>
        </section>

        <p className="finePrint">
          Adorable Vault is a fan-made collector tool and is not affiliated with, sponsored by, or endorsed
          by Disney or Just Play. Paid plans are recurring subscriptions that renew until canceled. Checkout is handled through Stripe.
          Marketplace transactions are handled directly between buyers and sellers. Keychain bundle is limited and available while supplies last.
        </p>
      </div>

      <div className="mobileSticky">
        <Link href="/login?next=/collection" className="stickyFree">
          💜 Start Free
        </Link>
        <button
          type="button"
          className="stickyBest"
          onClick={() => void handleCheckout("yearly")}
          disabled={loadingPlan !== null}
        >
          {loadingPlan === "yearly" ? "Opening..." : "🔥 Best Deal"}
        </button>
      </div>
    </main>
  );
}

function PlanCard(props: {
  label: string;
  popular?: boolean;
  founding?: boolean;
  title: string;
  price: string;
  period: string;
  description: string;
  dealNote?: string;
  bullets: string[];
  buttonElement: ReactNode;
}) {
  return (
    <section
      className={`planCard ${props.popular ? "popular" : ""} ${
        props.founding ? "founding" : ""
      }`}
    >
      {props.popular ? <div className="popularTag">MOST POPULAR</div> : null}
      {props.founding ? <div className="foundingTag">LIMITED KEYCHAIN BUNDLE</div> : null}

      <div
        className={`planLabel ${props.popular ? "gold" : ""} ${
          props.founding ? "pink" : ""
        }`}
      >
        {props.label}
      </div>

      <h2 className="planTitle">{props.title}</h2>

      <div className="priceRow">
        <span className="price">{props.price}</span>
        {props.period ? <span className="period">{props.period}</span> : null}
      </div>

      <p className="description">{props.description}</p>

      {props.dealNote ? <div className="dealNote">{props.dealNote}</div> : null}

      <ul className="featureList">
        {props.bullets.map((bullet) => (
          <li key={bullet}>
            <span>✅</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {props.buttonElement}
    </section>
  );
}
