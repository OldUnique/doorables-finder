// CLEAN FINAL COLLECTION PAGE (FIXED)

"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";

function rarityTheme(rarity) {
  const value = String(rarity || "").toLowerCase();

  if (value.includes("exclusive"))
    return { bg: "#fff7d6", border: "#d4a017" };

  if (value.includes("special"))
    return { bg: "#f4e8ff", border: "#8b5cf6" };

  if (value.includes("limited"))
    return { bg: "#fffbd1", border: "#eab308" };

  if (value.includes("ultra"))
    return { bg: "#e8f1ff", border: "#3b82f6" };

  if (value.includes("rare"))
    return { bg: "#eafaf0", border: "#22c55e" };

  return { bg: "#ffffff", border: "#d1d5db" };
}

export default function Page() {
  const supabase = getSupabase();
  const [cards, setCards] = useState([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: doorables } = await supabase
      .from("doorables")
      .select("*");

    const { data: userDoorables } = await supabase
      .from("user_doorables")
      .select("*")
      .eq("user_id", user.id);

    const map = {};
    (userDoorables || []).forEach(d => map[d.doorable_id] = d);

    const merged = (doorables || []).map(d => {
      const u = map[d.id] || {};

      return {
        id: d.id,
        name: d.name || "Unknown",
        series: d.series || "Unknown",
        rarity: d.rarity || "Common",
        image: d.image_url || "",
        qty: u.qty_owned || 0,
        note: u.custom_tag || "",
        rowId: u.id || null
      };
    });

    setCards(merged);
  }

  async function update(card, change) {
    const qty = Math.max(0, card.qty + change);

    const payload = {
      user_id: userId,
      doorable_id: card.id,
      qty_owned: qty,
      wanted: qty <= 0,
      custom_tag: card.note || ""   // 🔥 FIX
    };

    if (card.rowId) {
      await supabase
        .from("user_doorables")
        .update(payload)
        .eq("id", card.rowId);
    } else {
      const { data } = await supabase
        .from("user_doorables")
        .insert([payload])
        .select()
        .single();

      card.rowId = data.id;
    }

    load();
  }

  async function saveNote(card) {
    await update(card, 0);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>My Collection 💜</h1>
      <p>It only gets better 💜</p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
        gap: 16
      }}>
        {cards.map(card => {
          const theme = rarityTheme(card.rarity);

          return (
            <div key={card.id}
              style={{
                background: theme.bg,
                border: "2px solid " + theme.border,
                borderRadius: 16,
                padding: 12
              }}
            >
              <div style={{ height:150 }}>
                {card.image && (
                  <img src={card.image}
                    style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }}
                  />
                )}
              </div>

              <b>{card.name}</b>
              <div>{card.series}</div>
              <div>{card.rarity}</div>

              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <button onClick={()=>update(card,-1)}>-</button>
                <div>{card.qty}</div>
                <button onClick={()=>update(card,1)}>+</button>
              </div>

              <textarea
                value={card.note}
                onChange={e=>{
                  card.note = e.target.value;
                  setCards([...cards]);
                }}
                placeholder="Notes..."
                style={{ width:"100%", marginTop:8 }}
              />

              <button onClick={()=>saveNote(card)}>Save</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
