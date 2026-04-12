"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";
import { getSupabase } from "../lib/supabase";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = getSupabase(); // moved INSIDE effect (safer)
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data?.user);
    };

    checkUser();
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#5b21b6,#2563eb)",
          padding: 24,
          borderRadius: 24,
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 42 }}>Doorables Finder 💜</h1>
        <p style={{ marginTop: 8 }}>Full merge with rarity-color cards.</p>
      </div>

      <Nav />

      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          color: "#111827",
          padding: 20,
          borderRadius: 20,
        }}
      >
        <p style={{ marginTop: 0 }}>
          {isLoggedIn
            ? "Welcome back! Jump into your collection."
            : "Use Login first, then start your collection."}
        </p>

        <Link
          href={isLoggedIn ? "/collection" : "/login"}
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "12px 20px",
            borderRadius: 12,
            background: "#2563eb",
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          {isLoggedIn ? "Go to My Collection 🚀" : "Start Collecting ✨"}
        </Link>
      </div>
    </main>
  );
}
