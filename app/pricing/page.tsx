"use client";

import { useState } from "react";

type PlanKey = "monthly" | "yearly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError("");
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
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
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
              fontSize: 48,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Pick your Doorables vibe
          </h1>

          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 700,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Unlock the full collector experience. Use code{" "}
            <strong style={{ color: "white" }}>FIRSTMONTHFREE</strong> at
            checkout for your monthly plan.
          </p>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <section
            style={{
              background: "white",
              color: "#0f172a",
              borderRadius: 28,
              padding: 32,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "#dbeafe",
                color: "#1d4ed8",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
                marginBottom: 18,
              }}
            >
              FLEXIBLE
            </div>

            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>
              Monthly 💎
            </h2>

            <div style={{ marginTop: 18, marginBottom: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 900 }}>$3</span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#64748b",
                  marginLeft: 4,
                }}
              >
                /month
              </span>
            </div>

            <p style={{ marginTop: 0, color: "#475569", fontSize: 15 }}>
              First month FREE with code FIRSTMONTHFREE
            </p>

            <ul
              style={{
                marginTop: 24,
                marginBottom: 0,
                paddingLeft: 20,
                color: "#334155",
                lineHeight: 1.9,
                fontSize: 16,
              }}
            >
              <li>✨ Easy way to start</li>
              <li>💜 Full collector access</li>
              <li>📦 Browse, collect, and sell</li>
            </ul>

            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan === "monthly"}
              style={{
                marginTop: 28,
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: "14px 18px",
                fontSize: 16,
                fontWeight: 800,
                background: loadingPlan === "monthly" ? "#93c5fd" : "#2563eb",
                color: "white",
                cursor: loadingPlan === "monthly" ? "not-allowed" : "pointer",
              }}
            >
              {loadingPlan === "monthly" ? "Loading..." : "Start Monthly ✨"}
            </button>
          </section>

          <section
            style={{
              background: "white",
              color: "#0f172a",
              borderRadius: 28,
              padding: 32,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              border: "3px solid #f59e0b",
              position: "relative",
            }}
          >
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

            <div
              style={{
                display: "inline-block",
                background: "#fef3c7",
                color: "#b45309",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
                marginBottom: 18,
              }}
            >
              BEST VALUE
            </div>

            <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>
              Yearly 🔥
            </h2>

            <div style={{ marginTop: 18, marginBottom: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 900 }}>$15</span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#64748b",
                  marginLeft: 4,
                }}
              >
                /year
              </span>
            </div>

            <p style={{ marginTop: 0, color: "#475569", fontSize: 15 }}>
              Save money and keep everything unlocked all year.
            </p>

            <ul
              style={{
                marginTop: 24,
                marginBottom: 0,
                paddingLeft: 20,
                color: "#334155",
                lineHeight: 1.9,
                fontSize: 16,
              }}
            >
              <li>🚀 Lowest overall cost</li>
              <li>🎉 Perfect for active collectors</li>
              <li>⭐ Best deal for long-term use</li>
            </ul>

            <button
              type="button"
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan === "yearly"}
              style={{
                marginTop: 28,
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: "14px 18px",
                fontSize: 16,
                fontWeight: 800,
                background: loadingPlan === "yearly" ? "#fcd34d" : "#f59e0b",
                color: "white",
                cursor: loadingPlan === "yearly" ? "not-allowed" : "pointer",
              }}
            >
              {loadingPlan === "yearly" ? "Loading..." : "Get Best Deal 🚀"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
