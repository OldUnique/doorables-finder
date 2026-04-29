"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type PlanKey = "monthly" | "yearly";

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

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const cleanReferral = cleanReferralUsername(referralUsername);

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
          opacity: 0.7;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 84px;
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
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 31px;
          background: radial-gradient(circle at top left, #fef3c7, #a855f7 48%, #020617);
          box-shadow: 0 18px 38px rgba(168, 85, 247, 0.42);
          flex: 0 0 auto;
        }

        .brandTitle {
          display: block;
          font-size: clamp(1.45rem, 4vw, 2.15rem);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.8px;
          background: linear-gradient(90deg, #fef3c7, #f0abfc, #bfdbfe);
          -webkit-background-clip: text;
          color: transparent;
        }

        .brandSub {
          display: block;
          margin-top: 5px;
          color: #d8b4fe;
          font-weight: 950;
          font-size: 14px;
        }

        .navActions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .navPill,
        .navPill:visited {
          color: white;
          text-decoration: none;
          font-weight: 950;
          padding: 11px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 10px 24px rgba(0,0,0,0.15);
        }

        .hero {
          text-align: center;
          border-radius: 34px;
          padding: 34px 26px;
          margin-bottom: 20px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
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
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.15rem, 6vw, 4rem);
          line-height: 0.97;
          letter-spacing: -1.8px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin: 16px auto 0;
          color: rgba(255,255,255,0.88);
          font-size: 17px;
          line-height: 1.65;
          max-width: 770px;
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

        .referralCard,
        .infoCard,
        .faqCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
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

        .referralTitle {
          font-size: 23px;
          font-weight: 1000;
          margin-bottom: 6px;
          color: #312e81;
        }

        .mutedText {
          color: #475569;
          line-height: 1.6;
          font-size: 15px;
        }

        .field {
          width: 100%;
          padding: 14px 16px;
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

        .planGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .planCard {
          position: relative;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #0f172a;
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 22px 50px rgba(0,0,0,0.28);
          border: 1px solid rgba(255,255,255,0.62);
          overflow: hidden;
        }

        .planCard.popular {
          border: 3px solid #f59e0b;
          transform: translateY(-6px);
        }

        .planCard.popular::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(245,158,11,0.18), transparent 34%);
          pointer-events: none;
        }

        .popularTag {
          position: absolute;
          top: 14px;
          right: 14px;
          background: linear-gradient(135deg, #f59e0b, #facc15);
          color: #111827;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 1000;
          box-shadow: 0 12px 24px rgba(245,158,11,0.24);
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

        .planTitle {
          font-size: 29px;
          font-weight: 1000;
          line-height: 1.05;
          margin: 0;
        }

        .priceRow {
          margin-top: 16px;
          margin-bottom: 10px;
        }

        .price {
          font-size: 50px;
          font-weight: 1000;
          letter-spacing: -1.8px;
          line-height: 1;
        }

        .period {
          font-size: 21px;
          font-weight: 850;
          color: #64748b;
          margin-left: 3px;
        }

        .description {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          margin: 0;
        }

        .featureList {
          display: grid;
          gap: 10px;
          margin: 22px 0 0;
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
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          color: white;
          box-shadow: 0 14px 28px rgba(79,70,229,0.22);
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

        .button:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .belowGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .infoTitle {
          font-size: 22px;
          font-weight: 1000;
          color: #312e81;
          margin-bottom: 10px;
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
          max-width: 850px;
          margin: 22px auto 0;
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 60px;
          }

          .topNav {
            align-items: flex-start;
          }

          .brandIcon {
            width: 54px;
            height: 54px;
            font-size: 29px;
          }

          .navPill:not(.homePill) {
            display: none;
          }

          .hero {
            border-radius: 26px;
            padding: 24px 18px;
          }

          .valueStrip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .referralCard {
            grid-template-columns: 1fr;
            border-radius: 22px;
            padding: 18px;
          }

          .planGrid,
          .belowGrid {
            grid-template-columns: 1fr;
          }

          .planCard {
            border-radius: 24px;
            padding: 20px;
          }

          .planCard.popular {
            transform: none;
          }
        }

        @media (max-width: 440px) {
          .valueStrip {
            grid-template-columns: 1fr;
          }

          .price {
            font-size: 44px;
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
            <Link href="/" className="navPill homePill">
              Home
            </Link>
            <Link href="/collection" className="navPill">
              Collection
            </Link>
            <Link href="/about" className="navPill">
              About
            </Link>
            <Link href="/login" className="navPill">
              Login
            </Link>
          </div>
        </nav>

        <section className="hero">
          <div className="badge">✨ Collector plans ✨</div>

          <h1 className="headline">Start free, upgrade when your vault needs more room.</h1>

          <p className="heroText">
            Free accounts can save up to <strong>50 Doorables</strong>. Upgrade to unlock unlimited
            collection tracking, Marketplace access, selling tools, messages, public collector features,
            and the full Adorable Vault experience.
          </p>

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
              <div className="valueLabel">yearly best value</div>
            </div>
            <div className="valueBubble">
              <div className="valueNumber">💜</div>
              <div className="valueLabel">built for collectors</div>
            </div>
          </div>
        </section>

        <section className="referralCard">
          <div>
            <div className="referralTitle">Referral username 💜</div>
            <div className="mutedText">
              If someone referred you, enter their username before checkout. After 10 paid referrals,
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
            {cleanReferralUsername(referralUsername) ? (
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 7, fontWeight: 800 }}>
                Saving referral as: @{cleanReferralUsername(referralUsername)}
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
            description="Perfect for trying the tracker and organizing a smaller collection."
            bullets={[
              "Save up to 50 Doorables",
              "Track have, need, and extras",
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
            description="Unlock the full collector experience without a big commitment."
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
            description="The best deal for collectors who want everything unlocked all year."
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
        </section>

        <section className="belowGrid">
          <div className="infoCard">
            <div className="infoTitle">Why upgrade?</div>
            <div className="mutedText">
              Full Access is for collectors who want to use Adorable Vault as their main collection hub —
              not just a small checklist.
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
                <span>🧾</span>
                <span>You can use monthly for flexibility or yearly for the best value.</span>
              </div>
            </div>
          </div>
        </section>

        <p className="finePrint">
          Adorable Vault is a fan-made collector tool and is not affiliated with, sponsored by, or endorsed
          by Disney or Just Play. Marketplace transactions are handled directly between buyers and sellers.
        </p>
      </div>
    </main>
  );
}

function PlanCard(props: {
  label: string;
  popular?: boolean;
  title: string;
  price: string;
  period: string;
  description: string;
  bullets: string[];
  buttonElement: React.ReactNode;
}) {
  return (
    <section className={`planCard ${props.popular ? "popular" : ""}`}>
      {props.popular ? <div className="popularTag">MOST POPULAR</div> : null}

      <div className={`planLabel ${props.popular ? "gold" : ""}`}>
        {props.label}
      </div>

      <h2 className="planTitle">{props.title}</h2>

      <div className="priceRow">
        <span className="price">{props.price}</span>
        {props.period ? <span className="period">{props.period}</span> : null}
      </div>

      <p className="description">{props.description}</p>

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
