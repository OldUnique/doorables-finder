"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";

type Submission = {
  id: string;
  doorable_id: string;
  image_url: string;
  status: string;
  created_at: string;
};

export default function AdminSubmissionsPage() {
const supabase = getSupabase();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("image_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setSubs([]);
      setLoading(false);
      return;
    }

    setSubs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(sub: Submission) {
    const { error: doorableError } = await supabase
      .from("doorables")
      .update({ image_url: sub.image_url })
      .eq("id", sub.doorable_id);

    if (doorableError) {
      alert(doorableError.message);
      return;
    }

    const { error: subError } = await supabase
      .from("image_submissions")
      .update({ status: "approved" })
      .eq("id", sub.id);

    if (subError) {
      alert(subError.message);
      return;
    }

    load();
  }

  async function reject(sub: Submission) {
    const { error } = await supabase
      .from("image_submissions")
      .update({ status: "rejected" })
      .eq("id", sub.id);

    if (error) {
      alert(error.message);
      return;
    }

    load();
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Admin - Image Submissions</h1>

      {loading ? (
        <p>Loading...</p>
      ) : subs.length === 0 ? (
        <p>No pending submissions</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {subs.map((sub) => (
            <div
              key={sub.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
                color: "#111",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <strong>Doorable ID:</strong> {sub.doorable_id}
              </div>

              <img
                src={sub.image_url}
                alt="submission"
                style={{ maxWidth: 220, display: "block", marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => approve(sub)}>Approve</button>
                <button onClick={() => reject(sub)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

