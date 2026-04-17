"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

export default function LoginPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/");
      }
    };

    void checkUser();
  }, [router, supabase]);

  function normalizeUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
  }

  async function ensureUserProfile(
    user: { id: string; email?: string | null },
    desiredUsername?: string
  ) {
    const { data: existing, error: readError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      setMessage(readError.message);
      return false;
    }

    const cleanUsername = normalizeUsername(desiredUsername || "");

    if (!existing) {
      const payload = {
        id: user.id,
        email: user.email ?? null,
        username: cleanUsername || null,
        is_subscribed: false,
      };

      const { error: insertError } = await supabase.from("users").insert(payload);
      if (insertError) {
        setMessage(insertError.message);
        return false;
      }
      return true;
    }

    if (!existing.username && cleanUsername) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ username: cleanUsername })
        .eq("id", user.id);

      if (updateError) {
        setMessage(updateError.message);
        return false;
      }
    }

    return true;
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setMessage("");

      if (!email.trim()) {
        setMessage("Please enter your email.");
        setLoading(false);
        return;
      }

      if (!password.trim()) {
        setMessage("Please enter your password.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const cleanUsername = normalizeUsername(username);

        if (!cleanUsername) {
          setMessage("Please choose a username using letters, numbers, or underscores.");
          setLoading(false);
          return;
        }

        const { data: usernameTaken, error: usernameCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (usernameCheckError) {
          setMessage(usernameCheckError.message);
          setLoading(false);
          return;
        }

        if (usernameTaken) {
          setMessage("That username is already taken.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          const ok = await ensureUserProfile(
            { id: data.user.id, email: data.user.email },
            cleanUsername
          );

          if (!ok) {
            setLoading(false);
            return;
          }
        }

        setMessage("Account created! You can sign in now.");
        setMode("signin");
        setPassword("");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const ok = await ensureUserProfile({
          id: data.user.id,
          email: data.user.email,
        });

        if (!ok) {
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    try {
      setMessage("");

      if (!email.trim()) {
        setMessage("Enter your email first.");
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : "https://www.mydoorables.com/login";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send reset email.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
        padding: 24,
        color: "white",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
            marginBottom: 18,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
            {mode === "signin" ? "Sign In 🔐" : "Create Account ✨"}
          </h1>
          <div style={{ marginTop: 8, opacity: 0.92 }}>
            {mode === "signin"
              ? "Sign in with your email and password."
              : "Choose your email, username, and password to start collecting."}
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.96)",
            color: "#111827",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            maxWidth: 620,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: 6,
              borderRadius: 14,
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setMode("signin")}
              style={{
                padding: "10px 14px",
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
              onClick={() => setMode("signup")}
              style={{
                padding: "10px 14px",
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

          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
                fontSize: 15,
              }}
            />

            {mode === "signup" && (
              <div>
                <input
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="username"
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    fontSize: 15,
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  Letters, numbers, and underscores only.
                </div>
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
                fontSize: 15,
              }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  background: "#4f46e5",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {loading
                  ? mode === "signin"
                    ? "Signing In..."
                    : "Creating Account..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    color: "#111827",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Forgot Password
                </button>
              )}
            </div>

            {!!message && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  color:
                    message.toLowerCase().includes("created") ||
                    message.toLowerCase().includes("sent")
                      ? "#166534"
                      : "#b91c1c",
                  fontWeight: 700,
                }}
              >
                {message}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
