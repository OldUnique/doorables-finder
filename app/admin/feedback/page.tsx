"use client";

import { useEffect, useState } from "react";
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
  const [items, setItems] = useState<Feedback[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("feedback_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setItems(data || []);
  }

  async function approve(id: string) {
    await supabase
      .from("feedback_posts")
      .update({ approved: true })
      .eq("id", id);

    load();
  }

  async function remove(id: string) {
    await supabase
      .from("feedback_posts")
      .delete()
      .eq("id", id);

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        Admin Feedback 💜
      </h1>

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

          <div>{item.message}</div>

          <div style={{ fontSize: 12, opacity: 0.6 }}>
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
