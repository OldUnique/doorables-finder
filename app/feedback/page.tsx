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
  admin_reply: string | null;
  resolved: boolean | null;
};

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

const CATEGORIES = ["Bug", "Idea", "Feature Request", "General Comment"];
const STATUS_TAGS = ["new", "planned", "added", "resolved", "not right now"];

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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  async function loadPosts() {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const email = user?.email || "";
    const admin = isAdminEmail(email);

    setAdminEmail(email);
    setIsAdmin(admin);

    const query = supabase
      .from("feedback_posts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = admin
      ? await query
      : await query.eq("approved", true);

    if (error) {
      setStatusMessage("Could not load feedback: " + error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as FeedbackPost[];
    setPosts(rows);
    setReplyDrafts((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (!(row.id in next)) {
          next[row.id] = row.admin_reply || "";
        }
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
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
      admin_reply: null,
      resolved: false,
    const updates: Partial<FeedbackPost> = {
      status_tag: statusTag,
      resolved: statusTag === "resolved",
    };

    const { error } = await supabase
      .from("feedback_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not update tag: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function markResolved(post: FeedbackPost) {
    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .update({
        resolved: true,
        status_tag: "resolved",
      })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not mark resolved: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function saveReply(post: FeedbackPost) {
    const reply = (replyDrafts[post.id] || "").trim();
    setBusyId(post.id);

    const { error } = await supabase
      .from("feedback_posts")
      .update({ admin_reply: reply || null })
      .eq("id", post.id);

    if (error) {
      setStatusMessage("Could not save reply: " + error.message);
      setBusyId(null);
      return;
    }

    setStatusMessage(reply ? "Reply saved." : "Reply cleared.");
              const isResolved = post.resolved || post.status_tag === "resolved";

              const badgeColor =
                post.status_tag === "added"
                  ? "#16a34a"
                  : post.status_tag === "planned"
                    ? "#2563eb"
                    : post.status_tag === "resolved"
                      ? "#059669"
                      {isResolved ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          Resolved ✅
                        </span>
                      ) : null}
                  {post.admin_reply ? (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 14,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          marginBottom: 6,
                          color: "#1d4ed8",
                        }}
                      >
                        Reply from Adorable Vault
                      </div>
                      <div style={{ lineHeight: 1.6 }}>{post.admin_reply}</div>
                    </div>
                  ) : null}
                          onClick={() => markResolved(post)}
                          disabled={busyId === post.id}
                          style={resolvedButton}
                        >
                          Resolved ✅
                        </button>

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

                  {isAdmin ? (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          marginBottom: 10,
                          color: "#111827",
                        }}
                      >
                        Admin Reply
                      </div>

                      <textarea
                        value={replyDrafts[post.id] || ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a reply for this feedback..."
                        style={{
                          ...inputStyle,
                          marginBottom: 10,
                          minHeight: 90,
                          resize: "vertical",
                        }}
                      />

                      <button
                        onClick={() => saveReply(post)}
                        disabled={busyId === post.id}
                        style={replyButton}
                      >
                        Save Reply 💬
                      </button>
                    </div>
                  ) : null}
const resolvedButton = {
  background: "#059669",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const replyButton = {
  background: "#2563eb",
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