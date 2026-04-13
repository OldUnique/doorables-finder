"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
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
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </label>

        {selectedFile && (
          <div style={fileInfoStyle}>
            Selected: {selectedFile.name}
          </div>
        )}

        {previewUrl && (
          <div style={previewWrapStyle}>
            <div style={previewLabelStyle}>Preview</div>
            <div style={previewBoxStyle}>
              <img
                src={previewUrl}
                alt="Listing preview"
                style={previewImageStyle}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          style={{
            ...buttonStyle,
            opacity: loading || uploading ? 0.8 : 1,
            cursor: loading || uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading
            ? "Uploading image..."
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
  background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
};

const cardStyle = {
  maxWidth: 760,
  margin: "0 auto",
  background: "rgba(255,255,255,0.96)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
};

const titleStyle = {
  textAlign: "center" as const,
  fontSize: 42,
  fontWeight: 900,
  color: "#111827",
  marginTop: 0,
  marginBottom: 20,
};

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 14,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
  boxSizing: "border-box" as const,
};

const uploadStyle = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 12,
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  cursor: "pointer",
  fontWeight: 700,
  marginBottom: 14,
};

const fileInfoStyle = {
  marginBottom: 14,
  color: "#374151",
  fontWeight: 600,
};

const previewWrapStyle = {
  marginBottom: 18,
};

const previewLabelStyle = {
  marginBottom: 8,
  color: "#111827",
  fontWeight: 800,
};

const previewBoxStyle = {
  width: "100%",
  height: 260,
  borderRadius: 16,
  background: "#f3f4f6",
  border: "1px solid #d1d5db",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
};

const buttonStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  background: "linear-gradient(135deg,#4f8cff,#6fa8ff)",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  border: "none",
};

const loadingScreen = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
  color: "white",
  fontSize: 24,
  fontWeight: 800,
};