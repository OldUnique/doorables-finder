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

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
];

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
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

      setUserEmail(String(user?.email ?? "").toLowerCase());

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
        body: body.trim(),
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
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), radial-gradient(circle at 70% 70%, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0) 20%), linear-gradient(180deg, #09090f 0%, #111827 38%, #0f172a 65%, #020617 100%)",
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
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 30px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .cardLink {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .card {
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 22px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }

        .cardLink:hover .card {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .announcementCard {
          background: rgba(255,255,255,0.94);
          color: #111827;
          border-radius: 24px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          margin-bottom: 18px;
        }

        .adminBox {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .field {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 15px;
          color: #111827;
          background: white;
          box-sizing: border-box;
        }

        .textarea {
          min-height: 140px;
          resize: vertical;
          white-space: pre-wrap;
        }

        .saveButton {
          margin-top: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          color: white;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
        }

        .tiny {
          font-size: 13px;
          color: #6b7280;
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, lineHeight: 1 }}>
            Welcome back 💜
          </div>
          <div style={{ marginTop: 10, fontSize: 17, opacity: 0.92 }}>
            Track your collection, spot what you still need, and keep your community updated.
          </div>
        </section>

        <section className="announcementCard">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {announcement?.title || "This Week’s Updates"}
              </div>
              <div className="tiny" style={{ marginTop: 6 }}>
                {announcement?.updated_at
                  ? `Last updated: ${new Date(announcement.updated_at).toLocaleString()}`
                  : "Add your first homepage update below."}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 18,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              whiteSpace: "pre-wrap",
              minHeight: 90,
            }}
          >
            {loading ? "Loading updates..." : announcement?.body || "No updates posted yet."}
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
                placeholder={"Example:\nCoupon code: SPRING10\nFriday claim sale at 7 PM\nNew Disney stock this Sunday"}
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
              <div style={{ fontSize: 14, color: "#6b7280" }}>Quick Link</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>My Collection</div>
              <div style={{ marginTop: 8, color: "#4b5563" }}>
                Keep up with your Doorables and see what you still need.
              </div>
            </div>
          </Link>

          <Link href="/marketplace" className="cardLink">
            <div className="card">
              <div style={{ fontSize: 14, color: "#6b7280" }}>Quick Link</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Marketplace</div>
              <div style={{ marginTop: 8, color: "#4b5563" }}>
                Browse listings, watch for updates, and catch live offers.
              </div>
            </div>
          </Link>

          <Link href="/sell" className="cardLink">
            <div className="card">
              <div style={{ fontSize: 14, color: "#6b7280" }}>Quick Link</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Sell</div>
              <div style={{ marginTop: 8, color: "#4b5563" }}>
                Post extras, move duplicates, and keep your list fresh.
              </div>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
