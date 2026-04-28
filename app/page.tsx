"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 20,
        color: "white",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.35), transparent 25%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.3), transparent 25%), linear-gradient(180deg,#050510,#0f172a,#020617)",
      }}
    >
      {/* SEO */}
      <head>
        <title>Doorables Collection Tracker 💜 | MyDoorables</title>
        <meta
          name="description"
          content="Track your Doorables collection, find missing pieces, and buy, sell, or trade with other collectors. The ultimate Doorables tracker and marketplace."
        />
      </head>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* HERO */}
        <section
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 28,
            padding: 24,
            backdropFilter: "blur(8px)",
            marginBottom: 20,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900 }}>
            Doorables Collection Tracker 💜
          </h1>

          <p style={{ marginTop: 10, opacity: 0.9, fontSize: 16 }}>
            Track your Doorables collection, discover what you're missing, and connect with other collectors.
          </p>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/collection" style={ctaPrimary}>
              Start Tracking
            </Link>

            <Link href="/pricing" style={ctaSecondary}>
              View Pricing
            </Link>
          </div>
        </section>

        {/* WEEKLY UPDATE */}
        <section style={card}>
          <h2 style={sectionTitle}>💜 Weekly Update</h2>
          <p>
            (Edit this anytime in code)
            <br />
            New features, fixes, and marketplace updates go here!
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section style={card}>
          <h2 style={sectionTitle}>How It Works</h2>

          <div style={grid3}>
            <div>
              <h3>1. Track</h3>
              <p>Save your Doorables and track your collection progress.</p>
            </div>

            <div>
              <h3>2. Discover</h3>
              <p>Find missing pieces and complete your sets faster.</p>
            </div>

            <div>
              <h3>3. Trade & Sell</h3>
              <p>Connect with collectors to buy, sell, and trade.</p>
            </div>
          </div>
        </section>

        {/* FREE VS PAID */}
        <section style={card}>
          <h2 style={sectionTitle}>Free vs Collector Mode</h2>

          <div style={grid2}>
            <div style={box}>
              <h3>Free</h3>
              <ul>
                <li>✔ Track up to 50 Doorables</li>
                <li>✔ Basic collection view</li>
              </ul>
            </div>

            <div style={boxPremium}>
              <h3>Collector Mode 💜</h3>
              <ul>
                <li>✨ Unlimited collection</li>
                <li>✨ Marketplace access</li>
                <li>✨ Sell + trade</li>
              </ul>

              <Link href="/pricing" style={ctaPrimary}>
                Upgrade Now
              </Link>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ textAlign: "center", marginTop: 30 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900 }}>
            Start Your Collection Today 💜
          </h2>

          <div style={{ marginTop: 14 }}>
            <Link href="/collection" style={ctaPrimary}>
              Open My Collection
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/* STYLES */
const card = {
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  borderRadius: 24,
  padding: 18,
  marginBottom: 18,
};

const sectionTitle = {
  fontSize: 20,
  fontWeight: 900,
  marginBottom: 10,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const box = {
  background: "#f3f4f6",
  padding: 14,
  borderRadius: 16,
};

const boxPremium = {
  background: "linear-gradient(135deg,#7c3aed,#ec4899)",
  color: "white",
  padding: 14,
  borderRadius: 16,
};

const ctaPrimary = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#7c3aed",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};

const ctaSecondary = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid white",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
};
