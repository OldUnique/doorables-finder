"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email_confirmed_at) {
        router.replace("/auth");
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();
  }, [router]);

if (checkingAuth) {return <div>Loading...</div>;
}

  async function handleSubmit() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email_confirmed_at) {
      alert("Please sign in and confirm your email first.");
      setLoading(false);
      router.replace("/auth");
      return;
    }

    const { error } = await supabase.from("marketplace_listings").insert([
      {
        title,
        description,
        price: Number(price),
        image_url: imageUrl,
        seller_name: seller,
        status: "active",
        user_id: user.id,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Listing created! 🎉");
    router.push("/marketplace");
  }

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
          color: "white",
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        Checking account...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "rgba(255,255,255,0.96)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: 20,
            fontSize: 42,
            fontWeight: 900,
            color: "#111827",
            textAlign: "center",
          }}
        >
          Create Listing
        </h1>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Seller name"
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            background: "linear-gradient(135deg,#4f8cff,#6fa8ff)",
            color: "white",
            fontWeight: 900,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Posting..." : "Post Listing"}
        </button>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 14,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
  boxSizing: "border-box" as const,
};
