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
    <main
      style={{
        minHeight: "calc(100vh - 84px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 24,
        }}
      >
        <section
          style={{
            borderRadius: 32,
            padding: 34,
            color: "white",
            background:
              "linear-gradient(145deg, rgba(15,23,42,0.94), rgba(29,78,216,0.84))",
            boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              fontWeight: 800,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            ✨ Welcome to Doorables Finder
          </div>

          <h1
            style={{
              margin: "0 0 14px 0",
              fontSize: 56,
              lineHeight: 1,
              fontWeight: 950,
              letterSpacing: -1.4,
            }}
          >
            Collect smarter.
            <br />
            Sell prettier.
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.82)",
              maxWidth: 560,
            }}
          >
            Track your collection, browse the marketplace, and keep everything in
            one clean place. Sign in to unlock your account and start building
            your Doorables world.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 14,
            }}
          >
            {[
              ["Collection", "Track what you own and what you need."],
              ["Marketplace", "Browse clean listings and spot deals."],
              ["Selling", "List items fast with your own account."],
            ].map(([title, text]) => (
              <div
                key={title}
                style={{
                  borderRadius: 22,
                  padding: 18,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            borderRadius: 32,
            padding: 28,
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.55)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 22,
              background: "#eef2ff",
              padding: 8,
              borderRadius: 999,
            }}
          >
            <button
              onClick={() => setMode("signin")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 15,
                background:
                  mode === "signin" ? "linear-gradient(135deg,#60a5fa,#2563eb)" : "transparent",
                color: mode === "signin" ? "white" : "#1f2937",
                boxShadow: mode === "signin" ? "0 10px 24px rgba(37,99,235,0.22)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 15,
                background:
                  mode === "signup" ? "linear-gradient(135deg,#60a5fa,#2563eb)" : "transparent",
                color: mode === "signup" ? "white" : "#1f2937",
                boxShadow: mode === "signup" ? "0 10px 24px rgba(37,99,235,0.22)" : "none",
              }}
            >
              Sign Up
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 950,
                color: "#0f172a",
                marginBottom: 8,
                letterSpacing: -0.8,
              }}
            >
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </div>
            <div style={{ color: "#475569", fontSize: 15, lineHeight: 1.6 }}>
              {mode === "signin"
                ? "Sign in to manage your collection and marketplace listings."
                : "Sign up to save your collection, list your items, and unlock your account."}
            </div>
          </div>

          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="Choose something secure"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 18,
              border: "none",
              cursor: "pointer",
              fontWeight: 950,
              fontSize: 16,
              color: "white",
              background: "linear-gradient(135deg,#2563eb,#60a5fa)",
              boxShadow: "0 18px 30px rgba(37,99,235,0.24)",
              opacity: loading ? 0.8 : 1,
              marginTop: 8,
            }}
          >
            {loading
              ? "Working..."
              : mode === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>

          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            {mode === "signup"
              ? "If confirmation emails are turned on, you may need to verify your email before posting listings."
              : "Once signed in, your account can own listings, manage sales, and access protected parts of the app."}
          </div>
        </section>
      </div>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  marginTop: 12,
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 14,
} as const;

const inputStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #dbe3f0",
  background: "white",
  fontSize: 16,
  color: "#111827",
  outline: "none",
  boxSizing: "border-box" as const,
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
} as const;

