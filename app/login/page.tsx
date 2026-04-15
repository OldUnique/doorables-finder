"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";

async function ensureUserExists(user: { id: string; email?: string | null }) {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? null,
      is_subscribed: false,
    });
  }
}

export default function LoginPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await ensureUserExists(data.user);
      }
    };

    void checkUser();
  }, [supabase]);

  async function handleSubmit() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setMessage("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data?.user) {
        await ensureUserExists(data.user);
      }

      router.push("/collection");
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/collection`
        : "https://www.mydoorables.com/collection";

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.user) {
      await ensureUserExists(data.user);
    }

    setMessage(
      "Account created. If email confirmation is enabled in Supabase, check your inbox before signing in."
    );
    setMode("signin");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleForgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "https://www.mydoorables.com/login";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), radial-gradient(circle at 70% 70%, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0) 20%), linear-gradient(180deg, #09090f 0%, #111827 38%, #0f172a 65%, #020617 100%)",
      }}
    >
      <AppHeader />

      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: 24,
        }}
      >
        <section
          style={{
            background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(37,99,235,0.88))",
            padding: 24,
            borderRadius: 28,
            marginBottom: 18,
            color: "white",
            boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            {mode === "signin" ? "Sign In 🔐" : "Create Account ✨"}
          </h1>
          <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
            Use your email and password to access your collection, marketplace, and messages.
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.96)",
            color: "#111827",
            padding: 24,
            borderRadius: 24,
            maxWidth: 560,
            boxShadow: "0 16px 34px rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 14,
              padding: 6,
              gap: 6,
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 800,
                background: mode === "signin" ? "#4f46e5" : "transparent",
                color: mode === "signin" ? "white" : "#3730a3",
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 800,
                background: mode === "signup" ? "#4f46e5" : "transparent",
                color: mode === "signup" ? "white" : "#3730a3",
              }}
            >
              Sign Up
            </button>
          </div>

          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
            {mode === "signin" ? "Welcome back" : "Make your account"}
          </div>

          <div style={{ color: "#6b7280", marginBottom: 16 }}>
            {mode === "signin"
              ? "Sign in with your email and password."
              : "Create your own account with an email and password."}
          </div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              marginBottom: 14,
              fontSize: 15,
            }}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 14,
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              marginBottom: 14,
              fontSize: 15,
            }}
          />

          {mode === "signup" && (
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              type="password"
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
                marginBottom: 14,
                fontSize: 15,
              }}
            />
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => void handleSubmit()}
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #60a5fa, #8b5cf6)",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                minWidth: 150,
              }}
            >
              {loading
                ? mode === "signin"
                  ? "Signing In..."
                  : "Creating..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #c7d2fe",
                background: "#eef2ff",
                color: "#3730a3",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Forgot Password?
            </button>
          </div>

          {message ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          ) : null}

          <div style={{ marginTop: 18, fontSize: 14, color: "#6b7280" }}>
            {mode === "signup"
              ? "After sign up, you can log in and keep your own collection, marketplace listings, and messages."
              : "Use the same email and password each time to access your account."}
          </div>
        </section>
      </div>
    </main>
  );
}
