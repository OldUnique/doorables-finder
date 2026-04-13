"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";
import { getSupabase } from "../lib/supabase";

export default function HomePage() {
const [isLoggedIn, setIsLoggedIn] = useState(false);

useEffect(() => {
const checkUser = async () => {
const supabase = getSupabase();
const { data } = await supabase.auth.getUser();
setIsLoggedIn(!!data?.user);
};

checkUser();

}, []);

return (
<main
style={{
minHeight: "100vh",
background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
color: "white",
}}
>
<div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
<Nav />

    {/* HERO */}
    <div
      style={{
        marginTop: 20,
        background: "linear-gradient(135deg,#5b21b6,#2563eb)",
        padding: 32,
        borderRadius: 28,
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 56, fontWeight: 900 }}>
        Doorables Finder 💜
      </h1>

      <p style={{ marginTop: 12, fontSize: 18, opacity: 0.9 }}>
        Track your collection, find what you need, and buy & sell Doorables
        all in one place.
      </p>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={isLoggedIn ? "/collection" : "/login"}
          style={primaryBtn}
        >
          {isLoggedIn ? "Go to Collection 🚀" : "Start Collecting ✨"}
        </Link>

        <Link href="/marketplace" style={secondaryBtn}>
          Browse Marketplace 🛒
        </Link>

        <Link href="/feedback" style={ghostBtn}>
          💜 Feedback
        </Link>
      </div>

      <div style={{ marginTop: 18, opacity: 0.85 }}>
        💡 First month FREE with code <b>FIRSTMONTHFREE</b>
      </div>
    </div>

    {/* FEATURES */}
    <div
      style={{
        marginTop: 24,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
        gap: 16,
      }}
    >
      <div style={card}>
        <h3>📦 Track Collection</h3>
        <p>Keep track of what you own and what you still need.</p>
      </div>

      <div style={card}>
        <h3>🛒 Marketplace</h3>
        <p>Buy and sell Doorables with other collectors.</p>
      </div>

      <div style={card}>
        <h3>📸 Upload Photos</h3>
        <p>Share your finds and listings easily from your phone.</p>
      </div>

      <div style={card}>
        <h3>💬 Community Feedback</h3>
        <p>Suggest features and help shape the app.</p>
      </div>
    </div>
  </div>
</main>

);
}

const primaryBtn = {
padding: "14px 22px",
borderRadius: 14,
background: "#facc15",
color: "#111827",
fontWeight: 900,
textDecoration: "none",
};

const secondaryBtn = {
padding: "14px 22px",
borderRadius: 14,
background: "#2563eb",
color: "white",
fontWeight: 900,
textDecoration: "none",
};

const ghostBtn = {
padding: "14px 22px",
borderRadius: 14,
border: "1px solid rgba(255,255,255,0.3)",
color: "white",
fontWeight: 900,
textDecoration: "none",
};

const card = {
background: "rgba(255,255,255,0.95)",
color: "#111827",
padding: 18,
borderRadius: 18,
boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
}; 
