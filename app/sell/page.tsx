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

  async function uploadImage(file: File) {
    const fileName = `listing-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("marketplace")
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("marketplace")
      .getPublicUrl(fileName);

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

    let imageUrl: string | null = null;

    try {
      if (selectedFile) {
        setUploading(true);
        imageUrl = await uploadImage(selectedFile);
        setUploading(false);
      }
    } catch (err: any) {
      alert("Upload failed: " + err.message);
      setLoading(false);
      setUploading(false);
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
    return <main style={loadingScreen}>Checking account...</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Create Listing</h1>

        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <input placeholder="Seller name" value={seller} onChange={(e) => setSeller(e.target.value)} style={inputStyle} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 120 }} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />

        <label style={uploadStyle}>
          📸 Choose Image
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
        </label>

        {selectedFile && <div style={fileInfoStyle}>Selected: {selectedFile.name}</div>}

        {previewUrl && (
          <div style={previewWrapStyle}>
            <div style={previewLabelStyle}>Preview</div>
            <div style={previewBoxStyle}>
              <img src={previewUrl} alt="preview" style={previewImageStyle} />
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading || uploading} style={buttonStyle}>
          {uploading ? "Uploading..." : loading ? "Posting..." : "Post Listing"}
        </button>
      </div>
    </main>
  );
}

const pageStyle = { minHeight: "100vh", padding: 24 };
const cardStyle = { maxWidth: 760, margin: "0 auto" };
const titleStyle = { fontSize: 42 };
const inputStyle = { width: "100%", padding: 10, marginBottom: 10 };
const uploadStyle = { padding: 10, background: "#eee", cursor: "pointer" };
const fileInfoStyle = { marginBottom: 10 };
const previewWrapStyle = { marginBottom: 10 };
const previewLabelStyle = { fontWeight: "bold" };
const previewBoxStyle = { height: 200 };
const previewImageStyle = { width: "100%", height: "100%", objectFit: "contain" };
const buttonStyle = { padding: 12, background: "blue", color: "white" };
const loadingScreen = { minHeight: "100vh", display: "grid", placeItems: "center" };
