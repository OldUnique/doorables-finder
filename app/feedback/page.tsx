"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";

type FeedbackPost = {
  id: string;
  name: string | null;
  message: string;
  category: string | null;
  approved: boolean | null;
  anonymous: boolean | null;
  contact_me: boolean | null;
  status_tag: string | null;
  likes: number | null;
  created_at: string | null;
  user_id: string | null;
};

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

const CATEGORIES = ["Bug", "Idea", "Feature Request", "General Comment"];
const STATUS_TAGS = ["new", "planned", "added", "not right now"];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function niceDate(value?: string | null) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function FeedbackPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Idea");
  const [anonymous, setAnonymous] = useState(false);
  const [contactMe, setContactMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const email = user?.email || "";

    setAdminEmail(email);
    setIsAdmin(isAdminEmail(email));

    const query = supabase
      .from("feedback_posts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = isAdmin
      ? await query
      : await query.eq("approved", true);

    if (error) {
      setStatusMessage("Could not load feedback: " + error.message);
      setLoading(false);
      return;
    }

    setPosts((data || []) as FeedbackPost[]);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email || "";
      const admin = isAdminEmail(email);
      setAdminEmail(email);
      setIsAdmin(admin);

      let query = supabase
        .from("feedback_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!admin) {
        query = query.eq("approved", true);
      }

      const { data, error } = await query;

      if (error) {
        setStatusMessage("Could not load feedback: " + error.message);
        setLoading(false);
        return;
      }

      setPosts((data || []) as FeedbackPost[]);
      setLoading(false);
    }

    init();
  }, [supabase]);

  async function handleSubmit() {
    if (!message.trim()) {
      setStatusMessage("Please enter a message.");
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    const { error } = await supabase.from("feedback_posts").insert({
      name: anonymous ? "Anonymous" : name.trim() || null,
      message: message.trim(),
      category,
      anonymous,
      contact_me: contactMe,
      approved: false,
      status_tag: "new",
      likes: 0,
      user_id: user?.id || null,
    });

    if (error) {
      setStatusMessage("Could not post feedback: " + error.message);
      setSubmitting(false);
      return;
    }

    setMessage("");
    setName("");
    setCategory("Idea");
    setAnonymous(false);
    setContactMe(false);
    setSubmitting(false);
    setStatusMessage("Thanks! Your feedback was submitted for approval.");
    await loadPosts();
  }

  async function handleLike(post: FeedbackPost) {
    const nextLikes = Number(post.likes || 0) + 1;

    const { error } = await supabase
      .from("feedback_posts")
      .update({ likes: nextLikes })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not add thumbs up: " + error.message);
      return;
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes: nextLikes } : p))
    );
  }

  async function approvePost(post: FeedbackPost) {
    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .update({ approved: true })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not approve post: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function unapprovePost(post: FeedbackPost) {
    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .update({ approved: false })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not hide post: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function changeStatus(post: FeedbackPost, statusTag: string) {
    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .update({ status_tag: statusTag })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not update tag: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function deletePost(post: FeedbackPost) {
    const ok = window.confirm("Delete this feedback post?");
    if (!ok) return;

    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not delete post: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  const visiblePosts = posts.filter((p) => isAdmin || p.approved);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(135deg,#0f172a,#1d4ed8)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg,#111827,#4338ca)",
            borderRadius: 24,
            padding: 28,
            marginBottom: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900 }}>Feedback Wall 💜</div>
          <div style={{ marginTop: 8, fontSize: 18, opacity: 0.95 }}>
            Share ideas, bugs, and requests to help make the site better.
          </div>
          {isAdmin ? (
            <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
              Admin mode: {adminEmail}
            </div>
          ) : null}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            color: "#111827",
            borderRadius: 22,
            padding: 20,
            marginBottom: 18,
            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
            Leave feedback
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            style={inputStyle}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell me what you'd like improved, fixed, or added..."
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Post anonymously
            </label>

            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={contactMe}
                onChange={(e) => setContactMe(e.target.checked)}
              />
              Contact me about this
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={primaryButton}
          >
            {submitting ? "Submitting..." : "Post Feedback"}
          </button>
        </div>

        {statusMessage ? (
          <div
            style={{
              marginBottom: 16,
              background: "rgba(255,255,255,0.96)",
              color: "#111827",
              borderRadius: 16,
              padding: 14,
              fontWeight: 700,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 20 }}>Loading feedback...</div>
        ) : visiblePosts.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.96)",
              color: "#111827",
              borderRadius: 18,
              padding: 24,
            }}
          >
            No posts yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {visiblePosts.map((post) => {
              const badgeColor =
                post.status_tag === "added"
                  ? "#16a34a"
                  : post.status_tag === "planned"
                  ? "#2563eb"
                  : post.status_tag === "not right now"
                  ? "#64748b"
                  : "#d97706";

              return (
                <div
                  key={post.id}
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    color: "#111827",
                    borderRadius: 20,
                    padding: 18,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        {post.anonymous ? "Anonymous" : post.name || "Guest"}
                      </div>
                      <div style={{ marginTop: 4, color: "#475569", fontSize: 14 }}>
                        {post.category || "General Comment"} • {niceDate(post.created_at)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: badgeColor,
                          color: "white",
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontWeight: 800,
                          fontSize: 12,
                          textTransform: "uppercase",
                        }}
                      >
                        {post.status_tag || "new"}
                      </span>

                      {post.contact_me ? (
                        <span
                          style={{
                            background: "#ede9fe",
                            color: "#5b21b6",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          Contact Me
                        </span>
                      ) : null}

                      {isAdmin ? (
                        <span
                          style={{
                            background: post.approved ? "#dcfce7" : "#fef3c7",
                            color: post.approved ? "#166534" : "#92400e",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {post.approved ? "Approved" : "Pending Approval"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
                    {post.message}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => handleLike(post)} style={secondaryButton}>
                      👍 {post.likes || 0}
                    </button>

                    {isAdmin ? (
                      <>
                        {!post.approved ? (
                          <button
                            onClick={() => approvePost(post)}
                            disabled={busyId === post.id}
                            style={greenButton}
                          >
                            Approve ✅
                          </button>
                        ) : (
                          <button
                            onClick={() => unapprovePost(post)}
                            disabled={busyId === post.id}
                            style={orangeButton}
                          >
                            Hide ⏳
                          </button>
                        )}

                        <select
                          value={post.status_tag || "new"}
                          onChange={(e) => changeStatus(post, e.target.value)}
                          style={smallSelect}
                          disabled={busyId === post.id}
                        >
                          {STATUS_TAGS.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => deletePost(post)}
                          disabled={busyId === post.id}
                          style={redButton}
                        >
                          Delete 🗑️
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

const checkboxLabel = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontWeight: 700,
};

const primaryButton = {
  background: "linear-gradient(135deg,#4f8cff,#6fa8ff)",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const greenButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const orangeButton = {
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const redButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const smallSelect = {
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "10px 12px",
  fontWeight: 700,
};
