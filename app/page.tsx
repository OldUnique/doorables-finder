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

      // 👇 get username
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
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
        const { data } = await supabase
          .from("site_announcements")
          .update(payload)
          .eq("id", announcement.id)
          .select()
          .single();

        setAnnouncement(data as Announcement);
      } else {
        const { data } = await supabase
          .from("site_announcements")
          .insert([payload])
          .select()
          .single();

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
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* HERO */}
        <section
          style={{
            background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
            borderRadius: 30,
            padding: 28,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
            Welcome back{username ? `, ${username}` : ""} 💜
          </div>

          <div style={{ marginTop: 10, fontSize: 17, opacity: 0.9 }}>
            Track your Disney Doorables collection, browse marketplace finds,
            and connect with other collectors.
          </div>
        </section>

        {/* SEO + DISCLAIMER */}
        <section
          style={{
            background: "rgba(255,255,255,0.94)",
            color: "#111827",
            borderRadius: 24,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            Disney Doorables Collector Hub ✨
          </div>

          <div style={{ marginTop: 8, color: "#4b5563" }}>
            Browse and track your Disney Doorables collection, connect with other collectors,
            and explore marketplace listings all in one place.
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "#f8fafc",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Disclaimer: Doorables Finder is not affiliated with, endorsed by,
            or sponsored by Disney. Disney Doorables are trademarks of their respective owners.
          </div>
        </section>

        {/* ANNOUNCEMENTS */}
        <section
          style={{
            background: "rgba(255,255,255,0.94)",
            color: "#111827",
            borderRadius: 24,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {announcement?.title || "This Week’s Updates"}
          </div>

          <div style={{ marginTop: 12 }}>
            {loading ? "Loading..." : announcement?.body || "No updates yet."}
          </div>

          {isAdmin && (
            <div style={{ marginTop: 20 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                style={{ width: "100%", marginBottom: 10 }}
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write update..."
                style={{ width: "100%", minHeight: 120 }}
              />

              <button onClick={() => void saveAnnouncement()}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </section>

        {/* CARDS */}
        <section style={{ display: "grid", gap: 14 }}>
          <Link href="/collection">My Collection</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/sell">Sell</Link>
        </section>

        {!!message && (
          <div style={{ marginTop: 10 }}>{message}</div>
        )}
      </div>
    </main>
  );
}