"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";

type AuthMode = "signin" | "signup" | "reset";

function cleanNext(value: string | null) {
  const next = String(value || "").trim();

  // Only allow internal relative paths so nobody can use the login page
  // to redirect collectors to an outside site.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/collection";

  return next;
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function LoginFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(circle at top, #312e81 0%, #0f172a 46%, #020617 100%)",
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 28,
          padding: 28,
          textAlign: "center",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 10 }}>💜</div>
        <h1 style={{ margin: 0, fontSize: 28 }}>Loading login...</h1>
        <p style={{ color: "rgba(255,255,255,0.78)", fontWeight: 800 }}>
          Getting your vault door ready.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabase(), []);
  const nextPath = cleanNext(searchParams.get("next"));

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Sign In | Adorable Vault";

    async function checkCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentEmail(user?.email || "");
      setCheckingUser(false);
    }

    void checkCurrentUser();
  }, [supabase]);

  async function handleSignIn() {
    setMessage("");

    if (!isLikelyEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Signed in! Opening your vault 💜");
    router.push(nextPath);
    router.refresh();
  }

  async function handleSignUp() {
    setMessage("");

    if (!isLikelyEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.trim().length < 6) {
      setMessage("Please use a password with at least 6 characters.");
      return;
    }

    setLoading(true);

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.mydoorables.com";

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/login?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account started! Check your email to confirm your account, then come back and sign in 💜"
    );
    setLoading(false);
  }

  async function handleResetPassword() {
    setMessage("");

    if (!isLikelyEmail(email)) {
      setMessage("Enter your email first so I know where to send the reset link.");
      return;
    }

    setLoading(true);

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.mydoorables.com";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset email sent. Check your inbox 💜");
    setLoading(false);
  }

  async function handleSignOut() {
    setLoading(true);
    setMessage("");

    await supabase.auth.signOut();

    // Clear helpful local UI flags from checkout. Real subscription access
    // is still controlled by Supabase/Stripe webhook values.
    localStorage.removeItem("doorables_subscribed");
    localStorage.removeItem("adorable_vault_last_checkout_plan");
    localStorage.removeItem("adorable_vault_last_checkout_session");

    setCurrentEmail("");
    setLoading(false);
    setMessage("Signed out. You can sign in with another account now.");
    router.refresh();
  }

  async function handleSubmit() {
    if (mode === "signin") {
      await handleSignIn();
      return;
    }

    if (mode === "signup") {
      await handleSignUp();
      return;
    }

    await handleResetPassword();
  }

  const title =
    mode === "signup"
      ? "Create your vault account"
      : mode === "reset"
        ? "Reset your password"
        : "Sign in to your vault";

  const subtitle =
    mode === "signup"
      ? "Start free, save up to 50 Doorables, and upgrade only when your collection needs more room."
      : mode === "reset"
        ? "Enter your email and we’ll send a reset link so you can get back into your collection."
        : "Welcome back! Sign in to track your Doorables, wishlist, extras, Marketplace messages, and collector profile.";

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.44) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(59, 130, 246, 0.32) 0%, transparent 26%),
            radial-gradient(circle at 72% 96%, rgba(236, 72, 153, 0.26) 0%, transparent 28%),
            linear-gradient(180deg, #030712 0%, #080b1f 44%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.84) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.72) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.62) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.72;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active {
          color: inherit;
          text-decoration: none !important;
          text-decoration-line: none !important;
          -webkit-text-decoration-line: none !important;
        }

        .shell {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          margin: 0 auto;
          min-height: calc(100vh - 1px);
          display: grid;
          align-items: center;
          padding: 24px;
          box-sizing: border-box;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 0.98fr) minmax(360px, 0.82fr);
          gap: 20px;
          align-items: stretch;
        }

        .heroCard,
        .formCard {
          border-radius: 34px;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 28px 76px rgba(0,0,0,0.42);
        }

        .heroCard {
          padding: 32px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.15), transparent 32%),
            linear-gradient(135deg, rgba(30,41,59,0.94), rgba(88,28,135,0.86));
          display: grid;
          align-content: center;
        }

        .formCard {
          padding: 22px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.35), transparent 34%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          border-color: rgba(255,255,255,0.66);
        }

        .brandIcon {
          width: 74px;
          height: 74px;
          border-radius: 26px;
          display: grid;
          place-items: center;
          font-size: 38px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, #fef3c7, #f5d0fe, #bfdbfe);
          color: #312e81;
          box-shadow: 0 18px 42px rgba(255,255,255,0.15);
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
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.15rem, 5.6vw, 4.3rem);
          line-height: 0.95;
          letter-spacing: -1.9px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 16px;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          line-height: 1.65;
        }

        .trustGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .trustItem {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.88);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 850;
        }

        .formTitle {
          color: #312e81;
          font-size: clamp(1.7rem, 4vw, 2.35rem);
          line-height: 1;
          letter-spacing: -1px;
          font-weight: 1000;
          margin-bottom: 8px;
        }

        .formText {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          font-weight: 820;
          margin-bottom: 16px;
        }

        .modeTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 6px;
          border-radius: 18px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          margin-bottom: 16px;
        }

        .tabButton {
          min-height: 42px;
          border: none;
          border-radius: 13px;
          padding: 9px;
          color: #3730a3;
          background: transparent;
          font-family: inherit;
          font-weight: 1000;
          cursor: pointer;
        }

        .tabButton.active {
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 20px rgba(79,70,229,0.20);
        }

        .formGrid {
          display: grid;
          gap: 12px;
        }

        .label {
          display: block;
          color: #334155;
          font-size: 13px;
          font-weight: 950;
          margin-bottom: 6px;
        }

        .field {
          width: 100%;
          min-height: 50px;
          border-radius: 16px;
          border: 1px solid #d1d5db;
          padding: 13px 14px;
          color: #111827;
          background: white;
          box-sizing: border-box;
          font-size: 15px;
          outline: none;
        }

        .field:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .primaryButton,
        .secondaryButton {
          min-height: 52px;
          border-radius: 999px;
          padding: 14px 18px;
          border: none;
          font-family: inherit;
          font-weight: 1000;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-sizing: border-box;
          text-align: center;
        }

        .primaryButton {
          width: 100%;
          color: white;
          background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
          box-shadow: 0 14px 30px rgba(124,58,237,0.26);
        }

        .secondaryButton {
          color: #3730a3;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
        }

        .primaryButton:disabled,
        .secondaryButton:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .messageBox {
          border-radius: 18px;
          padding: 13px;
          line-height: 1.45;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 14px;
          color: #334155;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .signedInBox {
          border-radius: 20px;
          padding: 14px;
          color: #065f46;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          margin-bottom: 14px;
          line-height: 1.45;
          font-size: 13px;
          font-weight: 900;
        }

        .signedInActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 12px;
        }

        .helperLinks {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 950;
        }

        .finePrint {
          margin-top: 14px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        @media (max-width: 920px) {
          .shell {
            padding: 12px;
            align-items: start;
          }

          .layout {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .heroCard,
          .formCard {
            border-radius: 24px;
          }

          .heroCard {
            padding: 18px;
          }

          .formCard {
            padding: 16px;
          }

          .brandIcon {
            width: 58px;
            height: 58px;
            border-radius: 20px;
            font-size: 30px;
            margin-bottom: 12px;
          }

          .badge {
            padding: 7px 10px;
            font-size: 12px;
            margin-bottom: 10px;
          }

          .headline {
            font-size: clamp(1.9rem, 9vw, 2.7rem);
            line-height: 0.98;
            letter-spacing: -1.2px;
          }

          .heroText {
            font-size: 14px;
            line-height: 1.48;
            margin-top: 12px;
          }

          .trustGrid {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 12px;
          }

          .trustItem {
            padding: 10px;
            border-radius: 15px;
            font-size: 12.5px;
          }

          .modeTabs {
            grid-template-columns: 1fr;
          }

          .signedInActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="layout">
          <div className="heroCard">
            <div className="brandIcon">💜</div>
            <div className="badge">Adorable Vault collector login</div>
            <h1 className="headline">Get back into your Doorables vault.</h1>
            <div className="heroText">
              Sign in to keep tracking your collection, wishlist, extras, marketplace listings, messages,
              and public collector profile — all without the chaos.
            </div>

            <div className="trustGrid">
              <div className="trustItem">🚫 No ads. Ever. Just collector tools.</div>
              <div className="trustItem">💜 Free accounts can save up to 50 Doorables.</div>
              <div className="trustItem">🛍️ Marketplace and selling unlock with Full Access.</div>
              <div className="trustItem">🔐 Checkout and account access stay separate and secure.</div>
            </div>
          </div>

          <div className="formCard">
            <div className="formTitle">{title}</div>
            <div className="formText">{subtitle}</div>

            {checkingUser ? (
              <div className="messageBox">Checking your current session...</div>
            ) : currentEmail ? (
              <div className="signedInBox">
                You are currently signed in as <strong>{currentEmail}</strong>.
                <div className="signedInActions">
                  <Link href={nextPath} className="primaryButton">
                    Continue to Vault
                  </Link>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => void handleSignOut()}
                    disabled={loading}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : null}

            <div className="modeTabs" aria-label="Login options">
              <button
                type="button"
                className={`tabButton ${mode === "signin" ? "active" : ""}`}
                onClick={() => {
                  setMode("signin");
                  setMessage("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tabButton ${mode === "signup" ? "active" : ""}`}
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
              >
                Create
              </button>
              <button
                type="button"
                className={`tabButton ${mode === "reset" ? "active" : ""}`}
                onClick={() => {
                  setMode("reset");
                  setMessage("");
                }}
              >
                Reset
              </button>
            </div>

            {message ? <div className="messageBox">{message}</div> : null}

            <div className="formGrid">
              <div>
                <label className="label">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== "reset" ? (
                <div>
                  <label className="label">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? "Create a password" : "Your password"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSubmit();
                    }}
                  />
                </div>
              ) : null}

              <button
                type="button"
                className="primaryButton"
                onClick={() => void handleSubmit()}
                disabled={loading}
              >
                {loading
                  ? "Working..."
                  : mode === "signup"
                    ? "Create Free Account 💜"
                    : mode === "reset"
                      ? "Send Reset Email"
                      : "Sign In 💜"}
              </button>
            </div>

            <div className="helperLinks">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMessage("");
                }}
                style={{
                  color: "#4f46e5",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontFamily: "inherit",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                {mode === "signin" ? "Need an account?" : "Already have an account?"}
              </button>

              <Link href="/pricing">View plans</Link>
              <Link href="/">Back home</Link>
            </div>

            <div className="finePrint">
              This page does not auto-redirect away from login. If you are already signed in,
              you can continue to your vault or sign out and use another account.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
