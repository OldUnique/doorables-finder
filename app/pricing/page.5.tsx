"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";

type PlanKey = "monthly" | "yearly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");
  const [referralUsername, setReferralUsername] = useState("");

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const cleanReferral = referralUsername.trim().replace("@", "");

      if (cleanReferral) {
        const supabase = getSupabase();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          const { error: referralError } = await supabase
            .from("users")
            .update({ referral_username_used: cleanReferral })
            .eq("id", user.id);

          if (referralError) {
            throw new Error("Could not save referral username: " + referralError.message);
          }
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
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px 64px",
        color: "white",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <style jsx>{`
        .topGrid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .planGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          align-items: stretch;
        }

        @media (max-width: 920px) {
          .topGrid {
            grid-template-columns: 1fr;
          }

          main {
            padding: 24px 16px 40px !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "white",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            ✨ Collector Plans ✨
          </div>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 6vw, 3.2rem)",
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Start free, upgrade when you want more
          </h1>

          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 760,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Free accounts can save up to <strong style={{ color: "white" }}>50 Doorables</strong>.
            Upgrade to unlock unlimited collection, Marketplace, and selling.
          </p>
        </div>

        <section
          style={{
            background: "rgba(255,255,255,0.96)",
            color: "#0f172a",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
            Referral username 💜
          </div>

          <div style={{ color: "#475569", marginBottom: 14, lineHeight: 1.5 }}>
            If someone referred you, enter their username before checkout. After 10 paid referrals,
            they earn a free month.
          </div>

          <input
            value={referralUsername}
            onChange={(e) => setReferralUsername(e.target.value)}
            placeholder="Example: old_unique"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid #d1d5db",
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />
        </section>

        <div className="topGrid">
          <section style={infoCard}>
            <div style={infoTitle}>What free includes 💜</div>
            <ul style={infoList}>
              <li>Save up to 50 Doorables in your collection</li>
              <li>Track have, need, and extras</li>
              <li>Use collection filters and progress tracking</li>
            </ul>
          </section>

          <section style={infoCard}>
            <div style={infoTitle}>What upgrade unlocks 🚀</div>
            <ul style={infoList}>
              <li>Unlimited saved Doorables</li>
              <li>Marketplace access</li>
              <li>Create listings and sell</li>
              <li>Full collector experience</li>
            </ul>
          </section>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 24,
              background: "rgba(239,68,68,0.14)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fecaca",
              borderRadius: 16,
              padding: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="planGrid">
          <PlanCard
            label="FLEXIBLE"
            title="Monthly 💎"
            price="$3"
            period="/month"
            description="A simple way to unlock everything without a big commitment."
            bullets={["Unlimited collection saves", "Marketplace access", "Create and manage listings"]}
            buttonText={loadingPlan === "monthly" ? "Loading..." : "Start Monthly ✨"}
            buttonColor={loadingPlan === "monthly" ? "#93c5fd" : "#2563eb"}
            disabled={loadingPlan === "monthly"}
            onClick={() => handleCheckout("monthly")}
          />

          <PlanCard
            label="BEST VALUE"
            popular
            title="Yearly 🔥"
            price="$15"
            period="/year"
            description="The best deal for collectors who want everything unlocked all year."
            bullets={["Lowest overall cost", "Unlimited collection saves", "Marketplace and selling unlocked"]}
            buttonText={loadingPlan === "yearly" ? "Loading..." : "Get Best Deal 🚀"}
            buttonColor={loadingPlan === "yearly" ? "#fcd34d" : "#f59e0b"}
            disabled={loadingPlan === "yearly"}
            onClick={() => handleCheckout("yearly")}
          />
        </div>
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
  buttonText: string;
  buttonColor: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <section
      style={{
        background: "white",
        color: "#0f172a",
        borderRadius: 28,
        padding: 32,
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        border: props.popular ? "3px solid #f59e0b" : "none",
        position: "relative",
      }}
    >
      {props.popular ? (
        <div
          style={{
            position: "absolute",
            top: -14,
            right: 20,
            background: "#f59e0b",
            color: "#111827",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          MOST POPULAR
        </div>
      ) : null}

      <div
        style={{
          display: "inline-block",
          background: props.popular ? "#fef3c7" : "#dbeafe",
          color: props.popular ? "#b45309" : "#1d4ed8",
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 0.5,
          marginBottom: 18,
        }}
      >
        {props.label}
      </div>

      <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>{props.title}</h2>

      <div style={{ marginTop: 18, marginBottom: 10 }}>
        <span style={{ fontSize: 52, fontWeight: 900 }}>{props.price}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#64748b", marginLeft: 4 }}>
          {props.period}
        </span>
      </div>

      <p style={{ marginTop: 0, color: "#475569", fontSize: 15 }}>{props.description}</p>

      <ul style={{ marginTop: 24, marginBottom: 0, paddingLeft: 20, color: "#334155", lineHeight: 1.9, fontSize: 16 }}>
        {props.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <button
        type="button"
        onClick={props.onClick}
        disabled={props.disabled}
        style={{
          marginTop: 28,
          width: "100%",
          border: "none",
          borderRadius: 16,
          padding: "14px 18px",
          fontSize: 16,
          fontWeight: 800,
          background: props.buttonColor,
          color: "white",
          cursor: props.disabled ? "not-allowed" : "pointer",
        }}
      >
        {props.buttonText}
      </button>
    </section>
  );
}

const infoCard = {
  background: "rgba(255,255,255,0.96)",
  color: "#0f172a",
  borderRadius: 28,
  padding: 26,
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
};

const infoTitle = {
  fontSize: 24,
  fontWeight: 900,
  marginBottom: 14,
};

const infoList = {
  margin: 0,
  paddingLeft: 20,
  color: "#334155",
  lineHeight: 1.9,
  fontSize: 16,
};