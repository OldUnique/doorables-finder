"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

type Feedback = {
  id: string;
  name: string | null;
  message: string;
  category: string | null;
  approved: boolean;
  created_at: string;
};

export default function AdminFeedbackPage() {
  const supabase = getSupabase();
  const router = useRouter();

  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔒 ADMIN LOCK
  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email?.toLowerCase();

      if (email !== "riffeljosh80@gmail.com") {
        router.push("/");
        return;
      }

      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  // 📦 LOAD FEEDBACK
  async function load() {
    const { data, error } = await supabase
      .from("feedback_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setItems(data || []);
    }
  }

  // ✅ APPROVE
  async function approve(id: string) {
    await supabase
      .from("feedback_posts")
      .update({ approved: true })
      .eq("id", id);

    load();
  }

  // ❌ DELETE
  async function remove(id: string) {
    await supabase
      .from("feedback_posts")
      .delete()
      .eq("id", id);

    load();
  }

  useEffect(() => {
    if (!loading) {
      load();
    }
  }, [loading]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "white",
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        Checking admin access...
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        Admin Feedback 💜
      </h1>

      {items.length === 0 && (
        <div style={{ marginTop: 20 }}>No feedback yet.</div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 12,
            borderRadius: 12,
            background: item.approved ? "#e6fffa" : "#fff",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {item.name || "Anonymous"}
          </div>

          <div style={{ marginTop: 6 }}>{item.message}</div>

          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            {item.category}
          </div>

          {!item.approved && (
            <button
              onClick={() => approve(item.id)}
              style={{
                marginTop: 10,
                background: "green",
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
            >
              Approve
            </button>
          )}

          <button
            onClick={() => remove(item.id)}
            style={{
              marginTop: 10,
              marginLeft: 10,
              background: "red",
              color: "white",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </main>
  );
}