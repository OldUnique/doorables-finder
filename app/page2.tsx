"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../lib/supabase";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data?.user);
    };

    checkUser();
  }, []);

  return (
    <>
      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(250, 204, 21, 0.12), transparent 22%),
            linear-gradient(135deg, #0f172a, #1d4ed8);
          color: white;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .hero {
          margin-top: 20px;
          background: linear-gradient(135deg, #5b21b6, #2563eb);
          padding: 32px;
          border-radius: 28px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .title {
          margin: 0;
          font-size: clamp(2.3rem, 7vw, 3.5rem);
          font-weight: 900;
          line-height: 1.05;
        }

        .subtitle {
          margin: 14px auto 0;
          font-size: clamp(1rem, 2.2vw, 1.125rem);
          opacity: 0.92;
          max-width: 720px;
          line-height: 1.65;
        }

        .ctaRow {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .promo {
          margin-top: 18px;
          opacity: 0.9;
          font-size: 15px;
          line-height: 1.6;
        }

        .tagline {
          opacity: 0.88;
          margin-top: 12px;
          font-weight: 600;
          font-size: 15px;
        }

        .featureGrid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .card {
          background: rgba(255, 255, 255, 0.96);
          color: #111827;
          padding: 20px;
          border-radius: 18px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
        }

        .card h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.1rem;
        }

        .card p {
          margin: 0;
          color: #374151;
          line-height: 1.6;
        }

        .btn {
          padding: 14px 22px;
          border-radius: 14px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 180px;
          text-align: center;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .primaryBtn {
          background: #facc15;
          color: #111827;
        }

        .secondaryBtn {
          background: #2563eb;
          color: white;
        }

        .ghostBtn {
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 700px) {
          .container {
            padding: 14px;
          }

          .hero {
            margin-top: 12px;
            padding: 22px 16px;
            border-radius: 22px;
          }

          .ctaRow {
            flex-direction: column;
            align-items: stretch;
          }

          .btn {
            width: 100%;
            min-width: 0;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="page">
        <div className="container">
          <div className="hero">
            <h1 className="title">Doorables Finder 💜</h1>

            <p className="subtitle">
              Track your collection, find what you need, and buy &amp; sell Doorables
              all in one place.
            </p>

            <div className="ctaRow">
              <Link href={isLoggedIn ? "/collection" : "/login"} className="btn primaryBtn">
                {isLoggedIn ? "Go to Collection 🚀" : "Start Collecting ✨"}
              </Link>

              <Link href="/marketplace" className="btn secondaryBtn">
                Browse Marketplace 🛒
              </Link>

              <Link href="/feedback" className="btn ghostBtn">
                💜 Feedback
              </Link>
            </div>

            <div className="promo">
              💡 First month FREE with code <b>FIRSTMONTHFREE</b>
            </div>

            <p className="tagline">💜 Built by collectors, for collectors like you</p>
          </div>

          <div className="featureGrid">
            <div className="card">
              <h3>📦 Track Collection</h3>
              <p>Keep track of what you own and what you still need.</p>
            </div>

            <div className="card">
              <h3>🛒 Marketplace</h3>
              <p>Buy and sell Doorables with other collectors.</p>
            </div>

            <div className="card">
              <h3>📸 Upload Photos</h3>
              <p>Share your finds and listings easily from your phone.</p>
            </div>

            <div className="card">
              <h3>💬 Community Feedback</h3>
              <p>Suggest features and help shape the app.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
