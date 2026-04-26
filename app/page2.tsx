"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";

type Announcement = {
  id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
};

const ADMIN_EMAILS = ["riffeljosh80@gmail.com"];

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("This Week’s Updates");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = useMemo(
    () => ADMIN_EMAILS.includes(userEmail.toLowerCase()),
    [userEmail]
  );

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = String(user?.email ?? "").toLowerCase();
      setUserEmail(email);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        setUsername(String(profile?.username ?? ""));
      }

      const { data, error } = await supabase
        .from("site_announcements")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && !String(error.message).toLowerCase().includes("no rows")) {
        setMessage(error.message);
      }

      if (data) {
        const row = data as Announcement;
        setAnnouncement(row);
        setTitle(String(row.title ?? "This Week’s Updates"));
        setBody(String(row.body ?? ""));
      }

      setLoading(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load homepage.");
      setLoading(false);
    }
  }

  async function saveAnnouncement() {
    try {
      setSaving(true);
      setMessage("");

      const supabase = getSupabase();

      const payload = {
        title: title.trim() || "This Week’s Updates",
        body,
        is_active: true,
        updated_by: userEmail || null,
        updated_at: new Date().toISOString(),
      };

      if (announcement?.id) {
        const { data, error } = await supabase
          .from("site_announcements")
          .update(payload)
          .eq("id", announcement.id)
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      } else {
        const { data, error } = await supabase
          .from("site_announcements")
          .insert([payload])
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      }

      setMessage("Announcement saved.");
      setSaving(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save announcement.");
      setSaving(false);
    }
  }

  const announcementText =
    body.trim() ||
    "New updates are coming soon. More Doorables, more collector tools, and more ways to track, trade, and showcase your collection are on the way 💜";

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 20px;
          color: white;
          background:
            radial-gradient(circle at 12% 12%, rgba(168,85,247,0.34) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(59,130,246,0.28) 0%, transparent 24%),
            radial-gradient(circle at 75% 85%, rgba(236,72,153,0.20) 0%, transparent 24%),
            linear-gradient(180deg, #070b14 0%, #111827 45%, #020617 100%);
        }

        .shell {
          max-width: 1220px;
          margin: 0 auto;
        }

        .hero {
          border-radius: 32px;
          padding: 34px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 28%),
            linear-gradient(135deg, rgba(17,24,39,0.96), rgba(79,70,229,0.92), rgba(37,99,235,0.88));
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 55px rgba(0,0,0,0.34);
          overflow: hidden;
        }

        .badge {
          display: inline-flex;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .heroTitle {
          font-size: clamp(2.3rem, 6vw, 4.6rem);
          font-weight: 950;
          line-height: 0.95;
          letter-spacing: -1.5px;
          margin: 0;
        }

        .heroText {
          margin-top: 16px;
          max-width: 760px;
          color: rgba(255,255,255,0.90);
          font-size: 18px;
          line-height: 1.6;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .primaryButton,
        .secondaryButton {
          min-height: 48px;
          border-radius: 16px;
          padding: 13px 18px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .primaryButton {
          background: white;
          color: #312e81;
        }

        .secondaryButton {
          background: rgba(255,255,255,0.12);
          color: white;
          border: 1px solid rgba(255,255,255,0.16);
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .card,
        .announcementCard {
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          color: #111827;
          border-radius: 26px;
          padding: 22px;
          box-shadow: 0 16px 34px rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.48);
        }

        .sectionTitle {
          font-size: 24px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .muted {
          color: #4b5563;
          line-height: 1.7;
          font-size: 15px;
        }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .feature {
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(243,244,255,0.95));
          color: #111827;
          border-radius: 22px;
          padding: 18px;
          text-decoration: none;
          min-height: 150px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.16);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .feature:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 36px rgba(0,0,0,0.22);
        }

        .emoji {
          width: 44px;
          height: 44px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #ede9fe);
          font-size: 22px;
          margin-bottom: 12px;
        }

        .featureTitle {
          font-size: 18px;
          font-weight: 950;
          margin-bottom: 6px;
        }

        .announcementBody {
          margin-top: 14px;
          padding: 18px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 110px;
          line-height: 1.75;
          font-size: 15px;
          color: #374151;
        }

        .adminBox {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .field {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 12px 14px;
          font-size: 15px;
          color: #111827;
          background: white;
          box-sizing: border-box;
        }

        .textarea {
          min-height: 220px;
          resize: vertical;
          white-space: pre-wrap;
          line-height: 1.6;
          margin-top: 10px;
        }

        .saveButton {
          margin-top: 10px;
          padding: 12px 18px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 900;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 18px rgba(79,70,229,0.28);
        }

        .tiny {
          font-size: 13px;
          color: #6b7280;
        }

        .mobileBottomPad {
          display: none;
        }

        @media (max-width: 920px) {
          .page {
            padding: 14px;
            padding-bottom: 92px;
          }

          .hero {
            padding: 22px;
            border-radius: 24px;
          }

          .heroText {
            font-size: 16px;
          }

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }

          .grid2 {
            grid-template-columns: 1fr;
          }

          .featureGrid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .feature {
            min-height: 132px;
            padding: 15px;
            border-radius: 20px;
          }

          .featureTitle {
            font-size: 16px;
          }

          .muted {
            font-size: 14px;
          }

          .card,
          .announcementCard {
            padding: 16px;
            border-radius: 22px;
          }

          .announcementBody {
            padding: 14px;
            font-size: 14px;
            min-height: 90px;
          }

          .mobileBottomPad {
            display: block;
            height: 16px;
          }
        }

        @media (max-width: 520px) {
          .featureGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="badge">✨ Fan-made collector vault ✨</div>

          <h1 className="heroTitle">
            Track your Doorables without the chaos 💜
          </h1>

          <div className="heroText">
            Welcome{username ? ` back, ${username}` : ""}! Adorable Vault helps collectors track Disney Doorables,
            organize what they have, mark what they still need, list extras, browse marketplace finds,
            and connect with other collectors — all in one easy collector hub.
          </div>

          <div className="buttonRow">
            <Link href="/collection" className="primaryButton">
              Start Tracking
            </Link>
            <Link href="/marketplace" className="secondaryButton">
              Browse Marketplace
            </Link>
            <Link href="/pricing" className="secondaryButton">
              View Plans
            </Link>
          </div>
        </section>

        <section className="grid2">
          <div className="announcementCard">
            <div className="sectionTitle">{loading ? "Loading updates..." : title}</div>
            <div className="muted">
              Weekly notes, new features, collector updates, and what is coming next.
            </div>

            <div className="announcementBody">{announcementText}</div>

            {isAdmin && (
              <div className="adminBox">
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Admin update box</div>

                <input
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />

                <textarea
                  className="field textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Paste this week’s update here..."
                />

                <button
                  type="button"
                  className="saveButton"
                  onClick={() => void saveAnnouncement()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Homepage Update"}
                </button>
              </div>
            )}

            {message && <div className="tiny" style={{ marginTop: 10 }}>{message}</div>}
          </div>

          <div className="card">
            <div className="sectionTitle">Referral rewards are live 🎁</div>
            <div className="muted">
              If someone signs up with your username and becomes a paying customer,
              it can count toward your referral rewards. Get 10 qualified paid referrals
              and earn a free month.
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 18,
                background: "#eef2ff",
                color: "#3730a3",
                fontWeight: 900,
                lineHeight: 1.5,
              }}
            >
              Plus: keep an eye out for secret codes, riddles, giveaways, and limited free-year promos 👀
            </div>

            <Link
              href="/pricing"
              className="primaryButton"
              style={{
                marginTop: 16,
                background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
                color: "white",
              }}
            >
              Upgrade or Subscribe
            </Link>
          </div>
        </section>

        <section className="featureGrid">
          <Link href="/collection" className="feature">
            <div className="emoji">💜</div>
            <div className="featureTitle">Collection Tracker</div>
            <div className="muted">Track have, need, extras, notes, series progress, and more.</div>
          </Link>

          <Link href="/marketplace" className="feature">
            <div className="emoji">🛍️</div>
            <div className="featureTitle">Marketplace</div>
            <div className="muted">Browse collector listings and find Doorables you need.</div>
          </Link>

          <Link href="/sell" className="feature">
            <div className="emoji">✨</div>
            <div className="featureTitle">Sell Extras</div>
            <div className="muted">List your extra Doorables and connect with collectors.</div>
          </Link>

          <Link href="/feedback" className="feature">
            <div className="emoji">💬</div>
            <div className="featureTitle">Feedback</div>
            <div className="muted">Request features, share ideas, and help shape the site.</div>
          </Link>
        </section>

        <section className="grid2">
          <div className="card">
            <div className="sectionTitle">Built for collectors, not spreadsheets 📋</div>
            <div className="muted">
              Adorable Vault is designed to make Disney Doorables collecting easier on mobile and desktop.
              Search by name, series, rarity, movie, and notes. Mark what you own, track what you still need,
              and keep your extras organized for trading or selling.
            </div>
          </div>

          <div className="card">
            <div className="sectionTitle">More Doorables added regularly 🌟</div>
            <div className="muted">
              The vault will keep growing with more Doorables, more series, better images,
              improved mobile features, and collector-friendly tools.
            </div>
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle">Fan-made disclaimer</div>
          <div className="muted">
            Adorable Vault is a fan-made collector tracking and marketplace tool. It is not affiliated with,
            sponsored by, or endorsed by Disney or Just Play. Character names and references are used only
            to help collectors organize and identify their collections.
          </div>
        </section>

        <div className="mobileBottomPad" />
      </div>
    </main>
  );
}