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

  const isAdmin = useMemo(() => {
    return ADMIN_EMAILS.includes(userEmail.toLowerCase());
  }, [userEmail]);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(String(user?.email ?? "").toLowerCase());

    if (user?.id) {
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      setUsername(String(profile?.username ?? ""));
    }

    const { data } = await supabase
      .from("site_announcements")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnnouncement(data);
      setTitle(data.title);
      setBody(data.body);
    }

    setLoading(false);
  }

  async function saveAnnouncement() {
    setSaving(true);

    const supabase = getSupabase();

    const payload = {
      title,
      body,
      is_active: true,
      updated_by: userEmail,
      updated_at: new Date().toISOString(),
    };

    if (announcement?.id) {
      await supabase.from("site_announcements").update(payload).eq("id", announcement.id);
    } else {
      await supabase.from("site_announcements").insert([payload]);
    }

    setSaving(false);
  }

  return (
    <main style={{ padding: 20, color: "white" }}>
      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: auto;
        }

        .hero {
          background: linear-gradient(135deg, #4338ca, #7c3aed);
          padding: 24px;
          border-radius: 24px;
          margin-bottom: 16px;
        }

        .card {
          background: white;
          color: #111;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .updates {
          background: linear-gradient(145deg, #ffffff, #f3f4f6);
          border-radius: 20px;
          padding: 18px;
          margin-top: 12px;
          line-height: 1.6;
        }

        .bubbleGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .bubble {
          background: white;
          padding: 16px;
          border-radius: 18px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
          transition: 0.2s;
        }

        .bubble:hover {
          transform: translateY(-3px);
        }

        .disclaimer {
          font-size: 12px;
          margin-top: 10px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .hero {
            padding: 18px;
          }

          .updates {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="container">

        {/* HERO */}
        <div className="hero">
          <h1>
            Welcome back{username ? `, ${username}` : ""} 💜
          </h1>
          <p>
            Track your Doorables, find what you need, and connect with collectors.
          </p>
        </div>

        {/* DISNEY STYLE INFO */}
        <div className="card">
          <h2>✨ Disney Doorables Collector Hub</h2>
          <p>
            Track your collection, browse listings, and discover rare finds from other collectors.
          </p>

          <div className="disclaimer">
            Not affiliated with Disney. Disney Doorables is a trademark of Disney.
          </div>
        </div>

        {/* UPDATES */}
        <div className="card" style={{ marginTop: 16 }}>
          <h2>{announcement?.title || "This Week’s Updates"}</h2>

          <div className="updates">
            {loading ? "Loading..." : announcement?.body}
          </div>

          {isAdmin && (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%", marginTop: 10 }}
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ width: "100%", marginTop: 10, minHeight: 120 }}
              />

              <button onClick={saveAnnouncement}>
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>

        {/* BUBBLES */}
        <div className="bubbleGrid">
          <Link href="/collection">
            <div className="bubble">
              <h3>📦 Collection</h3>
              <p>Track everything you own</p>
            </div>
          </Link>

          <Link href="/marketplace">
            <div className="bubble">
              <h3>🛒 Marketplace</h3>
              <p>Find and buy Doorables</p>
            </div>
          </Link>

          <Link href="/sell">
            <div className="bubble">
              <h3>💰 Sell</h3>
              <p>List your extras</p>
            </div>
          </Link>
        </div>

      </div>
    </main>
  );
}
