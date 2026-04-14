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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read the selected image."));
      };

      img.src = objectUrl;
    });
  }

  async function buildMarketplaceImage(file: File): Promise<File> {
    const img = await loadImageFromFile(file);

    const canvas = document.createElement("canvas");
    const size = 1200;
    const padding = 120;

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not prepare image.");
    }

    // White background so all listings look consistent.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const maxDrawWidth = size - padding * 2;
    const maxDrawHeight = size - padding * 2;

    const scale = Math.min(maxDrawWidth / img.width, maxDrawHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const x = (size - drawWidth) / 2;
    const y = (size - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      throw new Error("Could not create marketplace image.");
    }

    const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
    return new File([blob], `${safeBaseName}_marketplace.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setSelectedFile(null);
      return;
    }

    try {
      setProcessingImage(true);

      const processedFile = await buildMarketplaceImage(file);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const nextPreviewUrl = URL.createObjectURL(processedFile);

      setSelectedFile(processedFile);
      setPreviewUrl(nextPreviewUrl);
    } catch (err: any) {
      alert(err.message || "Could not process image.");
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    } finally {
      setProcessingImage(false);
    }
  }

  async function uploadImage(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be signed in to upload an image.");
    }

    const cleanName = file.name.replace(/\s+/g, "_");
    const fileName = `${user.id}/listing-${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("marketplace")
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("marketplace").getPublicUrl(fileName);
    return data.publicUrl;
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

    if (!title.trim()) {
      alert("Please enter a title.");
      setLoading(false);
      return;
    }

    if (price && Number.isNaN(Number(price))) {
      alert("Please enter a valid price.");
      setLoading(false);
      return;
    }

    let imageUrl: string | null = null;

    try {
      if (selectedFile) {
        setUploading(true);
        imageUrl = await uploadImage(selectedFile);
      }
    } catch (err: any) {
      alert("Upload failed: " + err.message);
      setLoading(false);
      setUploading(false);
      return;
    } finally {
      setUploading(false);
    }

    const { error } = await supabase.from("marketplace_listings").insert([
      {
        title: title.trim(),
        description: description.trim() || null,
        price: price ? Number(price) : null,
        image_url: imageUrl,
        seller_name: seller.trim() || null,
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
    return <main style={loadingScreen}>Checking account...</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Create Listing</h1>

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
          style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const }}
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />

        <label style={uploadStyle}>
          📸 Choose Image
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
        </label>

        {processingImage && (
          <div style={fileInfoStyle}>Preparing image for marketplace...</div>
        )}

        {selectedFile && !processingImage && (
          <div style={fileInfoStyle}>Ready to upload: {selectedFile.name}</div>
        )}

        {previewUrl && (
          <div style={previewWrapStyle}>
            <div style={previewLabelStyle}>Preview</div>
            <div style={previewBoxStyle}>
              <img src={previewUrl} alt="preview" style={previewImageStyle} />
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || uploading || processingImage}
          style={{
            ...buttonStyle,
            opacity: loading || uploading || processingImage ? 0.75 : 1,
          }}
        >
          {processingImage
            ? "Preparing Image..."
            : uploading
            ? "Uploading..."
            : loading
            ? "Posting..."
            : "Post Listing"}
        </button>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: 24,
  background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
};

const cardStyle = {
  maxWidth: 760,
  margin: "0 auto",
  background: "white",
  padding: 24,
  borderRadius: 20,
  boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
};

const titleStyle = {
  fontSize: 42,
  marginTop: 0,
  marginBottom: 18,
  color: "#111827",
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  boxSizing: "border-box" as const,
};

const uploadStyle = {
  display: "inline-block",
  padding: "12px 14px",
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
  borderRadius: 12,
  cursor: "pointer",
  marginBottom: 10,
  color: "#111827",
  fontWeight: 600,
};

const fileInfoStyle = {
  marginBottom: 10,
  color: "#374151",
};

const previewWrapStyle = {
  marginBottom: 14,
};

const previewLabelStyle = {
  fontWeight: "bold" as const,
  color: "#111827",
  marginBottom: 8,
};

const previewBoxStyle = {
  height: 240,
  borderRadius: 14,
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  padding: 10,
};

const previewImageStyle = {
  maxWidth: "100%",
  maxHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain" as const,
  display: "block",
};

const buttonStyle = {
  padding: "12px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const loadingScreen = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
};
