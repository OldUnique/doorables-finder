"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type ListingStatus = "active" | "pending" | "sold";

type MarketplaceListing = {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
  seller_name: string | null;
  user_id: string | null;
  status: ListingStatus | string | null;
  sold_at: string | null;
  shipping_available: boolean | null;
  shipping_price: number | null;
  local_pickup_available: boolean | null;
  pickup_location: string | null;
};

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

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
            new File([blob], "marketplace-listing.jpg", {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.72
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image for compression."));
    };

    img.src = objectUrl;
  });
}

function getSafeNextPath() {
  if (typeof window === "undefined") return "/sell";
  return `${window.location.pathname}${window.location.search}`;
}

function formatMoney(value: string) {
  const clean = value.trim();
  if (!clean) return "No price listed";
  const number = Number(clean);
  if (Number.isNaN(number)) return "Price preview";
  return `$${number.toFixed(2)}`;
}

export default function SellPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");

  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [localPickupEnabled, setLocalPickupEnabled] = useState(false);
  const [shippingPrice, setShippingPrice] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [listingStatus, setListingStatus] = useState<ListingStatus>("active");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void checkUser();
  }, []);

  async function checkUser() {
    try {
      setCheckingAuth(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(getSafeNextPath())}`);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("username, is_subscribed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      }

      const resolvedUsername = String(profile?.username ?? "");
      setUsername(resolvedUsername);
      setIsSubscribed(!!profile?.is_subscribed);
      setSeller(resolvedUsername || user.email || "");

      const editId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("edit") || ""
          : "";

      if (editId && profile?.is_subscribed) {
        await loadListingForEdit(editId, user.id);
      }

      setCheckingAuth(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not check account.");
      setCheckingAuth(false);
    }
  }

  async function loadListingForEdit(listingId: string, currentUserId: string) {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        id,
        title,
        description,
        price,
        image_url,
        seller_name,
        user_id,
        status,
        sold_at,
        shipping_available,
        shipping_price,
        local_pickup_available,
        pickup_location
      `)
      .eq("id", listingId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) {
      setError("Could not find that listing under your account.");
      return;
    }

    const listing = data as MarketplaceListing;

    setEditingId(String(listing.id));
    setTitle(String(listing.title ?? ""));
    setDescription(String(listing.description ?? ""));
    setPrice(listing.price === null || listing.price === undefined ? "" : String(listing.price));
    setImageUrl(String(listing.image_url ?? ""));
    setSeller(String(listing.seller_name ?? seller ?? ""));
    setShippingEnabled(!!listing.shipping_available);
    setShippingPrice(
      listing.shipping_price === null || listing.shipping_price === undefined
        ? ""
        : String(listing.shipping_price)
    );
    setLocalPickupEnabled(!!listing.local_pickup_available);
    setPickupLocation(String(listing.pickup_location ?? ""));

    if (
      listing.status === "active" ||
      listing.status === "pending" ||
      listing.status === "sold"
    ) {
      setListingStatus(listing.status);
    }
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      setNotice("");

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file.");
        setUploading(false);
        return;
      }

      if (file.size > 12 * 1024 * 1024) {
        setError("That image is pretty large. Try a photo under 12 MB.");
        setUploading(false);
        return;
      }

      const compressedFile = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedFile);
      setImageUrl(previewUrl);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in first.");
        setUploading(false);
        router.replace(`/login?next=${encodeURIComponent(getSafeNextPath())}`);
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("marketplace-images")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      URL.revokeObjectURL(previewUrl);

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from("marketplace-images")
        .getPublicUrl(fileName);

      setImageUrl(data.publicUrl);
      setNotice("Image uploaded and compressed 💜");
      setUploading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not upload image.");
      setUploading(false);
    }
  }

  function validateForm() {
    if (!title.trim()) return "Please add a listing title.";
    if (title.trim().length < 3) return "Please make the title a little more descriptive.";
    if (!shippingEnabled && !localPickupEnabled) {
      return "Please choose shipping, local pickup, or both.";
    }

    const numericPrice = price.trim() === "" ? null : Number(price.trim());
    if (price.trim() !== "" && (Number.isNaN(numericPrice) || numericPrice < 0)) {
      return "Please enter a valid price.";
    }

    const numericShippingPrice =
      shippingPrice.trim() === "" ? null : Number(shippingPrice.trim());

    if (
      shippingEnabled &&
      shippingPrice.trim() !== "" &&
      (Number.isNaN(numericShippingPrice) || numericShippingPrice < 0)
    ) {
      return "Please enter a valid shipping price.";
    }

    if (shippingEnabled && shippingPrice.trim() === "") {
      return "Please add a shipping price, or enter 0 for free shipping.";
    }

    if (localPickupEnabled && !pickupLocation.trim()) {
      return "Please add a city and state for local pickup.";
    }

    return "";
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        router.replace(`/login?next=${encodeURIComponent(getSafeNextPath())}`);
        return;
      }

      const numericPrice = price.trim() === "" ? null : Number(price.trim());
      const numericShippingPrice =
        shippingPrice.trim() === "" ? null : Number(shippingPrice.trim());

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: numericPrice,
        image_url: imageUrl.trim() || null,
        seller_name: seller.trim() || username || user.email || null,
        status: listingStatus,
        sold_at: listingStatus === "sold" ? new Date().toISOString() : null,
        user_id: user.id,
        shipping_available: shippingEnabled,
        shipping_price: shippingEnabled ? numericShippingPrice : null,
        local_pickup_available: localPickupEnabled,
        pickup_location: localPickupEnabled ? pickupLocation.trim() : null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("marketplace_listings")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }

        setNotice("Listing updated 💜");
        setLoading(false);
        router.push("/marketplace");
        return;
      }

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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save listing.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="page loadingPage">
        <style jsx>{`
          .page {
            min-height: 100vh;
            color: white;
            background:
              radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
              radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
              linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          }

          .loadingPage {
            display: grid;
            place-items: center;
            padding: 20px;
          }

          .loadingCard {
            width: min(520px, 100%);
            border-radius: 28px;
            padding: 28px;
            text-align: center;
            background: rgba(255,255,255,0.10);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          }
        `}</style>

        <div className="loadingCard">
          <div style={{ fontSize: 34, marginBottom: 10 }}>🛍️</div>
          <div style={{ fontWeight: 1000, fontSize: 22 }}>Checking your seller access...</div>
        </div>
      </main>
    );
  }

  if (!isSubscribed) {
    return (
      <main className="page">
        <style jsx>{`
          .page {
            min-height: 100vh;
            color: white;
            background:
              radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
              radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
              linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
            padding: 22px;
          }

          .gate {
            max-width: 920px;
            margin: 0 auto;
          }

          .hero,
          .card {
            border-radius: 28px;
            box-shadow: 0 22px 50px rgba(0,0,0,0.28);
          }

          .hero {
            background:
              radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
              linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
            padding: 26px;
            border: 1px solid rgba(255,255,255,0.14);
            margin-bottom: 18px;
          }

          .card {
            background: linear-gradient(180deg, #ffffff, #f8fafc);
            color: #111827;
            padding: 24px;
            border: 1px solid rgba(255,255,255,0.55);
          }

          .button,
          .button:visited {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 50px;
            border-radius: 999px;
            padding: 13px 18px;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white;
            text-decoration: none;
            font-weight: 1000;
            box-shadow: 0 14px 28px rgba(79,70,229,0.28);
          }

          .miniGrid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin: 16px 0;
          }

          .mini {
            border-radius: 18px;
            padding: 13px;
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            color: #475569;
            font-weight: 850;
            line-height: 1.4;
          }

          @media (max-width: 800px) {
            .page {
              padding: 14px;
            }

            .hero,
            .card {
              border-radius: 22px;
              padding: 18px;
            }

            .miniGrid {
              grid-template-columns: 1fr;
            }

            .button {
              width: 100%;
            }
          }
        `}</style>

        <div className="gate">
          <section className="hero">
            <div style={{ fontWeight: 1000, color: "#fde68a", marginBottom: 8 }}>
              Full Access Feature
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2rem, 6vw, 3.2rem)",
                fontWeight: 1000,
                letterSpacing: -1.2,
                lineHeight: 1,
              }}
            >
              Create marketplace listings with Full Access.
            </h1>
            <div style={{ marginTop: 12, opacity: 0.90, lineHeight: 1.6 }}>
              Selling tools are included with the paid plan so collectors can list extras,
              message through the site, and keep Marketplace organized.
            </div>
          </section>

          <section className="card">
            <div style={{ fontSize: 25, fontWeight: 1000, color: "#312e81", marginBottom: 8 }}>
              Upgrade to unlock selling 💜
            </div>
            <div style={{ color: "#475569", lineHeight: 1.65 }}>
              Free accounts can save up to 50 Doorables in collection. Full Access unlocks
              unlimited collection saves, Marketplace browsing, listing creation, and collector messages.
            </div>

            <div className="miniGrid">
              <div className="mini">🛍️ Create and manage listings</div>
              <div className="mini">💬 Message buyers and sellers</div>
              <div className="mini">♾️ Unlimited collection saves</div>
            </div>

            <Link href="/pricing" className="button">
              View Plans
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
            radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
            radial-gradient(circle at 70% 94%, rgba(236, 72, 153, 0.22) 0%, transparent 30%),
            linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.78) 35%, transparent 36%),
            radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.65) 35%, transparent 36%),
            radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.58) 35%, transparent 36%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: auto, auto, auto, 46px 46px, 46px 46px;
          opacity: 0.68;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1220px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 84px;
        }

        .pageLinks {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 18px;
        }

        .pageLink,
        .pageLink:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 12px 18px;
          border-radius: 16px;
          text-decoration: none;
          font-weight: 950;
          letter-spacing: 0.01em;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          backdrop-filter: blur(8px);
        }

        .pageLink:hover {
          transform: translateY(-1px);
        }

        .pageLinkCollection,
        .pageLinkCollection:visited {
          color: white;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255,255,255,0.28);
          box-shadow: 0 12px 26px rgba(15,23,42,0.28);
          text-shadow: 0 1px 0 rgba(0,0,0,0.25);
        }

        .pageLinkMarketplace,
        .pageLinkMarketplace:visited {
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: 1px solid rgba(255,255,255,0.34);
          box-shadow: 0 14px 30px rgba(79,70,229,0.38);
          text-shadow: 0 1px 0 rgba(0,0,0,0.22);
        }

        .hero {
          border-radius: 32px;
          padding: 28px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: center;
        }

        .heroBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(2.15rem, 5.4vw, 4rem);
          line-height: 0.96;
          letter-spacing: -1.8px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 12px;
          color: rgba(255,255,255,0.88);
          font-size: 16px;
          line-height: 1.65;
          max-width: 760px;
        }

        .heroSteps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .heroStep {
          border-radius: 16px;
          padding: 12px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.14);
        }

        .heroStepNumber {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.18);
          font-size: 13px;
          font-weight: 1000;
        }

        .heroStepText {
          font-size: 13px;
          line-height: 1.45;
          color: rgba(255,255,255,0.88);
          font-weight: 850;
        }

        .heroBubble {
          border-radius: 24px;
          padding: 18px;
          min-width: 250px;
          background: rgba(15,23,42,0.58);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          gap: 18px;
          align-items: start;
        }

        .formCard,
        .previewCard,
        .noticeCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border-radius: 28px;
          padding: 22px;
          border: 1px solid rgba(255,255,255,0.60);
          box-shadow: 0 20px 46px rgba(0,0,0,0.24);
        }

        .sectionTitle {
          color: #312e81;
          font-size: 21px;
          font-weight: 1000;
          margin-bottom: 12px;
        }

        .formGrid {
          display: grid;
          gap: 14px;
        }

        .fieldLabel {
          display: block;
          font-size: 13px;
          font-weight: 950;
          color: #334155;
          margin-bottom: 6px;
        }

        .field,
        .textarea {
          width: 100%;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
          background: white;
          color: #111827;
          outline: none;
        }

        .field:focus,
        .textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .textarea {
          min-height: 124px;
          resize: vertical;
        }

        .sellerBox {
          width: 100%;
          padding: 14px 16px;
          border-radius: 15px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          box-sizing: border-box;
          font-size: 15px;
          font-weight: 900;
          color: #111827;
        }

        .panelBox {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 16px;
        }

        .toggleWrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .toggleButton,
        .statusButton {
          min-height: 48px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 950;
          cursor: pointer;
        }

        .toggleButtonActive,
        .statusButtonActive {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white;
          border-color: transparent;
          box-shadow: 0 12px 22px rgba(79,70,229,0.20);
        }

        .statusGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .uploadBox {
          border: 2px dashed #c7d2fe;
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.28), transparent 30%),
            #eef2ff;
          border-radius: 20px;
          padding: 16px;
        }

        .fileInput {
          width: 100%;
          padding: 12px;
          border-radius: 15px;
          background: white;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
        }

        .noteBox {
          margin-top: 8px;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          font-weight: 750;
        }

        .errorBox,
        .successBox {
          border-radius: 17px;
          padding: 13px 14px;
          font-weight: 900;
          line-height: 1.45;
        }

        .errorBox {
          color: #b91c1c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .successBox {
          color: #166534;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
        }

        .buttonRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .submitButton,
        .secondaryButton,
        .submitButton:visited,
        .secondaryButton:visited {
          min-height: 52px;
          border-radius: 999px;
          padding: 13px 18px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-sizing: border-box;
        }

        .submitButton {
          border: none;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(79,70,229,0.26);
        }

        .submitButton:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .secondaryButton,
        .secondaryButton:visited {
          color: #3730a3;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
        }

        .previewImageBox {
          border-radius: 22px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          min-height: 240px;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 12px;
          margin-bottom: 14px;
        }

        .previewImage {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          border-radius: 16px;
        }

        .listingPreviewTitle {
          font-size: 22px;
          font-weight: 1000;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .listingPreviewPrice {
          color: #1d4ed8;
          font-size: 24px;
          font-weight: 1000;
          margin-bottom: 12px;
        }

        .pillRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 7px 10px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          font-size: 12px;
          font-weight: 950;
        }

        .previewDescription {
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .safeNote {
          margin-top: 14px;
          border-radius: 18px;
          padding: 13px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .noticeCard {
          margin-top: 18px;
        }

        .noticeList {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .noticeItem {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 9px;
          align-items: start;
          padding: 12px;
          border-radius: 17px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #475569;
          font-weight: 800;
          line-height: 1.4;
          font-size: 13px;
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 60px;
          }

          .pageLinks {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .pageLink {
            width: 100%;
          }

          .hero {
            grid-template-columns: 1fr;
            border-radius: 25px;
            padding: 21px;
          }

          .heroBubble {
            min-width: 0;
          }

          .heroSteps {
            grid-template-columns: 1fr;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .formCard,
          .previewCard,
          .noticeCard {
            border-radius: 23px;
            padding: 18px;
          }

          .toggleWrap,
          .statusGrid {
            grid-template-columns: 1fr;
          }

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .submitButton,
          .secondaryButton {
            width: 100%;
          }

          .previewImageBox {
            min-height: 190px;
          }
        }

        @media (max-width: 640px) {
          .pageLinks {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="shell">
        <div className="pageLinks">
          <Link href="/collection" className="pageLink pageLinkCollection">
            ← Collection
          </Link>
          <Link href="/marketplace" className="pageLink pageLinkMarketplace">
            Marketplace
          </Link>
        </div>

        <section className="hero">
          <div>
            <div className="heroBadge">
              {editingId ? "✏️ Edit marketplace listing" : "🛍️ Create marketplace listing"}
            </div>

            <h1 className="heroTitle">
              {editingId ? "Polish your listing before it goes back out." : "List your extras with less chaos."}
            </h1>

            <div className="heroText">
              Add a clear title, photo, price, delivery options, and condition notes.
              Buyers can message you through Adorable Vault, but payment and delivery are handled directly between buyer and seller.
            </div>

            <div className="heroSteps">
              <div className="heroStep">
                <div className="heroStepNumber">1</div>
                <div className="heroStepText">Add a title, photo, and a few details buyers will care about.</div>
              </div>
              <div className="heroStep">
                <div className="heroStepNumber">2</div>
                <div className="heroStepText">Choose shipping, pickup, or both so your delivery options are clear.</div>
              </div>
              <div className="heroStep">
                <div className="heroStepNumber">3</div>
                <div className="heroStepText">Post to Marketplace and let buyers message you directly.</div>
              </div>
            </div>
          </div>

          <div className="heroBubble">
            <div style={{ color: "#fde68a", fontSize: 13, fontWeight: 1000, marginBottom: 7 }}>
              Seller profile
            </div>
            <div style={{ fontSize: 22, fontWeight: 1000, lineHeight: 1.1 }}>
              {seller || username || "Collector"}
            </div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.45 }}>
              Your Marketplace listing will show this seller name.
            </div>
          </div>
        </section>

        <div className="layout">
          <section className="formCard">
            <div className="sectionTitle">Listing details</div>

            <div className="formGrid">
              <div>
                <label className="fieldLabel">Title</label>
                <input
                  className="field"
                  placeholder="Example: Series 11 Stitch extra"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={90}
                />
                <div className="noteBox">{title.length}/90 characters</div>
              </div>

              <div>
                <label className="fieldLabel">Seller</label>
                <div className="sellerBox">{seller || username || "Loading..."}</div>
              </div>

              <div>
                <label className="fieldLabel">Description / condition notes</label>
                <textarea
                  className="textarea"
                  placeholder="Example: New from blind box, may have normal manufactured defects. Smoke-free home. Please ask questions before buying."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="fieldLabel">Price</label>
                <input
                  className="field"
                  placeholder="Example: 5 or 5.00"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="noteBox">Leave blank if you want people to message you for price.</div>
              </div>

              {editingId && (
                <div className="panelBox">
                  <div className="sectionTitle" style={{ fontSize: 18, marginBottom: 10 }}>
                    Listing status
                  </div>

                  <div className="statusGrid">
                    {[
                      { value: "active", label: "🟢 Active" },
                      { value: "pending", label: "⏳ Pending" },
                      { value: "sold", label: "✅ Sold" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setListingStatus(option.value as ListingStatus)}
                        className={`statusButton ${
                          listingStatus === option.value ? "statusButtonActive" : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="panelBox">
                <div className="sectionTitle" style={{ fontSize: 18, marginBottom: 10 }}>
                  Delivery options
                </div>

                <div className="toggleWrap">
                  <button
                    type="button"
                    onClick={() => setShippingEnabled((prev) => !prev)}
                    className={`toggleButton ${shippingEnabled ? "toggleButtonActive" : ""}`}
                  >
                    🚚 Shipping
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalPickupEnabled((prev) => !prev)}
                    className={`toggleButton ${localPickupEnabled ? "toggleButtonActive" : ""}`}
                  >
                    📍 Local Pickup
                  </button>
                </div>

                {shippingEnabled && (
                  <div style={{ marginTop: 12 }}>
                    <label className="fieldLabel">Shipping price</label>
                    <input
                      className="field"
                      placeholder="Example: 6 or 0 for free shipping"
                      inputMode="decimal"
                      value={shippingPrice}
                      onChange={(e) => setShippingPrice(e.target.value)}
                    />
                    <div className="noteBox">Put 0 if shipping is free.</div>
                  </div>
                )}

                {localPickupEnabled && (
                  <div style={{ marginTop: 12 }}>
                    <label className="fieldLabel">Pickup location</label>
                    <input
                      className="field"
                      placeholder="City, state only — avoid full address"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                    <div className="noteBox">
                      For safety, list a general city/state. Share exact meetup details privately.
                    </div>
                  </div>
                )}
              </div>

              <div className="uploadBox">
                <div className="sectionTitle" style={{ fontSize: 18, marginBottom: 10 }}>
                  Picture
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0] ?? null)}
                  className="fileInput"
                />

                <div className="noteBox">
                  {uploading
                    ? "Compressing and uploading image..."
                    : "Images are compressed before upload to help save bandwidth."}
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="fieldLabel">Or paste image URL</label>
                  <input
                    className="field"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {!!error && <div className="errorBox">{error}</div>}
              {!!notice && <div className="successBox">{notice}</div>}

              <div className="buttonRow">
                <button
                  onClick={() => void handleSubmit()}
                  disabled={loading || uploading}
                  className="submitButton"
                >
                  {loading
                    ? editingId
                      ? "Saving..."
                      : "Posting..."
                    : editingId
                      ? "Save Listing"
                      : "Post Listing"}
                </button>

                <Link href="/marketplace" className="secondaryButton">
                  Back to Marketplace
                </Link>
              </div>
            </div>
          </section>

          <aside>
            <section className="previewCard">
              <div className="sectionTitle">Live preview</div>

              <div className="previewImageBox">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Listing preview"
                    loading="lazy"
                    decoding="async"
                    className="previewImage"
                  />
                ) : (
                  <div style={{ color: "#64748b", fontWeight: 900, textAlign: "center" }}>
                    Image preview will show here
                  </div>
                )}
              </div>

              <div className="listingPreviewTitle">
                {title.trim() || "Your listing title"}
              </div>

              <div className="listingPreviewPrice">{formatMoney(price)}</div>

              <div className="pillRow">
                <span className="pill">
                  {listingStatus === "sold"
                    ? "✅ Sold"
                    : listingStatus === "pending"
                      ? "⏳ Pending"
                      : "🟢 Active"}
                </span>

                {shippingEnabled && (
                  <span className="pill">
                    🚚 Shipping
                    {shippingPrice.trim() ? ` • ${formatMoney(shippingPrice)}` : ""}
                  </span>
                )}

                {localPickupEnabled && (
                  <span className="pill">
                    📍 Pickup{pickupLocation.trim() ? ` • ${pickupLocation.trim()}` : ""}
                  </span>
                )}
              </div>

              <div className="previewDescription">
                {description.trim() ||
                  "Description and condition notes will show here. Add anything buyers should know before messaging."}
              </div>

              <div style={{ color: "#64748b", fontSize: 14, marginTop: 14 }}>
                Seller: <strong>{seller || username || "Collector"}</strong>
              </div>

              <div className="safeNote">
                Buyer and seller handle payment, pickup/shipping, item condition, and any refunds directly.
              </div>
            </section>

            <section className="noticeCard">
              <div className="sectionTitle">Seller checklist</div>

              <div className="noticeList">
                <div className="noticeItem">
                  <span>📸</span>
                  <span>Use a clear photo with the item easy to see.</span>
                </div>
                <div className="noticeItem">
                  <span>📝</span>
                  <span>Mention condition, defects, duplicates, or missing packaging.</span>
                </div>
                <div className="noticeItem">
                  <span>💬</span>
                  <span>Keep communication clear and only complete transactions you are comfortable with.</span>
                </div>
                <div className="noticeItem">
                  <span>⚠️</span>
                  <span>Adorable Vault helps collectors connect but does not process payments or guarantee transactions.</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
