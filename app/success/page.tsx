"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlanKey = "monthly" | "yearly" | "founding" | "unknown";

function normalizePlan(value: string | null): PlanKey {
  const clean = String(value || "").toLowerCase().trim();

  if (clean === "monthly") return "monthly";
  if (clean === "yearly") return "yearly";
  if (clean === "founding") return "founding";

  return "unknown";
}

function getPlanMeta(plan: PlanKey) {
  if (plan === "monthly") {
    return {
      emoji: "💎",
      label: "Collector Monthly",
      headline: "You’re in — your vault is unlocked!",
      subline:
        "Monthly Full Access is active. You can start tracking without the 50-save limit, browse Marketplace, message collectors, and organize your extras.",
      badge: "Monthly Full Access",
      note: "Your monthly subscription renews automatically until canceled.",
      nextBest: "Start by opening your collection and saving the Doorables you already have.",
    };
  }

  if (plan === "yearly") {
    return {
      emoji: "🔥",
      label: "Collector Yearly",
      headline: "Best deal unlocked — welcome to the full vault!",
      subline:
        "Yearly Full Access is active. You now have unlimited collection tracking, Marketplace tools, messaging, selling features, and public collector profile options.",
      badge: "Yearly Full Access",
      note: "Your yearly subscription renews automatically until canceled.",
      nextBest: "Start by opening your collection, then share your collector profile when it is ready.",
    };
  }

  if (plan === "founding") {
    return {
      emoji: "🎁",
      label: "Founding Collector",
      headline: "Founding Collector unlocked — you’re officially vault royalty!",
      subline:
        "Your Founding Collector bundle includes one year of Full Access plus the limited Adorable Vault keychain while supplies last.",
      badge: "Founding Collector Bundle",
      note:
        "Your shipping address was collected through Stripe for the keychain. Your yearly access renews automatically until canceled.",
      nextBest: "Start with your collection, then check your account details and collector profile.",
    };
  }

  return {
    emoji: "💜",
    label: "Full Access",
    headline: "Payment successful — welcome to the vault!",
    subline:
      "Your upgrade is being applied. You can open your collection now, and your account should unlock automatically once Stripe confirms the payment.",
    badge: "Payment Successful",
    note:
      "If access does not update right away, refresh your account page in a minute. Stripe webhooks sometimes need a moment.",
    nextBest: "Open your collection first, then check your account if anything looks delayed.",
  };
}

export default function SuccessPage() {
  const [plan, setPlan] = useState<PlanKey>("unknown");
  const [sessionId, setSessionId] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPlan = normalizePlan(params.get("plan"));
    const nextSessionId = String(params.get("session_id") || "");

    setPlan(nextPlan);
    setSessionId(nextSessionId);

    // This is only a helpful local UI flag. Real access should still be controlled
    // by your Supabase user subscription status from the Stripe webhook.
    localStorage.setItem("doorables_subscribed", "true");
    localStorage.setItem("adorable_vault_last_checkout_plan", nextPlan);
    if (nextSessionId) {
      localStorage.setItem("adorable_vault_last_checkout_session", nextSessionId);
    }

    const timer = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const planMeta = useMemo(() => getPlanMeta(plan), [plan]);

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
          opacity: 0.72;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active {
          color: inherit;
          text-decoration: none !important;
          text-decoration-line: none !important;
          -webkit-text-decoration-line: none !important;
          border-bottom: none !important;
        }

        .shell {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px;
          padding-bottom: 96px;
          box-sizing: border-box;
        }

        .hero {
          min-height: calc(100vh - 48px);
          display: grid;
          align-items: center;
        }

        .successCard {
          border-radius: 36px;
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%),
            radial-gradient(circle at bottom left, rgba(236,72,153,0.20), transparent 38%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 28px 76px rgba(0,0,0,0.42);
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(330px, 0.95fr);
          gap: 20px;
          align-items: stretch;
        }

        .mainPanel,
        .sidePanel {
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .mainPanel {
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.14), transparent 32%),
            rgba(15,23,42,0.36);
          display: grid;
          align-content: center;
        }

        .sidePanel {
          padding: 20px;
          background: rgba(15,23,42,0.42);
        }

        .successIcon {
          width: 82px;
          height: 82px;
          border-radius: 28px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          font-size: 42px;
          background: linear-gradient(135deg, #fef3c7, #f5d0fe, #bfdbfe);
          color: #312e81;
          box-shadow: 0 18px 42px rgba(255,255,255,0.16);
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
          margin-bottom: 14px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.15rem, 5.7vw, 4.3rem);
          line-height: 0.95;
          letter-spacing: -1.9px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 16px;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          line-height: 1.65;
          max-width: 760px;
        }

        .noteBox {
          margin-top: 16px;
          border-radius: 19px;
          padding: 13px 14px;
          color: #fef3c7;
          background: rgba(250,204,21,0.10);
          border: 1px solid rgba(253,224,71,0.26);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 850;
        }

        .actionGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
          margin-top: 22px;
        }

        .actionCard,
        .actionCard:visited {
          min-height: 86px;
          border-radius: 22px;
          padding: 14px;
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 12px;
          align-items: center;
          color: white !important;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 34%),
            linear-gradient(135deg, rgba(15,23,42,0.56), rgba(79,70,229,0.60));
          border: 1px solid rgba(255,255,255,0.20);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .actionCard:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.38);
          box-shadow: 0 20px 42px rgba(0,0,0,0.30);
        }

        .actionCard.primary {
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.16), transparent 34%),
            linear-gradient(135deg, rgba(236,72,153,0.70), rgba(79,70,229,0.70));
        }

        .actionIcon {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          font-size: 25px;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          color: #312e81;
        }

        .actionTitle {
          display: block;
          font-weight: 1000;
          line-height: 1.12;
        }

        .actionSub {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.74);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.28;
        }

        .sideTitle {
          color: #fde68a;
          font-size: 15px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .miniList {
          display: grid;
          gap: 10px;
        }

        .miniItem {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: start;
          padding: 12px;
          border-radius: 17px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.13);
          color: rgba(255,255,255,0.88);
          line-height: 1.45;
          font-weight: 820;
          font-size: 13px;
        }

        .miniItem strong {
          color: #ffffff;
        }

        .statusBox {
          margin-top: 14px;
          border-radius: 18px;
          padding: 13px;
          color: #111827;
          background: linear-gradient(135deg, #ffffff, #fef3c7);
          border: 1px solid rgba(255,255,255,0.50);
          font-size: 13px;
          line-height: 1.45;
          font-weight: 850;
        }

        .smallPrint {
          margin-top: 14px;
          color: rgba(255,255,255,0.62);
          font-size: 12px;
          line-height: 1.45;
          word-break: break-word;
        }

        .loadingPulse {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #fde68a;
          animation: pulse 1s infinite ease-in-out;
        }

        .dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.35;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        @media (max-width: 980px) {
          .shell {
            padding: 12px;
            padding-bottom: 84px;
          }

          .hero {
            min-height: auto;
            padding: 10px 0;
          }

          .successCard {
            grid-template-columns: 1fr;
            border-radius: 25px;
            padding: 13px;
            gap: 12px;
          }

          .mainPanel,
          .sidePanel {
            border-radius: 21px;
          }

          .mainPanel {
            padding: 18px;
          }

          .sidePanel {
            padding: 15px;
          }

          .successIcon {
            width: 64px;
            height: 64px;
            border-radius: 22px;
            font-size: 33px;
            margin-bottom: 13px;
          }

          .badge {
            padding: 7px 10px;
            font-size: 12px;
            margin-bottom: 10px;
          }

          .headline {
            font-size: clamp(1.9rem, 9vw, 2.7rem);
            line-height: 0.98;
            letter-spacing: -1.2px;
          }

          .heroText {
            font-size: 14px;
            line-height: 1.48;
            margin-top: 12px;
          }

          .noteBox {
            font-size: 12.5px;
            border-radius: 16px;
            padding: 11px;
          }

          .actionGrid {
            grid-template-columns: 1fr;
            gap: 9px;
            margin-top: 14px;
          }

          .actionCard {
            min-height: 72px;
            border-radius: 18px;
            padding: 11px;
          }

          .actionSub {
            font-size: 11.5px;
          }

          .miniItem {
            grid-template-columns: 28px 1fr;
            padding: 10px;
            border-radius: 14px;
            font-size: 12.5px;
          }
        }

        @media (max-width: 420px) {
          .actionCard {
            grid-template-columns: 42px 1fr;
          }

          .actionIcon {
            width: 42px;
            height: 42px;
            border-radius: 15px;
            font-size: 22px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="successCard">
            <div className="mainPanel">
              <div className="successIcon">{planMeta.emoji}</div>

              <div className="badge">
                {ready ? "✅ Payment successful" : (
                  <span className="loadingPulse">
                    Confirming <span className="dot" /><span className="dot" /><span className="dot" />
                  </span>
                )}
              </div>

              <h1 className="headline">{planMeta.headline}</h1>

              <div className="heroText">{planMeta.subline}</div>

              <div className="noteBox">
                <strong>{planMeta.badge}:</strong> {planMeta.note}
              </div>

              <div className="actionGrid">
                <Link href="/collection" className="actionCard primary">
                  <span className="actionIcon">💜</span>
                  <span>
                    <span className="actionTitle">Open Collection</span>
                    <span className="actionSub">Start tracking unlimited Doorables.</span>
                  </span>
                </Link>

                <Link href="/account" className="actionCard">
                  <span className="actionIcon">⚙️</span>
                  <span>
                    <span className="actionTitle">Account Settings</span>
                    <span className="actionSub">Check username, visibility, and plan details.</span>
                  </span>
                </Link>

                <Link href="/marketplace" className="actionCard">
                  <span className="actionIcon">🛍️</span>
                  <span>
                    <span className="actionTitle">Browse Marketplace</span>
                    <span className="actionSub">Look for collector extras and listings.</span>
                  </span>
                </Link>

                <Link href="/sell" className="actionCard">
                  <span className="actionIcon">🏷️</span>
                  <span>
                    <span className="actionTitle">Sell Extras</span>
                    <span className="actionSub">Turn duplicates into clean listings.</span>
                  </span>
                </Link>
              </div>
            </div>

            <aside className="sidePanel">
              <div className="sideTitle">What to do next</div>

              <div className="miniList">
                <div className="miniItem">
                  <span>1️⃣</span>
                  <span><strong>Open your collection.</strong> Add what you own, mark what you need, and clean up extras.</span>
                </div>

                <div className="miniItem">
                  <span>2️⃣</span>
                  <span><strong>Set your profile visibility.</strong> Keep it private, show extras, or share your full collector page.</span>
                </div>

                <div className="miniItem">
                  <span>3️⃣</span>
                  <span><strong>Use Marketplace tools.</strong> Browse listings, message collectors, and list duplicates.</span>
                </div>

                <div className="miniItem">
                  <span>4️⃣</span>
                  <span><strong>Share feedback.</strong> The vault gets better when collectors report bugs and ideas.</span>
                </div>
              </div>

              <div className="statusBox">
                {planMeta.nextBest}
              </div>

              <div className="smallPrint">
                Plan: {planMeta.label}
                {sessionId ? (
                  <>
                    <br />
                    Stripe session: {sessionId}
                  </>
                ) : null}
                <br />
                Access is finalized by the Stripe webhook. If your account does not update immediately, refresh your account page after a moment.
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
