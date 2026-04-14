"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Signup started! Check your email to confirm your account.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Welcome back! 💙");
    router.push("/app");
  }

  return (
    <>
      <style jsx>{`
        .page {
          min-height: calc(100vh - 84px);
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at top right, rgba(96, 165, 250, 0.18), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
        }

        .shell {
          width: 100%;
          max-width: 1100px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 24px;
          align-items: stretch;
        }

        .hero {
          border-radius: 32px;
          padding: 34px;
          color: white;
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(29, 78, 216, 0.86));
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .heroTitle {
          margin: 0 0 14px 0;
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: -1.4px;
        }

        .heroText {
          margin: 0;
          font-size: clamp(1rem, 2vw, 1.125rem);
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.82);
          max-width: 560px;
        }

        .featureGrid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .featureCard {
          border-radius: 22px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .featureTitle {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .featureText {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.75);
        }

        .panel {
          border-radius: 32px;
          padding: 28px;
          background: rgba(255, 255, 255, 0.97);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.55);
        }

        .toggleWrap {
          display: flex;
          gap: 10px;
          margin-bottom: 22px;
          background: #eef2ff;
          padding: 8px;
          border-radius: 999px;
        }

        .toggleBtn {
          flex: 1;
          padding: 12px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-weight: 900;
          font-size: 15px;
          transition: all 0.18s ease;
        }

        .toggleBtn.active {
          background: linear-gradient(135deg, #60a5fa, #2563eb);
          color: white;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
        }

        .toggleBtn.inactive {
          background: transparent;
          color: #1f2937;
        }

        .eyebrow {
          font-size: 34px;
          font-weight: 950;
          color: #0f172a;
          margin-bottom: 8px;
          letter-spacing: -0.8px;
          line-height: 1.1;
        }

        .subtext {
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 4px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          margin-top: 14px;
          color: #0f172a;
          font-weight: 800;
          font-size: 14px;
        }

        .input {
          width: 100%;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid #dbe3f0;
          background: white;
          font-size: 16px;
          color: #111827;
          outline: none;
          box-sizing: border-box;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18);
        }

        .submitBtn {
          width: 100%;
          padding: 16px;
          border-radius: 18px;
          border: none;
          cursor: pointer;
          font-weight: 950;
          font-size: 16px;
          color: white;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          box-shadow: 0 18px 30px rgba(37, 99, 235, 0.24);
          opacity: 1;
          margin-top: 18px;
        }

        .submitBtn:disabled {
          opacity: 0.8;
          cursor: wait;
        }

        .footnote {
          margin-top: 16px;
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }

        @media (max-width: 920px) {
          .shell {
            grid-template-columns: 1fr;
          }

          .hero,
          .panel {
            padding: 24px;
          }

          .featureGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 14px;
            place-items: start center;
          }

          .hero,
          .panel {
            border-radius: 24px;
            padding: 20px;
          }

          .toggleWrap {
            gap: 8px;
            padding: 6px;
          }

          .toggleBtn {
            padding: 11px 10px;
            font-size: 14px;
          }

          .eyebrow {
            font-size: 28px;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="page">
        <div className="shell">
          <section className="hero">
            <div className="badge">✨ Welcome to Doorables Finder</div>

            <h1 className="heroTitle">
              Collect smarter.
              <br />
              Sell prettier.
            </h1>

            <p className="heroText">
              Track your collection, browse the marketplace, and keep everything in
              one clean place. Sign in to unlock your account and start building
              your Doorables world.
            </p>

            <div className="featureGrid">
              {[
                ["Collection", "Track what you own and what you need."],
                ["Marketplace", "Browse clean listings and spot deals."],
                ["Selling", "List items fast with your own account."],
              ].map(([title, text]) => (
                <div key={title} className="featureCard">
                  <div className="featureTitle">{title}</div>
                  <div className="featureText">{text}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="toggleWrap">
              <button
                onClick={() => setMode("signin")}
                className={`toggleBtn ${mode === "signin" ? "active" : "inactive"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`toggleBtn ${mode === "signup" ? "active" : "inactive"}`}
              >
                Sign Up
              </button>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </div>
              <div className="subtext">
                {mode === "signin"
                  ? "Sign in to manage your collection and marketplace listings."
                  : "Sign up to save your collection, list your items, and unlock your account."}
              </div>
            </div>

            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Choose something secure"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleSubmit} disabled={loading} className="submitBtn">
              {loading
                ? "Working..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </button>

            <div className="footnote">
              {mode === "signup"
                ? "If confirmation emails are turned on, you may need to verify your email before posting listings."
                : "Once signed in, your account can own listings, manage sales, and access protected parts of the app."}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
