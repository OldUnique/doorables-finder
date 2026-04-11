"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

export default function AccountPage() {
const supabase = getSupabase();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg,#5b21b6,#2563eb)", padding: 24, borderRadius: 24, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 38 }}>Account 👤</h1>
      </div>
      <Nav />
      <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 20, borderRadius: 20 }}>
        <div>Signed in as: <strong>{email || "Not signed in"}</strong></div>
        <button
          onClick={signOut}
          style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}