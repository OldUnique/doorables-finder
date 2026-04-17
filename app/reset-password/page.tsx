"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

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

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  async function handleResetPassword() {
    try {
      setMessage("");
      setLoading(true);

      if (!password.trim()) {
        setMessage("Please enter a new password.");
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setMessage("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Password updated! Redirecting to sign in...");
      setLoading(false);

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset password.");
      setLoading(false);
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

          .primaryButton {
            width: 100%;
          }
        }
      `}</style>

      <div className="pageWrap">
        <section className="hero">
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
            Reset Password 🔐
          </h1>
          <div style={{ marginTop: 8, opacity: 0.92 }}>
            Choose a new password for your account.
          </div>
        </section>

        <section className="card">
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
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
                </div>
              )}
            </div>

            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="field"
            />

            <button
              type="button"
              onClick={() => void handleResetPassword()}
              disabled={loading}
              className="primaryButton"
            >
              {loading ? "Updating Password..." : "Save New Password"}
            </button>

            {!!message && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  color: message.toLowerCase().includes("updated") ? "#166534" : "#b91c1c",
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