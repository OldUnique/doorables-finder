"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "unknown";

function sanitizeUsernameInput(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

function normalizeUsernameForStorage(value: string) {
  return sanitizeUsernameInput(value).toLowerCase();
}

function getSafeNextPath() {
  if (typeof window === "undefined") return "/collection";

  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "";

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/collection";
  }

  return next;
}

function getAuthRedirectUrl() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.mydoorables.com";

  return `${origin}/login?next=${encodeURIComponent(getSafeNextPath())}`;
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

function friendlyAuthMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("signup") && lower.includes("disabled")) {
    return "Signups are currently disabled in Supabase. Turn on Authentication → Providers → Email → Allow new users to sign up.";
  }

  if (lower.includes("invalid login credentials")) {
    return "That email/password did not match. Try again or use Forgot Password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Your account exists, but the email is not confirmed yet. Check your inbox for the confirmation email.";
  }

  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "That email already has an account. Try signing in or use Forgot Password.";
  }

  return message || "Something went wrong. Please try again.";
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
  const [checkingSession, setCheckingSession] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHelp, setUsernameHelp] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace(getSafeNextPath());
        return;
      }

      setCheckingSession(false);
    };

    void checkUser();
  }, [router, supabase]);

  useEffect(() => {
    if (mode !== "signup") return;

    const normalized = normalizeUsernameForStorage(username.trim());

    if (!normalized) {
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
        .limit(1);

      if (cancelled) return;

      if (error) {
        // Important: do NOT block signup just because anon users cannot read public.users.
        // If RLS is strict, the old page could stop before auth.signUp ever ran.
        setUsernameStatus("unknown");
        setUsernameHelp("Could not check username right now, but you can still try creating your account.");
        return;
      }

      if ((data || []).length > 0) {
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
    const metadataUsername =
      typeof user.user_metadata?.username === "string"
        ? normalizeUsernameForStorage(user.user_metadata.username)
        : "";

    const cleanUsername = normalizeUsernameForStorage(desiredUsername || metadataUsername || "");

    const existingResult = await supabase
      .from("users")
      .select("id, username, collection_visibility, is_subscribed")
      .eq("id", user.id)
      .maybeSingle();

    const existing = existingResult.error ? null : existingResult.data;
    const usernameToSave =
      normalizeUsernameForStorage(String(existing?.username || "")) || cleanUsername || null;

    const payload: Record<string, any> = {
      id: user.id,
      email: user.email ?? null,
      username: usernameToSave,
      collection_visibility: existing?.collection_visibility || "private",
    };

    if (!existing) payload.is_subscribed = false;

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      const duplicateUsername =
        upsertError.code === "23505" || upsertError.message.toLowerCase().includes("duplicate");

      if (duplicateUsername) {
        setMessage("That username was already taken. Sign in worked, but please choose a different username on your Account page.");
        return true;
      }

      setMessage(
        "Your login worked, but your profile row could not save: " +
          upsertError.message +
          " — check the RLS policies on the public.users table."
      );
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setMessage("");

      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        setMessage("Please enter your email.");
        setLoading(false);
        return;
      }

      if (!password) {
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

        // Best-effort duplicate check. If RLS blocks this select, signup still continues.
        const { data: usernameRows, error: usernameCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("username", cleanUsernameForStorage)
          .limit(1);

        if (!usernameCheckError && (usernameRows || []).length > 0) {
          setMessage("That username is already taken.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              username: cleanUsernameForStorage,
              display_username: sanitizeUsernameInput(username),
            },
          },
        });

        if (error) {
          setMessage(friendlyAuthMessage(error.message));
          setLoading(false);
          return;
        }

        const identities = (data.user as any)?.identities as any[] | undefined;
        if (data.user && Array.isArray(identities) && identities.length === 0) {
          setMessage("That email may already have an account. Try signing in or use Forgot Password.");
          setMode("signin");
          setPassword("");
          setShowPassword(false);
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
          router.replace(getSafeNextPath());
          return;
        }

        setMessage("Account created! Check your email to confirm your account, then sign in.");
        setMode("signin");
        setPassword("");
        setShowPassword(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setMessage(friendlyAuthMessage(error.message));
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
      router.replace(getSafeNextPath());
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
          ? `${window.location.origin}/reset-password`
          : "https://www.mydoorables.com/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });

      if (error) {
        setMessage(friendlyAuthMessage(error.message));
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
          : usernameStatus === "unknown"
            ? "#92400e"
            : "#6b7280";

  const messageIsSuccess =
    message.toLowerCase().includes("created") ||
    message.toLowerCase().includes("sent") ||
    message.toLowerCase().includes("check your email");

  if (checkingSession) {
    return (
      <main className="page centerPage">
        <style jsx>{pageStyles}</style>
        <div className="loadingCard">
          <div style={{ fontSize: 34, marginBottom: 10 }}>💜</div>
          <div style={{ fontWeight: 1000, fontSize: 22 }}>Checking your vault...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <style jsx>{pageStyles}</style>

      <div className="shell">
        <nav className="topNav">
          <Link href="/" className="brand">
            <span className="brandIcon">💎</span>
            <span>
              <span className="brandTitle">Adorable Vault</span>
              <span className="brandSub">track • trade • showcase</span>
            </span>
          </Link>

          <div className="navActions">
            <Link href="/" className="navPill homePill">Home</Link>
            <Link href="/pricing" className="navPill">Plans</Link>
            <Link href="/about" className="navPill">About</Link>
          </div>
        </nav>

        <div className="layout">
          <section className="heroPanel">
            <div className="badge">✨ Free collector vault • save up to 50 Doorables ✨</div>

            <h1 className="headline">Your Doorables checklist, wishlist, and extras tracker in one place.</h1>

            <div className="heroText">
              Sign in or create a free vault to track what you own, find what you still need,
              organize duplicates, and unlock marketplace tools when you are ready.
            </div>

            <div className="benefitGrid">
              <div className="benefit">
                <div className="benefitIcon">📦</div>
                <div className="benefitTitle">Track collection</div>
                <div className="benefitText">Owned, needed, notes, rarity, movies, series, and extras.</div>
              </div>

              <div className="benefit">
                <div className="benefitIcon">🔎</div>
                <div className="benefitTitle">Search fast</div>
                <div className="benefitText">Check your vault from your phone while shopping or watching lives.</div>
              </div>

              <div className="benefit">
                <div className="benefitIcon">🛍️</div>
                <div className="benefitTitle">Marketplace</div>
                <div className="benefitText">Browse, list extras, and message collectors with full access.</div>
              </div>

              <div className="benefit">
                <div className="benefitIcon">💜</div>
                <div className="benefitTitle">Fan-made</div>
                <div className="benefitText">Built for collectors who want less chaos and more checklist magic.</div>
              </div>
            </div>

            <div className="sampleCard">
              <div className="sampleTop">
                <div>
                  <div style={{ color: "#fde68a", fontWeight: 1000, fontSize: 13 }}>SAMPLE COLLECTION CARD</div>
                  <div style={{ fontWeight: 1000, fontSize: 20, marginTop: 3 }}>See how tracking feels</div>
                </div>
                <div style={{ fontWeight: 1000, color: "#d8b4fe" }}>62%</div>
              </div>

              <div className="sampleDoorable">
                <div className="sampleImage">💎</div>
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 17 }}>Mystery Doorable</div>
                  <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 3 }}>
                    Series Tracker • Rare • Wishlist
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <span className="samplePill green">Have: 1</span>
                    <span className="samplePill purple">Need more</span>
                  </div>
                </div>
              </div>

              <div className="sampleProgress"><div className="sampleFill" /></div>
            </div>
          </section>

          <section className="authCard">
            <div className="modeSwitch">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMessage("");
                }}
                className={`modeButton ${mode === "signin" ? "modeButtonActive" : ""}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className={`modeButton ${mode === "signup" ? "modeButtonActive" : ""}`}
              >
                Sign Up Free
              </button>
            </div>

            <div className="formTitle">{mode === "signin" ? "Welcome back 💜" : "Create your free vault ✨"}</div>
            <div className="formSub">
              {mode === "signin"
                ? "Sign in to open your collection, messages, marketplace tools, and saved progress."
                : "Start free with up to 50 saved Doorables. Upgrade later only when you are ready."}
            </div>

            <div className="formStack">
              <div>
                <label className="fieldLabel">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field"
                  type="email"
                  autoComplete="email"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSubmit();
                  }}
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label className="fieldLabel">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                    placeholder="Collector username"
                    className="field"
                    autoComplete="username"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSubmit();
                    }}
                  />
                  <div className="usernameHelp" style={{ color: usernameHelpColor }}>
                    {usernameHelp || "Letters, numbers, and underscores only."}
                  </div>
                  <div className="usernameSub">Usernames are saved lowercase so duplicates do not happen.</div>
                </div>
              )}

              <div>
                <label className="fieldLabel">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="field"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    style={{ padding: "14px 92px 14px 14px" }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSubmit();
                    }}
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
                    <div className="strengthTrack">
                      <div
                        className="strengthFill"
                        style={{ width: passwordStrength.width, background: passwordStrength.color }}
                      />
                    </div>
                    <div className="strengthLabel" style={{ color: passwordStrength.color }}>
                      Password strength: {passwordStrength.label}
                    </div>
                    {mode === "signup" && (
                      <div className="usernameSub">
                        Use at least 8 characters. Stronger passwords usually include uppercase,
                        lowercase, numbers, and symbols.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="buttonRow">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  className="primaryButton"
                  style={{ opacity: loading ? 0.7 : 1 }}
                >
                  {loading
                    ? mode === "signin"
                      ? "Signing In..."
                      : "Creating Account..."
                    : mode === "signin"
                      ? "Open My Vault"
                      : "Create Free Vault"}
                </button>

                {mode === "signin" && (
                  <button type="button" onClick={() => void handleForgotPassword()} className="secondaryButton">
                    Forgot Password
                  </button>
                )}
              </div>

              {!!message && <div className={`messageBox ${messageIsSuccess ? "successBox" : "errorBox"}`}>{message}</div>}
            </div>

            <div className="trustStrip">
              <div className="trustItem"><span>✅</span><span>Free accounts can save up to 50 Doorables before upgrading.</span></div>
              <div className="trustItem"><span>🔐</span><span>Your login is handled through secure Supabase authentication.</span></div>
              <div className="trustItem"><span>💜</span><span>Adorable Vault is fan-made and built for collector organization.</span></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const pageStyles = `
  .page {
    min-height: 100vh;
    color: white;
    background:
      radial-gradient(circle at 8% 4%, rgba(168,85,247,0.42) 0%, transparent 28%),
      radial-gradient(circle at 88% 10%, rgba(59,130,246,0.30) 0%, transparent 27%),
      radial-gradient(circle at 70% 94%, rgba(236,72,153,0.22) 0%, transparent 30%),
      linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
    overflow-x: hidden;
  }

  .centerPage {
    display: grid;
    place-items: center;
    padding: 22px;
  }

  .page::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.78) 35%, transparent 36%),
      radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.65) 35%, transparent 36%),
      radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.58) 35%, transparent 36%),
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: auto, auto, auto, 46px 46px, 46px 46px;
    opacity: 0.7;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
  }

  .shell {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    margin: 0 auto;
    padding: 22px;
    padding-bottom: 80px;
  }

  .loadingCard,
  .heroPanel,
  .authCard {
    border-radius: 32px;
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 26px 64px rgba(0,0,0,0.36);
  }

  .loadingCard {
    width: min(520px, 100%);
    padding: 28px;
    text-align: center;
    background: rgba(255,255,255,0.10);
  }

  .topNav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    text-decoration: none;
    min-width: 0;
  }

  .brandIcon {
    width: 58px;
    height: 58px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    font-size: 31px;
    background: radial-gradient(circle at top left, #fef3c7, #a855f7 48%, #020617);
    box-shadow: 0 18px 38px rgba(168,85,247,0.42);
    flex: 0 0 auto;
  }

  .brandTitle {
    display: block;
    font-size: clamp(1.45rem, 4vw, 2.15rem);
    font-weight: 1000;
    line-height: 0.95;
    letter-spacing: -0.8px;
    background: linear-gradient(90deg, #fef3c7, #f0abfc, #bfdbfe);
    -webkit-background-clip: text;
    color: transparent;
  }

  .brandSub {
    display: block;
    margin-top: 5px;
    color: #d8b4fe;
    font-weight: 950;
    font-size: 14px;
  }

  .navActions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .navPill,
  .navPill:visited {
    color: white;
    text-decoration: none;
    font-weight: 950;
    padding: 11px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.14);
  }

  .layout {
    display: grid;
    grid-template-columns: 0.98fr 1.02fr;
    gap: 20px;
    align-items: stretch;
  }

  .heroPanel {
    padding: 28px;
    background:
      radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
      linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
    display: grid;
    align-content: center;
    gap: 17px;
  }

  .badge {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    padding: 9px 13px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.15);
    font-size: 13px;
    font-weight: 1000;
  }

  .headline {
    margin: 0;
    font-size: clamp(2.15rem, 5.6vw, 4.1rem);
    line-height: 0.94;
    letter-spacing: -2px;
    font-weight: 1000;
    text-wrap: balance;
  }

  .heroText {
    color: rgba(255,255,255,0.90);
    font-size: 16px;
    line-height: 1.65;
    max-width: 720px;
  }

  .benefitGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
  }

  .benefit {
    border-radius: 19px;
    padding: 13px;
    background: rgba(15,23,42,0.55);
    border: 1px solid rgba(255,255,255,0.14);
  }

  .benefitIcon {
    font-size: 22px;
    margin-bottom: 6px;
  }

  .benefitTitle {
    color: #fde68a;
    font-weight: 1000;
    line-height: 1.15;
    margin-bottom: 4px;
  }

  .benefitText {
    color: rgba(255,255,255,0.78);
    line-height: 1.4;
    font-size: 12.5px;
    font-weight: 750;
  }

  .sampleCard {
    margin-top: 3px;
    border-radius: 24px;
    padding: 15px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.16);
  }

  .sampleTop {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
  }

  .sampleDoorable {
    display: grid;
    grid-template-columns: 68px 1fr;
    gap: 12px;
    align-items: center;
    border-radius: 18px;
    padding: 12px;
    background: rgba(255,255,255,0.92);
    color: #111827;
  }

  .sampleImage {
    width: 68px;
    height: 68px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #ede9fe, #bfdbfe);
    font-size: 30px;
  }

  .samplePill {
    border-radius: 999px;
    padding: 5px 8px;
    font-weight: 900;
    font-size: 12px;
  }

  .samplePill.green { background: #dcfce7; color: #166534; }
  .samplePill.purple { background: #eef2ff; color: #3730a3; }

  .sampleProgress,
  .strengthTrack {
    height: 9px;
    border-radius: 999px;
    background: rgba(255,255,255,0.18);
    overflow: hidden;
    margin-top: 12px;
  }

  .sampleFill {
    height: 100%;
    width: 62%;
    border-radius: inherit;
    background: linear-gradient(90deg, #60a5fa, #c084fc, #f0abfc);
  }

  .authCard {
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    color: #111827;
    padding: 22px;
  }

  .modeSwitch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 6px;
    border-radius: 17px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    margin-bottom: 16px;
  }

  .modeButton {
    min-height: 46px;
    padding: 10px 14px;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    font-weight: 950;
    background: transparent;
    color: #3730a3;
  }

  .modeButtonActive {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    box-shadow: 0 10px 18px rgba(79,70,229,0.22);
  }

  .formTitle {
    font-size: clamp(1.7rem, 4vw, 2.35rem);
    font-weight: 1000;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 7px;
  }

  .formSub {
    color: #64748b;
    line-height: 1.5;
    font-weight: 750;
    margin-bottom: 16px;
  }

  .formStack {
    display: grid;
    gap: 13px;
  }

  .fieldLabel {
    display: block;
    font-size: 13px;
    font-weight: 950;
    color: #334155;
    margin-bottom: 6px;
  }

  .field {
    width: 100%;
    padding: 14px;
    border-radius: 15px;
    border: 1px solid #d1d5db;
    box-sizing: border-box;
    font-size: 15px;
    background: white;
    color: #111827;
    outline: none;
  }

  .field:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
  }

  .usernameHelp {
    margin-top: 6px;
    font-size: 13px;
    font-weight: 800;
  }

  .usernameSub {
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
  }

  .primaryButton,
  .secondaryButton,
  .primaryButton:visited,
  .secondaryButton:visited {
    min-height: 50px;
    padding: 12px 16px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 1000;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    box-sizing: border-box;
  }

  .primaryButton,
  .primaryButton:visited {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    box-shadow: 0 14px 26px rgba(79,70,229,0.26);
  }

  .secondaryButton,
  .secondaryButton:visited {
    border: 1px solid #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
  }

  .togglePasswordButton {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    border: 1px solid #d1d5db;
    background: #f8fafc;
    color: #111827;
    border-radius: 999px;
    padding: 8px 10px;
    font-weight: 850;
    cursor: pointer;
  }

  .buttonRow {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .strengthTrack {
    height: 10px;
    background: #e5e7eb;
    margin-top: 0;
  }

  .strengthFill {
    height: 100%;
    transition: width 0.2s ease;
  }

  .strengthLabel {
    margin-top: 6px;
    font-size: 13px;
    font-weight: 800;
  }

  .messageBox {
    margin-top: 4px;
    font-size: 14px;
    border-radius: 16px;
    padding: 12px 13px;
    font-weight: 850;
    line-height: 1.45;
  }

  .successBox {
    color: #166534;
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
  }

  .errorBox {
    color: #b91c1c;
    background: #fff1f2;
    border: 1px solid #fecdd3;
  }

  .trustStrip {
    margin-top: 16px;
    display: grid;
    gap: 9px;
  }

  .trustItem {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 8px;
    align-items: start;
    padding: 11px;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    color: #475569;
    font-weight: 800;
    line-height: 1.4;
    font-size: 13px;
  }

  @media (max-width: 960px) {
    .shell {
      padding: 14px;
      padding-bottom: 58px;
    }

    .topNav {
      align-items: flex-start;
    }

    .brandIcon {
      width: 54px;
      height: 54px;
      font-size: 29px;
    }

    .navPill:not(.homePill) {
      display: none;
    }

    .layout {
      grid-template-columns: 1fr;
    }

    .heroPanel,
    .authCard {
      border-radius: 25px;
    }

    .heroPanel {
      padding: 21px;
    }

    .headline {
      font-size: clamp(2rem, 11vw, 3.05rem);
    }

    .benefitGrid {
      grid-template-columns: 1fr;
    }

    .authCard {
      padding: 18px;
    }

    .primaryButton,
    .secondaryButton {
      width: 100%;
    }
  }

  @media (max-width: 440px) {
    .sampleDoorable {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .sampleImage {
      margin: 0 auto;
    }
  }
`;
