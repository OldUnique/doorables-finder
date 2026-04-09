"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

async function ensureUserExists(user) {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      is_subscribed: false,
    });
  }
}


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

useEffect(() => {
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await ensureUserExists(data.user);
    }
  };

  checkUser();
}, []);

  async function sendMagicLink() {
    setMessage("");
    const redirectTo = "http://localhost:3000/collection";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Magic link sent. Check your email and open the link on this device.");
  }

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg,#5b21b6,#2563eb)", padding: 24, borderRadius: 24, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 38 }}>Login 🔐</h1>
      </div>
      <Nav />
      <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 20, borderRadius: 20, maxWidth: 540 }}>
        <p>Use Supabase email magic-link login.</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db", boxSizing: "border-box", marginBottom: 12 }}
        />
        <button
          onClick={sendMagicLink}
          style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #8b5cf6", background: "#ede9fe", fontWeight: 700, cursor: "pointer" }}
        >
          Send Magic Link
        </button>
        {message ? <div style={{ marginTop: 12 }}>{message}</div> : null}
      </div>
    </main>
  );
}