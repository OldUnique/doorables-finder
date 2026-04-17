"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      const MAX_WIDTH = 900;
      const MAX_HEIGHT = 900;

      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }

      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      if (!ctx) {
        reject(new Error("Could not prepare image compression."));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image."));
            return;
          }

          resolve(
            new File([blob], "compressed.jpg", {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.72
      );
    };

    img.onerror = () => reject(new Error("Could not load image for compression."));
    img.src = URL.createObjectURL(file);
  });
}

export default function SellPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [localPickupEnabled, setLocalPickupEnabled] = useState(false);
  const [shippingPrice, setShippingPrice] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
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

    const { data: profile } = await supabase
      .from("users")
      .select("is_subscribed")
      .eq("id", user.id)
      .maybeSingle();

    setIsSubscribed(!!profile?.is_subscribed);

    if (!seller && user.email) {
      setSeller(user.email);
    }

    setCheckingAuth(false);
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const compressedFile = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedFile);
      setImageUrl(previewUrl);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in first.");
        setUploading(false);
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("marketplace-images")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from("marketplace-images")
        .getPublicUrl(fileName);

      setImageUrl(data.publicUrl);
      setUploading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not upload image.");
      setUploading(false);
    }
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

    if (!shippingEnabled && !localPickupEnabled) {
      setError("Please choose shipping, local pickup, or both.");
      setLoading(false);
      return;
    }

    const numericPrice = price.trim() === "" ? null : Number(price.trim());

    if (price.trim() !== "" && Number.isNaN(numericPrice)) {
      setError("Please enter a valid price.");
      setLoading(false);
      return;
    }

    const numericShippingPrice =
      shippingPrice.trim() === "" ? null : Number(shippingPrice.trim());

    if (shippingEnabled && shippingPrice.trim() !== "" && Number.isNaN(numericShippingPrice)) {
      setError("Please enter a valid shipping price.");
      setLoading(false);
      return;
    }

    if (shippingEnabled && shippingPrice.trim() === "") {
      setError("Please add a shipping price or 0 for free shipping.");
      setLoading(false);
      return;
    }

    if (localPickupEnabled && !pickupLocation.trim()) {
      setError("Please add a city and state for local pickup.");
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
      shipping_available: shippingEnabled,
      shipping_price: shippingEnabled ? numericShippingPrice : null,
      local_pickup_available: localPickupEnabled,
      pickup_location: localPickupEnabled ? pickupLocation.trim() : null,
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

  if (!isSubscribed) {
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
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <section
            style={{
              background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
              marginBottom: 18,
            }}
          >
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 2.9rem)", fontWeight: 900 }}>
              Create Listing
            </h1>
            <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
              Selling is included with the paid plan.
            </div>
          </section>

          <section
            style={{
              background: "rgba(255,255,255,0.96)",
              color: "#111827",
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              Upgrade to unlock selling 💜
            </div>
            <div style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 14 }}>
              Free accounts can save up to 50 Doorables in collection. Upgrade to create listings, use Marketplace, and unlock unlimited collection.
            </div>

            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 14,
                background: "#4f46e5",
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Upgrade Now
            </Link>
          </section>
        </div>
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

        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: #111827;
          font-weight: 800;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
        }

        .uploadBox {
          border: 2px dashed #c7d2fe;
          background: #eef2ff;
          border-radius: 18px;
          padding: 18px;
        }

        .previewBox {
          margin-top: 10px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
          overflow: hidden;
        }

        .toggleWrap {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toggleButton {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 800;
          cursor: pointer;
        }

        .toggleButtonActive {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white;
          border-color: transparent;
        }

        .noteBox {
          margin-top: 8px;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
        }

        @media (max-width: 920px) {
          main {
            padding: 16px !important;
          }

          .hero {
            padding: 18px;
            border-radius: 22px;
          }

          .formCard {
            padding: 16px;
            border-radius: 20px;
          }

          .toggleButton,
          .submitButton,
          .secondaryButton {
            width: 100%;
          }

          .previewBox {
            min-height: 180px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 2.9rem)", fontWeight: 900 }}>
            Create Listing
          </h1>

          <div style={{ marginTop: 8, opacity: 0.92, fontSize: 16 }}>
            Add your Doorable here. Buyers can message you right through the site.
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

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Delivery options</div>

              <div className="toggleWrap">
                <button
                  type="button"
                  onClick={() => setShippingEnabled((prev) => !prev)}
                  className={`toggleButton ${shippingEnabled ? "toggleButtonActive" : ""}`}
                >
                  Shipping
                </button>

                <button
                  type="button"
                  onClick={() => setLocalPickupEnabled((prev) => !prev)}
                  className={`toggleButton ${localPickupEnabled ? "toggleButtonActive" : ""}`}
                >
                  Local Pickup
                </button>
              </div>

              {shippingEnabled && (
                <div style={{ marginTop: 12 }}>
                  <input
                    className="field"
                    placeholder="Shipping price"
                    value={shippingPrice}
                    onChange={(e) => setShippingPrice(e.target.value)}
                  />
                  <div className="noteBox">Put 0 if shipping is free.</div>
                </div>
              )}

              {localPickupEnabled && (
                <div style={{ marginTop: 12 }}>
                  <input
                    className="field"
                    placeholder="Local pickup city, state"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="uploadBox">
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Upload picture</div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleFileUpload(e.target.files?.[0] ?? null)}
                style={{ marginBottom: 10 }}
              />

              <input
                className="field"
                placeholder="Or paste image URL instead"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />

              <div className="noteBox">
                {uploading
                  ? "Compressing and uploading image..."
                  : "Images are automatically compressed before upload to save bandwidth."}
              </div>

              <div className="previewBox">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    loading="lazy"
                    decoding="async"
                    style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "#6b7280", fontWeight: 700 }}>Image preview will show here</div>
                )}
              </div>
            </div>

            {!!error && <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => void handleSubmit()}
                disabled={loading || uploading}
                className="submitButton"
              >
                {loading ? "Posting..." : "Post Listing"}
              </button>

              <Link href="/marketplace" className="secondaryButton">
                Back to Marketplace
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
