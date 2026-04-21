"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

type Card = {
  id: string;
  name: string;
  series: string;
  rarity: string;
  subcategory: string;
  movie: string;
  image: string;
  qty: number;
  note: string;
  rowId: string | null;
};

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState("");
  const [uploadingPhotoId, setUploadingPhotoId] = useState("");
  const [photoNote, setPhotoNote] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase.from("doorables").select("*");

    const mapped = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      series: d.series,
      rarity: d.rarity,
      subcategory: d.subcategory,
      movie: d.movie,
      image: d.image_url,
      qty: 0,
      note: "",
      rowId: null,
    }));

    setCards(mapped);
  }

  // 🔥 FULLY FIXED UPLOAD FUNCTION
  async function handlePhotoSubmission(card: Card, file: File | null) {
    if (!file) return;

    const supabase = getSupabase();

    try {
      setUploadingPhotoId(card.id);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not signed in");
        return;
      }

      console.log("📸 Selected file:", file);

      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `doorables/${card.id}/${user.id}-${Date.now()}.${fileExt}`;

      console.log("📤 Uploading to:", filePath);

      // 🔥 UPLOAD (FIXED)
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        setError(uploadError.message);
        return;
      }

      // 🔥 GET PUBLIC URL
      const { data } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      console.log("✅ Uploaded URL:", publicUrl);

      // 🔥 SAVE TO DATABASE
      const { error: insertError } = await supabase
        .from("image_submissions")
        .insert([
          {
            doorable_id: card.id,
            submitted_by: user.id,
            image_url: publicUrl,
            note: photoNote[card.id] || null,
            status: "pending",
          },
        ]);

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        setError(insertError.message);
        return;
      }

      alert("Photo submitted 💜");

      setPhotoNote((prev) => ({ ...prev, [card.id]: "" }));
    } catch (err) {
      console.error("❌ Upload crash:", err);
      setError("Upload failed");
    } finally {
      setUploadingPhotoId("");
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Collection 💜</h1>

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {cards.map((item) => (
          <div
            key={item.id}
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontWeight: 800 }}>{item.name}</div>

            {/* PHOTO UPLOAD BOX */}
            <div style={{ marginTop: 10 }}>
              <textarea
                placeholder="Optional note..."
                value={photoNote[item.id] || ""}
                onChange={(e) =>
                  setPhotoNote((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 8,
                }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  console.log("📂 Picked file:", file);

                  if (file) {
                    void handlePhotoSubmission(item, file);
                  }

                  // 🔥 CRITICAL FIX (prevents mobile bug)
                  e.target.value = "";
                }}
                disabled={uploadingPhotoId === item.id}
              />

              <div style={{ fontSize: 12 }}>
                {uploadingPhotoId === item.id
                  ? "Uploading..."
                  : "Tap to upload"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}