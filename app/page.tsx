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

  const isAdmin = useMemo(() => {
    return ADMIN_EMAILS.includes(userEmail.toLowerCase());
  }, [userEmail]);

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
        body: body,
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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(circle at 15% 20%, rgba(168,85,247,0.34) 0%, rgba(168,85,247,0) 26%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.30) 0%, rgba(59,130,246,0) 24%), radial-gradient(circle at 80% 78%, rgba(236,72,153,0.22) 0%, rgba(236,72,153,0) 20%), linear-gradient(180deg, #070b14 0%, #111827 38%, #0f172a 70%, #020617 100%)",
      }}
    >
      <style jsx>{`
        .shell {
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 28%),
            linear-gradient(135deg, rgba(17,24,39,0.94), rgba(67,56,202,0.92) 48%, rgba(37,99,235,0.88));
          border-radius: 32px;
          padding: 30px;
          box-shadow:
            0 24px 50px rgba(0,0,0,0.34),
            0 0 40px rgba(59,130,246,0.12);
          border: 1px solid rgba(255,255,255,0.10);
          margin-bottom: 18px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: auto -40px -40px auto;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(192,132,252,0.20), rgba(192,132,252,0));
          pointer-events: none;
        }

        .infoCard {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,250,252,0.96));
          color: #111827;
          border-radius: 24px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow:
            0 14px 30px rgba(0,0,0,0.18),
            0 0 22px rgba(99,102,241,0.08);
          margin-bottom: 18px;
        }

        .announcementCard {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,255,0.96));
          color: #111827;
          border-radius: 26px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow:
            0 16px 34px rgba(0,0,0,0.18),
            0 0 20px rgba(99,102,241,0.08);
          margin-bottom: 18px;
        }

        .announcementBody {
          margin-top: 14px;
          padding: 18px;
          border-radius: 20px;
          background:
            linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid #e5e7eb;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 120px;
          line-height: 1.75;
          font-size: 15px;
          color: #374151;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
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
        }

        .saveButton {
          margin-top: 10px;
          padding: 12px 18px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 18px rgba(79,70,229,0.28);
        }

        .tiny {
          font-size: 13px;
          color: #6b7280;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .cardLink {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .card {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.97), rgba(243,244,255,0.95));
          color: #111827;
          border-radius: 24px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.40);
          box-shadow:
            0 16px 28px rgba(0,0,0,0.18),
            0 0 24px rgba(99,102,241,0.06);
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          min-height: 150px;
        }

        .cardLink:hover .card {
          transform: translateY(-4px);
          box-shadow:
            0 18px 36px rgba(0,0,0,0.22),
            0 0 28px rgba(99,102,241,0.10);
          border-color: rgba(99,102,241,0.22);
        }

        .emojiBadge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: linear-gradient(135deg, #dbeafe, #ede9fe);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
          margin-bottom: 12px;
        }

        @media (max-width: 920px) {
          main {
            padding: 16px !important;
          }

          .hero {
            padding: 22px;
            border-radius: 24px;
          }

          .infoCard,
          .announcementCard,
          .card {
            border-radius: 20px;
            padding: 16px;
          }

          .announcementBody {
            padding: 14px;
            font-size: 14px;
            line-height: 1.7;
            min-height: 100px;
          }

          .textarea {
            min-height: 180px;
          }

          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, lineHeight: 1 }}>
            Welcome back{username ? `, ${username}` : ""} 💜
          </div>
          <div style={{ marginTop: 10, fontSize: 17, opacity: 0.94 }}>
            Track your Disney Doorables collection, browse marketplace finds, and connect with other collectors.
          </div>
        </section>

        <section className="infoCard">
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            Disney Doorables Collector Hub ✨
          </div>

          <div style={{ color: "#4b5563", lineHeight: 1.7 }}>
            Browse and track your Disney Doorables collection, connect with other collectors,
            explore marketplace listings, and keep up with community updates all in one place.
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              fontSize: 13,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            Disclaimer: Doorables Finder is an independent collector website and is not affiliated with,
            endorsed by, sponsored by, or officially connected to Disney or Disney Doorables.
            Disney and Disney Doorables are trademarks of their respective owners.
          </div>
        </section>

        <section className="announcementCard">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {announcement?.title || "This Week’s Updates"}
              </div>
              <div className="tiny" style={{ marginTop: 6 }}>
                {announcement?.updated_at
                  ? `Last updated: ${new Date(announcement.updated_at).toLocaleString()}`
                  : "Add your first homepage update below."}
              </div>
            </div>
          </div>

          <div className="announcementBody">
            {loading
              ? "Loading updates..."
              : announcement?.body || "No updates posted yet."}
          </div>

          {isAdmin && (
            <div className="adminBox">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Admin-only editor</div>

              <input
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
              />

              <textarea
                className="field textarea"
                style={{ marginTop: 10 }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Example:
💜 Welcome to Doorables Finder — your new favorite collector hub!

Jump in:
📦 Collection — track what you own and what you still need
🛒 Marketplace — browse listings and discover new finds
📸 Photos — add pictures to help grow the database
💬 Messages — connect with collectors
⭐ Subscription — unlock the full experience

Pro tip: Start with your Collection first — it powers everything else.`}
              />

              <button
                className="saveButton"
                onClick={() => void saveAnnouncement()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Announcement"}
              </button>

              <div className="tiny" style={{ marginTop: 8 }}>
                Only admin emails in this page file can edit this box.
              </div>
            </div>
          )}

          {!isAdmin && !!userEmail && (
            <div className="tiny" style={{ marginTop: 10 }}>
              Signed in as {userEmail}
            </div>
          )}

          {!!message && (
            <div style={{ marginTop: 10, fontSize: 14, color: message.includes("saved") ? "#166534" : "#b91c1c" }}>
              {message}
            </div>
          )}
        </section>

        <section className="cards">
          <Link href="/collection" className="cardLink">
            <div className="card">
              <div className="emojiBadge">📦</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Collection</div>
              <div style={{ marginTop: 8, color: "#4b5563", lineHeight: 1.6 }}>
                Track everything you own and see what you still need.
              </div>
            </div>
          </Link>

          <Link href="/marketplace" className="cardLink">
            <div className="card">
              <div className="emojiBadge">🛒</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Marketplace</div>
              <div style={{ marginTop: 8, color: "#4b5563", lineHeight: 1.6 }}>
                Browse listings, discover new finds, and catch rare extras.
              </div>
            </div>
          </Link>

          <Link href="/sell" className="cardLink">
            <div className="card">
              <div className="emojiBadge">💰</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Sell</div>
              <div style={{ marginTop: 8, color: "#4b5563", lineHeight: 1.6 }}>
                List your extras and make room for more Doorables.
              </div>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}