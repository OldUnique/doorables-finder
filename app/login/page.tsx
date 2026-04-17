"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken";

function sanitizeUsernameInput(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

function normalizeUsernameForStorage(value: string) {
  return sanitizeUsernameInput(value).toLowerCase();
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: "", color: "#cbd5e1", width: "0%" };
  if (score <= 2) return { label: "Weak", color: "#ef4444", width: "33%" };
  if (score <= 4) return { label: "Medium", color: "#f59e0b", width: "66%" };
  return { label: "Strong", color: "#22c55e", width: "100%" };
}

export default function LoginPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHelp, setUsernameHelp] = useState("");

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

  useEffect(() => {
    if (mode !== "signup") return;

    const trimmed = username.trim();
    const normalized = normalizeUsernameForStorage(trimmed);

    if (!trimmed) {
      setUsernameStatus("idle");
      setUsernameHelp("Letters, numbers, and underscores only.");
      return;
    }

    if (normalized.length < 3) {
      setUsernameStatus("idle");
      setUsernameHelp("Use at least 3 characters.");
      return;
    }

    let cancelled = false;
    setUsernameStatus("checking");
    setUsernameHelp("Checking username...");

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", normalized)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setUsernameStatus("idle");
        setUsernameHelp("Could not check username right now.");
        return;
      }

      if (data) {
        setUsernameStatus("taken");
        setUsernameHelp("That username is already taken.");
      } else {
        setUsernameStatus("available");
        setUsernameHelp("That username is available.");
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, mode, supabase]);

  async function ensureUserProfile(user: AuthUserLike, desiredUsername?: string) {
    const { data: existing, error: readError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      setMessage(readError.message);
      return false;
    }

    const metadataUsername =
      typeof user.user_metadata?.username === "string"
        ? normalizeUsernameForStorage(user.user_metadata.username)
        : "";

    const cleanUsername = normalizeUsernameForStorage(desiredUsername || metadataUsername || "");

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
        const cleanUsernameForStorage = normalizeUsernameForStorage(username);

        if (!cleanUsernameForStorage) {
          setMessage("Please choose a username using letters, numbers, or underscores.");
          setLoading(false);
          return;
        }

        if (cleanUsernameForStorage.length < 3) {
          setMessage("Username must be at least 3 characters.");
          setLoading(false);
          return;
        }

        if (usernameStatus === "taken") {
          setMessage("That username is already taken.");
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          setMessage("Please choose a password with at least 8 characters.");
          setLoading(false);
          return;
        }

        const { data: usernameTaken, error: usernameCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("username", cleanUsernameForStorage)
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
          password,
          options: {
            data: {
              username: cleanUsernameForStorage,
              display_username: sanitizeUsernameInput(username),
            },
          },
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        if (data.session && data.user) {
          const ok = await ensureUserProfile(
            {
              id: data.user.id,
              email: data.user.email,
              user_metadata: data.user.user_metadata,
            },
            cleanUsernameForStorage
          );

          if (!ok) {
            setLoading(false);
            return;
          }

          setLoading(false);
          router.push("/");
          return;
        }

        setMessage("Account created! Now sign in with your email and password.");
        setMode("signin");
        setPassword("");
        setShowPassword(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
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
          user_metadata: data.user.user_metadata,
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

  const passwordStrength = getPasswordStrength(password);

  const usernameHelpColor =
    usernameStatus === "available"
      ? "#166534"
      : usernameStatus === "taken"
        ? "#b91c1c"
        : usernameStatus === "checking"
          ? "#4338ca"
          : "#6b7280";

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
      <style jsx>{`
        .pageWrap {
          max-width: 980px;
          margin: 0 auto;
        }

        .hero {
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .card {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          max-width: 620px;
        }

        .modeSwitch {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 14px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .modeButton {
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          background: transparent;
          color: #3730a3;
        }

        .modeButtonActive {
          background: #4f46e5;
          color: white;
        }

        .field {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
          background: white;
          color: #111827;
        }

        .primaryButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          background: #4f46e5;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .secondaryButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          background: #f3f4f6;
          color: #111827;
          font-weight: 800;
          cursor: pointer;
        }

        .togglePasswordButton {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #111827;
          border-radius: 10px;
          padding: 8px 10px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 920px) {
          main {
            padding: 16px !important;
          }

          .hero {
            padding: 18px;
            border-radius: 22px;
          }

          .card {
            padding: 16px;
            border-radius: 20px;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }
        }
      `}</style>

      <div className="pageWrap">
        <section className="hero">
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
            {mode === "signin" ? "Sign In 🔐" : "Create Account ✨"}
          </h1>
          <div style={{ marginTop: 8, opacity: 0.92 }}>
            {mode === "signin"
              ? "Sign in with your email and password."
              : "Choose your email, username, and password to start collecting."}
          </div>
        </section>

        <section className="card">
          <div className="modeSwitch">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`modeButton ${mode === "signin" ? "modeButtonActive" : ""}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`modeButton ${mode === "signup" ? "modeButtonActive" : ""}`}
            >
              Sign Up
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
            />

            {mode === "signup" && (
              <div>
                <input
                  value={username}
                  onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                  placeholder="Username"
                  className="field"
                />
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: usernameHelpColor,
                    fontWeight: usernameStatus === "available" || usernameStatus === "taken" ? 700 : 500,
                  }}
                >
                  {usernameHelp || "Letters, numbers, and underscores only."}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                  Capitals are allowed while typing. Usernames are saved case-insensitive so duplicates do not happen.
                </div>
              </div>
            )}

            <div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="field"
                  style={{ padding: "14px 92px 14px 14px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="togglePasswordButton"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {password && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "#e5e7eb",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: passwordStrength.width,
                        background: passwordStrength.color,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: passwordStrength.color,
                    }}
                  >
                    Password strength: {passwordStrength.label}
                  </div>
                  {mode === "signup" && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                      Stronger passwords usually use 8+ characters, uppercase, lowercase, numbers, and symbols.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="primaryButton"
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
                  className="secondaryButton"
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