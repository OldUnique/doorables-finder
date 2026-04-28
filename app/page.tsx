"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">

        {/* HEADER */}
        <div className="header">
          <div className="logo">💜 Adorable Vault</div>
          <div className="tagline">track • trade • showcase</div>
        </div>

        {/* STATS GRID */}
        <div className="statsGrid">

          <div className="card purple">
            <div className="cardTitle">TOTAL OWNED</div>
            <div className="cardValue">5</div>
            <div className="cardSub">Doorables you own</div>
          </div>

          <div className="card blue">
            <div className="cardTitle">STILL NEEDED</div>
            <div className="cardValue">1,532</div>
            <div className="cardSub">Doorables to collect</div>
          </div>

          <div className="card gold">
            <div className="cardTitle">EXTRAS</div>
            <div className="cardValue">4</div>
            <div className="cardSub">Ready to trade/sell</div>
          </div>

          <div className="card green">
            <div className="cardTitle">MARKETPLACE</div>
            <div className="cardValue">1</div>
            <div className="cardSub">Active listings</div>
          </div>

        </div>

        {/* CTA BUTTONS */}
        <div className="ctaGrid">
          <Link href="/collection" className="cta primary">
            🎯 Start Tracking
          </Link>

          <Link href="/pricing" className="cta secondary">
            📈 View Plans
          </Link>
        </div>

        {/* FEATURES */}
        <div className="features">
          <div className="featureCard">
            <h3>Track Your Collection</h3>
            <p>Keep track of what you own, need, and extras.</p>
          </div>

          <div className="featureCard">
            <h3>Find What You Need</h3>
            <p>Search your collection and fill missing pieces.</p>
          </div>

          <div className="featureCard">
            <h3>Trade & Sell</h3>
            <p>Turn extras into trades or listings.</p>
          </div>

          <div className="featureCard">
            <h3>Connect</h3>
            <p>Share collections with other collectors.</p>
          </div>
        </div>

      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0f172a, #020617);
          color: white;
          padding: 16px;
        }

        .container {
          max-width: 900px;
          margin: auto;
        }

        .header {
          margin-bottom: 20px;
        }

        .logo {
          font-size: 26px;
          font-weight: 900;
        }

        .tagline {
          opacity: 0.7;
          font-size: 14px;
        }

        /* GRID FIX */
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .card {
          padding: 16px;
          border-radius: 16px;
          font-weight: 800;
        }

        .cardTitle {
          font-size: 12px;
          opacity: 0.8;
        }

        .cardValue {
          font-size: 28px;
          margin: 6px 0;
        }

        .cardSub {
          font-size: 13px;
          opacity: 0.85;
        }

        /* COLORS (BRIGHTER = FIXED VISIBILITY) */
        .purple {
          background: linear-gradient(135deg, #7c3aed, #c084fc);
        }

        .blue {
          background: linear-gradient(135deg, #2563eb, #60a5fa);
        }

        .gold {
          background: linear-gradient(135deg, #f59e0b, #facc15);
          color: #111;
        }

        .green {
          background: linear-gradient(135deg, #16a34a, #4ade80);
        }

        /* CTA FIX */
        .ctaGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .cta {
          padding: 14px;
          border-radius: 14px;
          text-align: center;
          font-weight: 900;
          text-decoration: none;
        }

        .primary {
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white;
        }

        .secondary {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
        }

        /* FEATURES FIX */
        .features {
          display: grid;
          gap: 12px;
        }

        .featureCard {
          background: rgba(255,255,255,0.05);
          padding: 14px;
          border-radius: 14px;
        }

        .featureCard h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
        }

        .featureCard p {
          margin: 0;
          font-size: 13px;
          opacity: 0.7;
        }

        @media (min-width: 768px) {
          .statsGrid {
            grid-template-columns: repeat(4, 1fr);
          }

          .ctaGrid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}