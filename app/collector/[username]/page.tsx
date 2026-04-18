"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";
import { useParams } from "next/navigation";

export default function PublicCollectionPage() {
  const params = useParams();
  const username = String(params.username || "").toLowerCase();

  const [cards, setCards] = useState<any[]>([]);
  const [visibility, setVisibility] = useState("private");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, [username]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      // find user by username
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, collection_visibility")
        .ilike("username", username)
        .maybeSingle();

      if (userError || !userRow) {
        setError("Collector not found.");
        setLoading(false);
        return;
      }

      setVisibility(userRow.collection_visibility || "private");

      if (userRow.collection_visibility === "private") {
        setLoading(false);
        return;
      }

      // load collection
      const { data, error } = await supabase
        .from("user_doorables")
        .select(`
          qty_owned,
          custom_tag,
          doorables (
            id,
            name,
            series,
            rarity,
            image_url
          )
        `)
        .eq("user_id", userRow.id);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      let filtered = data || [];

      if (userRow.collection_visibility === "extras_only") {
        filtered = filtered.filter(
          (item: any) => item.qty_owned === 0 || item.qty_owned > 1
        );
      }

      setCards(filtered);
      setLoading(false);
    } catch (err) {
      setError("Could not load collection.");
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: "white" }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "white" }}>{error}</div>;
  }

  if (visibility === "private") {
    return (
      <div style={{ padding: 24, color: "white" }}>
        🔒 This collection is private
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "linear-gradient(180deg, #09090f 0%, #111827 50%, #020617 100%)",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 20 }}>
        @{username}'s Collection 💜
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
        }}
      >
        {cards.map((item, index) => (
          <div
            key={index}
            style={{
              background: "white",
              color: "#111827",
              borderRadius: 16,
              padding: 10,
            }}
          >
            <img
              src={item.doorables.image_url}
              style={{ width: "100%", borderRadius: 10 }}
            />

            <div style={{ fontWeight: 800, marginTop: 6 }}>
              {item.doorables.name}
            </div>

            <div style={{ fontSize: 12 }}>
              Qty: {item.qty_owned}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
