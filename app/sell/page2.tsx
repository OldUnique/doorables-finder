"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

export default function SellPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setCheckingAuth(false);
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in first.");
      setLoading(false);
      router.replace("/login");
      return;
    }

    if (!title.trim()) {
      setError("Please add a title.");
      setLoading(false);
      return;
    }

    const numericPrice =
      price.trim() === "" ? null : Number(price.trim());

    if (price.trim() !== "" && Number.isNaN(numericPrice)) {
      setError("Please enter a valid price.");
      setLoading(false);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      price: numericPrice,
      image_url: imageUrl.trim() || null,
      seller_name: seller.trim() || null,
      status: "active",
      sold_at: null,
      user_id: user.id,
    };

    const { error: insertError } = await supabase
      .from("marketplace_listings")
      .insert([payload]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/marketplace");
  }

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
          color: "white",
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
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
        color: "white",
      }}
    >
      <style jsx>{`
        .shell {
          max-width: 980px;
          margin: 0 auto;
        }

        .nav {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .navLinks {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .navButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 16px;
          text-decoration: none;
          color: white;
          font-weight: 800;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
        }

        .navButton:hover {
          background: rgba(255,255,255,0.14);
        }

        .hero {
          background: linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .formCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
        }

        .field {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
        }

        .submitButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          background: #4f46e5;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .submitButton:disabled {
          opacity: 0.7;
          cursor: wait;
        }
      `}</style>

      <div className="shell">
        <nav className="nav">
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
            Doorables Finder
          </div>

          <div className="navLinks">
            <Link href="/" className="navButton">🏠 Home</Link>
            <Link href="/collection" className="navButton">Collection</Link>
            <Link href="/marketplace" className="navButton">Marketplace</Link>
            <Link href="/sell" className="navButton">Sell</Link>
            <Link href="/subscription" className="navButton">Subscription</Link>
            <Link href="/feedback" className="navButton">💙 Feedback</Link>
          </div>
        </nav>

        <section className="hero">
          <h1 style={{ margin: 0, fontSize: 46, fontWeight: 900 }}>Create Listing</h1>
          <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
            Add your Doorable here. Buyers will message you through the site.
          </div>
        </section>

        <section className="formCard">
          <div style={{ display: "grid", gap: 12 }}>
            <input
              className="field"
              placeholder="Doorable title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="field"
              placeholder="Seller name"
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
            />

            <textarea
              className="field"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: 120 }}
            />

            <input
              className="field"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <input
              className="field"
              placeholder="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />

            {!!error && (
              <div style={{ color: "#b91c1c", fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => void handleSubmit()}
                disabled={loading}
                className="submitButton"
              >
                {loading ? "Posting..." : "Post Listing"}
              </button>

              <Link
                href="/marketplace"
                className="navButton"
                style={{ color: "#111827", background: "#f3f4f6", borderColor: "#d1d5db" }}
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
