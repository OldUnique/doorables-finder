"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";

type FeedbackPost = {
  id: string;
  name: string | null;
  message: string;
  category: string | null;
  approved: boolean | null;
  is_visible?: boolean | null;
  anonymous?: boolean | null;
  contact_me?: boolean | null;
  status?: string | null;
  status_tag?: string | null;
  likes?: number | null;
  created_at: string | null;
  user_id?: string | null;
  admin_reply?: string | null;
  resolved?: boolean | null;
};

type FilterKey =
  | "all"
  | "Idea"
  | "Bug"
  | "Feature Request"
  | "Missing Doorable"
  | "Marketplace Concern"
  | "General Comment"
  | "planned"
  | "added"
  | "resolved"
  | "pending";

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
  "rffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

const CATEGORIES = [
  "Idea",
  "Bug",
  "Feature Request",
  "Missing Doorable",
  "Marketplace Concern",
  "General Comment",
];

const STATUS_TAGS = ["new", "planned", "added", "resolved", "not right now"];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function niceDate(value?: string | null) {
  if (!value) return "Unknown";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cleanTag(value?: string | null) {
  return String(value || "new").trim().toLowerCase();
}

function getPostStatus(post: FeedbackPost) {
  return cleanTag(post.status || post.status_tag || "new");
}

function isResolvedPost(post: FeedbackPost) {
  return Boolean(post.resolved) || getPostStatus(post) === "resolved";
}

function isPubliclyVisible(post: FeedbackPost) {
  return post.approved === true && post.is_visible !== false;
}

function getStatusMeta(status?: string | null) {
  const tag = cleanTag(status);

  if (tag === "added") {
    return { label: "Added", icon: "✨", className: "statusAdded" };
  }

  if (tag === "planned") {
    return { label: "Planned", icon: "🗓️", className: "statusPlanned" };
  }

  if (tag === "resolved") {
    return { label: "Resolved", icon: "✅", className: "statusResolved" };
  }

  if (tag === "not right now") {
    return { label: "Not right now", icon: "⏳", className: "statusPaused" };
  }

  return { label: "New", icon: "🆕", className: "statusNew" };
}

function getCategoryIcon(category?: string | null) {
  if (category === "Bug") return "🐞";
  if (category === "Feature Request") return "🚀";
  if (category === "Missing Doorable") return "🔎";
  if (category === "Marketplace Concern") return "⚠️";
  if (category === "General Comment") return "💬";
  return "💡";
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Please refresh and try again.`)), ms)
    ),
  ]);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function looksLikeMissingColumn(message: string, column: string) {
  return message.toLowerCase().includes(column.toLowerCase());
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
  const [postToWall, setPostToWall] = useState(true);

  // Sends a private copy to your email through /api/send-feedback.
  // The destination email stays hidden in Vercel's FEEDBACK_TO_EMAIL environment variable.
  const [sendPrivateCopy, setSendPrivateCopy] = useState(true);
  const [replyEmail, setReplyEmail] = useState("");
  const [honey, setHoney] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  async function loadPosts() {
    setLoading(true);
    setStatusMessage("");

    try {
      let userEmail = "";
      let admin = false;

      // Do not let auth issues trap the public feedback wall in "Loading..."
      try {
        const { data: authData } = await withTimeout(
          supabase.auth.getUser(),
          2500,
          "Admin/auth check"
        );

        const user = authData.user;
        userEmail = user?.email || "";
        admin = isAdminEmail(userEmail);

        if (user?.email && !replyEmail) {
          setReplyEmail(user.email);
        }
      } catch {
        userEmail = "";
        admin = false;
      }

      setAdminEmail(userEmail);
      setIsAdmin(admin);

      let data: FeedbackPost[] | null = null;
      let loadErrorMessage = "";

      if (admin) {
        const result = await withTimeout(
          supabase.from("feedback_posts").select("*").order("created_at", { ascending: false }),
          9000,
          "Feedback load"
        );

        if (result.error) {
          loadErrorMessage = result.error.message;
        } else {
          data = (result.data || []) as FeedbackPost[];
        }
      } else {
        const result = await withTimeout(
          supabase
            .from("feedback_posts")
            .select("*")
            .eq("approved", true)
            .eq("is_visible", true)
            .order("created_at", { ascending: false }),
          9000,
          "Feedback load"
        );

        if (result.error && looksLikeMissingColumn(result.error.message, "is_visible")) {
          const fallback = await withTimeout(
            supabase
              .from("feedback_posts")
              .select("*")
              .eq("approved", true)
              .order("created_at", { ascending: false }),
            9000,
            "Feedback load"
          );

          if (fallback.error) {
            loadErrorMessage = fallback.error.message;
          } else {
            data = (fallback.data || []) as FeedbackPost[];
          }
        } else if (result.error) {
          loadErrorMessage = result.error.message;
        } else {
          data = (result.data || []) as FeedbackPost[];
        }
      }

      if (loadErrorMessage) {
        setStatusMessage("Could not load feedback: " + loadErrorMessage);
        setPosts([]);
        return;
      }

      const nextPosts = (data || []).map((post) => ({
        ...post,
        status: post.status || post.status_tag || "new",
        likes: Number(post.likes || 0),
        anonymous: Boolean(post.anonymous),
        contact_me: Boolean(post.contact_me),
        resolved: Boolean(post.resolved) || cleanTag(post.status || post.status_tag) === "resolved",
      }));

      setPosts(nextPosts);

      setReplyDrafts((prev) => {
        const next = { ...prev };
        for (const post of nextPosts) {
          if (next[post.id] === undefined) {
            next[post.id] = post.admin_reply || "";
          }
        }
        return next;
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? "Could not load feedback: " + error.message
          : "Could not load feedback. Please refresh and try again."
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Feedback | Adorable Vault";
    setPageUrl(typeof window !== "undefined" ? window.location.href : "");
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function sendPrivateFeedbackEmail(params: {
    displayName: string;
    replyEmail: string;
    category: string;
    message: string;
  }) {
    const res = await fetch("/api/send-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.displayName,
        replyEmail: params.replyEmail || null,
        type: params.category,
        subject: `${params.category} feedback`,
        message: params.message,
        pageUrl,
        honey,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Feedback was saved, but the private email copy could not send.");
    }
  }

  async function handleSubmit() {
    if (honey.trim()) {
      setStatusMessage("Spam check failed.");
      return;
    }

    if (!message.trim()) {
      setStatusMessage("Please enter a message.");
      return;
    }

    if (message.trim().length < 8) {
      setStatusMessage("Please add a little more detail so the feedback is useful.");
      return;
    }

    if (contactMe && !replyEmail.trim()) {
      setStatusMessage("Please add a reply email if you want to be contacted.");
      return;
    }

    if (replyEmail.trim() && !isLikelyEmail(replyEmail)) {
      setStatusMessage("Please enter a valid reply email, or leave it blank.");
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      const displayName = anonymous ? "Anonymous" : name.trim() || null;
      const cleanMessage = message.trim();

      const insertPayload = {
        name: displayName,
        message: cleanMessage,
        category,
        approved: postToWall,
        is_visible: postToWall,
        anonymous,
        contact_me: contactMe,
        status: "new",
        status_tag: "new",
        likes: 0,
        user_id: user?.id || null,
        admin_reply: null,
        resolved: false,
      };

      // Try the full insert first. If your table is missing optional columns,
      // fall back to the core columns so feedback still posts.
      const fullInsert = await supabase.from("feedback_posts").insert(insertPayload);

      if (fullInsert.error) {
        const fallbackInsert = await supabase.from("feedback_posts").insert({
          name: displayName,
          message: cleanMessage,
          category,
          approved: postToWall,
          status: "new",
        });

        if (fallbackInsert.error) {
          throw fallbackInsert.error;
        }
      }

      try {
        if (sendPrivateCopy || contactMe || !postToWall) {
          await sendPrivateFeedbackEmail({
            displayName: displayName || "Anonymous collector",
            replyEmail: replyEmail.trim(),
            category,
            message: cleanMessage,
          });
        }

        setStatusMessage(
          postToWall
            ? sendPrivateCopy || contactMe
              ? "Thanks! Your feedback was posted to the Feedback Wall and sent to the Adorable Vault inbox 💜"
              : "Thanks! Your feedback was posted to the Feedback Wall 💜"
            : "Thanks! Your feedback was sent privately to the Adorable Vault inbox 💜"
        );
      } catch (emailError) {
        setStatusMessage(
          emailError instanceof Error
            ? emailError.message
            : "Feedback was saved, but the private email copy could not send."
        );
      }

      setMessage("");
      setName("");
      setCategory("Idea");
      setAnonymous(false);
      setContactMe(false);
      setPostToWall(true);
      setSendPrivateCopy(true);
      if (!user?.email) setReplyEmail("");

      await loadPosts();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? "Could not post feedback: " + error.message
          : "Could not post feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
    setStatusMessage("");

    let result = await supabase
      .from("feedback_posts")
      .update({ approved: true, is_visible: true })
      .eq("id", post.id);

    if (result.error && looksLikeMissingColumn(result.error.message, "is_visible")) {
      result = await supabase
        .from("feedback_posts")
        .update({ approved: true })
        .eq("id", post.id);
    }

    if (result.error) {
      setStatusMessage("Could not show post: " + result.error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function unapprovePost(post: FeedbackPost) {
    setBusyId(post.id);
    setStatusMessage("");

    let result = await supabase
      .from("feedback_posts")
      .update({ approved: false, is_visible: false })
      .eq("id", post.id);

    if (result.error && looksLikeMissingColumn(result.error.message, "is_visible")) {
      result = await supabase
        .from("feedback_posts")
        .update({ approved: false })
        .eq("id", post.id);
    }

    if (result.error) {
      setStatusMessage("Could not hide post: " + result.error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  async function changeStatus(post: FeedbackPost, statusTag: string) {
    const nextTag = statusTag.trim().toLowerCase();
    const nextResolved = nextTag === "resolved";

    setBusyId(post.id);
    setStatusMessage("");

    let result = await supabase
      .from("feedback_posts")
      .update({
        status: nextTag,
        status_tag: nextTag,
        resolved: nextResolved,
      })
      .eq("id", post.id);

    if (result.error) {
      result = await supabase
        .from("feedback_posts")
        .update({
          status: nextTag,
        })
        .eq("id", post.id);
    }

    if (result.error) {
      setStatusMessage("Could not update tag: " + result.error.message);
      setBusyId(null);
      return;
    }

    if (nextResolved) {
      setFilter("resolved");
      setStatusMessage("Marked as resolved and moved to the Resolved filter ✅");
    } else {
      setStatusMessage(`Status changed to ${nextTag}.`);
    }

    await loadPosts();
    setBusyId(null);
  }

  async function markResolved(post: FeedbackPost) {
    setBusyId(post.id);
    setStatusMessage("");

    let result = await supabase
      .from("feedback_posts")
      .update({
        resolved: true,
        status: "resolved",
        status_tag: "resolved",
      })
      .eq("id", post.id);

    if (result.error) {
      result = await supabase
        .from("feedback_posts")
        .update({
          status: "resolved",
        })
        .eq("id", post.id);
    }

    if (result.error) {
      setStatusMessage("Could not mark resolved: " + result.error.message);
      setBusyId(null);
      return;
    }

    setFilter("resolved");
    setStatusMessage("Marked as resolved and moved to the Resolved filter ✅");

    await loadPosts();
    setBusyId(null);
  }

  async function saveReply(post: FeedbackPost) {
    setBusyId(post.id);
    setStatusMessage("");

    const reply = (replyDrafts[post.id] || "").trim();

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
    await loadPosts();
    setBusyId(null);
  }

  async function deletePost(post: FeedbackPost) {
    const ok = window.confirm("Delete this feedback post?");
    if (!ok) return;

    setBusyId(post.id);
    setStatusMessage("");

    const { error } = await supabase.from("feedback_posts").delete().eq("id", post.id);

    if (error) {
      setStatusMessage("Could not delete post: " + error.message);
      setBusyId(null);
      return;
    }

    await loadPosts();
    setBusyId(null);
  }

  const approvedPosts = isAdmin ? posts : posts.filter(isPubliclyVisible);

  const pendingCount = posts.filter((p) => !isPubliclyVisible(p)).length;
  const plannedCount = approvedPosts.filter((p) => getPostStatus(p) === "planned").length;
  const addedCount = approvedPosts.filter((p) => getPostStatus(p) === "added").length;
  const resolvedCount = approvedPosts.filter(isResolvedPost).length;
  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, item) => {
    acc[item] = approvedPosts.filter((post) => post.category === item).length;
    return acc;
  }, {});

  const visiblePosts = approvedPosts.filter((post) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [
        post.name,
        post.message,
        post.category,
        post.status,
        post.status_tag,
        post.admin_reply,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);

    if (!matchesSearch) return false;

    if (filter === "all") return true;
    if (filter === "pending") return isAdmin && !isPubliclyVisible(post);
    if (filter === "resolved") return isResolvedPost(post);
    if (filter === "planned") return getPostStatus(post) === "planned";
    if (filter === "added") return getPostStatus(post) === "added";

    return post.category === filter;
  });

  const statusTone =
    statusMessage.toLowerCase().includes("thanks") ||
    statusMessage.toLowerCase().includes("saved") ||
    statusMessage.toLowerCase().includes("cleared") ||
    statusMessage.toLowerCase().includes("marked as resolved") ||
    statusMessage.toLowerCase().includes("status changed")
      ? "successStatus"
      : statusMessage.toLowerCase().includes("could not") ||
          statusMessage.toLowerCase().includes("please") ||
          statusMessage.toLowerCase().includes("spam") ||
          statusMessage.toLowerCase().includes("failed")
        ? "errorStatus"
        : "";

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
          padding-top: 28px;
          padding-bottom: 90px;
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active {
          text-decoration: none !important;
        }

        .hero {
          border-radius: 34px;
          padding: 30px;
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
          color: #fde68a;
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 12px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(2.25rem, 5.8vw, 4.2rem);
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
          max-width: 780px;
          font-weight: 780;
        }

        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 17px;
        }

        .miniLink,
        .miniLink:visited {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 999px;
          padding: 9px 13px;
          color: #ffffff !important;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          font-size: 12px;
          font-weight: 1000;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          min-width: 330px;
        }

        .statBubble {
          border-radius: 22px;
          padding: 14px;
          background: rgba(15,23,42,0.58);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 14px 28px rgba(0,0,0,0.20);
          text-align: center;
        }

        .statNumber {
          color: #fde68a;
          font-size: 25px;
          font-weight: 1000;
          line-height: 1;
          margin-bottom: 6px;
        }

        .statLabel {
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.25;
          font-weight: 850;
        }

        .layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 18px;
          align-items: start;
        }

        .card {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border-radius: 28px;
          padding: 22px;
          border: 1px solid rgba(255,255,255,0.60);
          box-shadow: 0 20px 46px rgba(0,0,0,0.24);
        }

        .sectionTitle {
          color: #312e81;
          font-size: 22px;
          font-weight: 1000;
          margin-bottom: 10px;
          letter-spacing: -0.4px;
        }

        .muted {
          color: #64748b;
          line-height: 1.55;
          font-size: 14px;
          font-weight: 780;
        }

        .hiddenField {
          position: absolute;
          left: -9999px;
          opacity: 0;
          height: 0;
          width: 0;
        }

        .privateNote {
          margin: 12px 0 14px;
          border-radius: 18px;
          padding: 12px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
        }

        .formGrid {
          display: grid;
          gap: 13px;
        }

        .fieldLabel {
          display: block;
          font-size: 13px;
          font-weight: 950;
          color: #334155;
          margin-bottom: 6px;
        }

        .field,
        .select,
        .textarea,
        .adminTextarea,
        .adminSelect {
          width: 100%;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 15px;
          background: white;
          color: #111827;
          outline: none;
          font-family: inherit;
        }

        .textarea {
          min-height: 142px;
          resize: vertical;
        }

        .adminTextarea {
          min-height: 90px;
          resize: vertical;
          margin-bottom: 10px;
        }

        .field:focus,
        .select:focus,
        .textarea:focus,
        .adminTextarea:focus,
        .adminSelect:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .checkGrid {
          display: grid;
          gap: 9px;
        }

        .checkLabel {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          font-weight: 850;
          color: #334155;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          padding: 11px;
          line-height: 1.35;
        }

        .checkLabel input {
          margin-top: 2px;
        }

        .buttonRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .bubbleButton,
        .bubbleButton:visited {
          min-height: 46px;
          border-radius: 999px;
          padding: 11px 15px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          box-sizing: border-box;
          border: 1px solid transparent;
          font-family: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .bubbleButton:hover {
          transform: translateY(-1px);
        }

        .primaryButton {
          border: none;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 14px 28px rgba(79,70,229,0.24);
        }

        .primaryButton:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .softButton,
        .softButton:visited {
          background: #eef2ff;
          color: #3730a3;
          border-color: #c7d2fe;
        }

        .greenButton {
          background: #16a34a;
          color: white;
        }

        .orangeButton {
          background: #f59e0b;
          color: white;
        }

        .redButton {
          background: #dc2626;
          color: white;
        }

        .resolvedButton {
          background: #059669;
          color: white;
        }

        .replyButton {
          background: #2563eb;
          color: white;
        }

        .statusBox {
          border-radius: 18px;
          padding: 13px 14px;
          font-weight: 900;
          line-height: 1.45;
          margin-bottom: 16px;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #e5e7eb;
        }

        .successStatus {
          color: #166534;
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .errorStatus {
          color: #b91c1c;
          background: #fff1f2;
          border-color: #fecdd3;
        }

        .helperGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .helperItem {
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

        .filterCard {
          margin-bottom: 18px;
        }

        .filterTop {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .filterRow {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 11px;
        }

        .filterButton {
          min-height: 40px;
          border-radius: 999px;
          padding: 9px 12px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #3730a3;
          font-weight: 950;
          cursor: pointer;
          font-family: inherit;
        }

        .filterButtonActive {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: white;
          border-color: transparent;
          box-shadow: 0 12px 22px rgba(79,70,229,0.18);
        }

        .postGrid {
          display: grid;
          gap: 16px;
        }

        .postCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #111827;
          border-radius: 26px;
          padding: 18px;
          box-shadow: 0 18px 38px rgba(0,0,0,0.20);
          border: 1px solid rgba(255,255,255,0.58);
        }

        .postHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .postName {
          font-size: 21px;
          font-weight: 1000;
          line-height: 1.1;
          margin-bottom: 4px;
          color: #111827;
        }

        .postMeta {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.4;
        }

        .badgeRow {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 7px 10px;
          font-weight: 1000;
          font-size: 11px;
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        .statusNew {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .statusPlanned {
          background: #dbeafe;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .statusAdded {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .statusResolved {
          background: #d1fae5;
          color: #047857;
          border-color: #a7f3d0;
        }

        .statusPaused {
          background: #e2e8f0;
          color: #475569;
          border-color: #cbd5e1;
        }

        .approvedBadge {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .pendingBadge {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .contactBadge {
          background: #ede9fe;
          color: #5b21b6;
          border-color: #ddd6fe;
        }

        .privateBadge {
          background: #fce7f3;
          color: #be185d;
          border-color: #fbcfe8;
        }

        .postMessage {
          font-size: 15px;
          line-height: 1.65;
          margin-bottom: 16px;
          white-space: pre-wrap;
          word-break: break-word;
          color: #334155;
          font-weight: 760;
        }

        .adminReply {
          margin-bottom: 16px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 14px;
          color: #1e3a8a;
        }

        .adminPanel {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .adminGrid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: start;
        }

        .emptyCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 38px rgba(0,0,0,0.20);
          text-align: center;
          font-weight: 900;
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-top: 18px;
            padding-bottom: 70px;
          }

          .hero {
            grid-template-columns: 1fr;
            border-radius: 25px;
            padding: 21px;
          }

          .heroTitle {
            font-size: clamp(2rem, 11vw, 3rem);
            letter-spacing: -1.3px;
          }

          .heroText {
            font-size: 14px;
            line-height: 1.52;
          }

          .statsGrid {
            min-width: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .card,
          .postCard,
          .emptyCard {
            border-radius: 23px;
            padding: 18px;
          }

          .filterTop {
            grid-template-columns: 1fr;
          }

          .filterRow,
          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .bubbleButton,
          .filterButton,
          .miniLink {
            width: 100%;
          }

          .heroActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .badgeRow {
            justify-content: flex-start;
          }

          .adminGrid {
            grid-template-columns: 1fr;
          }

          .adminSelect {
            max-width: none !important;
          }
        }

        @media (max-width: 460px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .statBubble {
            padding: 12px;
          }

          .sectionTitle {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="heroBadge">💜 Help build the vault</div>
            <h1 className="heroTitle">Feedback Wall</h1>
            <div className="heroText">
              Share bugs, ideas, missing Doorables, marketplace concerns, and requests. Feedback helps make
              Adorable Vault cleaner, safer, and more useful for collectors. You can post publicly to the wall,
              send a private copy to the inbox, or ask to be contacted.
            </div>

            <div className="heroActions">
              <Link href="/collection" className="miniLink">
                💎 Collection
              </Link>
              <Link href="/marketplace" className="miniLink">
                🛍️ Marketplace
              </Link>
              <Link href="/about" className="miniLink">
                💜 About
              </Link>
            </div>

            {isAdmin ? (
              <div style={{ marginTop: 10, color: "#fde68a", fontWeight: 900, fontSize: 14 }}>
                Admin mode: {adminEmail}
              </div>
            ) : null}
          </div>

          <div className="statsGrid">
            <div className="statBubble">
              <div className="statNumber">{approvedPosts.length}</div>
              <div className="statLabel">visible posts</div>
            </div>
            <div className="statBubble">
              <div className="statNumber">{plannedCount}</div>
              <div className="statLabel">planned ideas</div>
            </div>
            <div className="statBubble">
              <div className="statNumber">{addedCount}</div>
              <div className="statLabel">added updates</div>
            </div>
            <div className="statBubble">
              <div className="statNumber">{resolvedCount}</div>
              <div className="statLabel">resolved items</div>
            </div>
          </div>
        </section>

        {statusMessage ? <div className={`statusBox ${statusTone}`}>{statusMessage}</div> : null}

        <div className="layout">
          <aside>
            <section className="card">
              <div className="sectionTitle">Leave feedback</div>
              <div className="muted" style={{ marginBottom: 14 }}>
                Tell me what should be fixed, added, clarified, or improved. Public feedback can help other collectors
                see what is being requested and what is already planned.
              </div>

              <div className="privateNote">
                🔒 The feedback inbox email stays hidden. Private copies send behind the scenes.
              </div>

              <div className="formGrid">
                <div className="hiddenField">
                  <label>
                    Leave this blank
                    <input value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} />
                  </label>
                </div>

                <div>
                  <label className="fieldLabel">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name optional"
                    className="field"
                    disabled={anonymous}
                  />
                </div>

                <div>
                  <label className="fieldLabel">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="select"
                  >
                    {CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {getCategoryIcon(option)} {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fieldLabel">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me what you'd like improved, fixed, added, or reviewed..."
                    className="textarea"
                    maxLength={900}
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
                    {message.length}/900 characters
                  </div>
                </div>

                {(contactMe || sendPrivateCopy || !postToWall) && (
                  <div>
                    <label className="fieldLabel">
                      Reply email {contactMe ? "" : "(optional)"}
                    </label>
                    <input
                      value={replyEmail}
                      onChange={(e) => setReplyEmail(e.target.value)}
                      placeholder={contactMe ? "Required if you want a reply" : "Optional if you want a reply"}
                      className="field"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                )}

                <div className="checkGrid">
                  <label className="checkLabel">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    <span>Post anonymously</span>
                  </label>

                  <label className="checkLabel">
                    <input
                      type="checkbox"
                      checked={postToWall}
                      onChange={(e) => {
                        setPostToWall(e.target.checked);
                        if (!e.target.checked) setSendPrivateCopy(true);
                      }}
                    />
                    <span>Show this on the public Feedback Wall</span>
                  </label>

                  <label className="checkLabel">
                    <input
                      type="checkbox"
                      checked={contactMe}
                      onChange={(e) => {
                        setContactMe(e.target.checked);
                        if (e.target.checked) setSendPrivateCopy(true);
                      }}
                    />
                    <span>Contact me about this</span>
                  </label>

                  <label className="checkLabel">
                    <input
                      type="checkbox"
                      checked={sendPrivateCopy}
                      onChange={(e) => setSendPrivateCopy(e.target.checked)}
                    />
                    <span>Also send this directly to the private Adorable Vault inbox</span>
                  </label>
                </div>

                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="bubbleButton primaryButton"
                >
                  {submitting ? "Submitting..." : "💜 Submit Feedback"}
                </button>
              </div>

              <div className="helperGrid">
                <div className="helperItem">
                  <span>🔎</span>
                  <span>Use Missing Doorable for missing figures, wrong names, wrong rarity, or set issues.</span>
                </div>
                <div className="helperItem">
                  <span>⚠️</span>
                  <span>Use Marketplace Concern for suspicious listings, seller issues, or safety concerns.</span>
                </div>
                <div className="helperItem">
                  <span>✨</span>
                  <span>Feature requests and ideas help decide what gets built next.</span>
                </div>
              </div>
            </section>
          </aside>

          <section>
            <div className="card filterCard">
              <div className="filterTop">
                <div>
                  <div className="sectionTitle" style={{ marginBottom: 4 }}>Browse feedback</div>
                  <div className="muted">
                    Showing {visiblePosts.length} of {approvedPosts.length}
                    {search.trim() ? " matching search" : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="bubbleButton softButton"
                >
                  Clear
                </button>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search feedback, replies, categories, or status..."
                className="field"
              />

              <div className="filterRow">
                {[
                  { value: "all", label: "All" },
                  { value: "Idea", label: `💡 Ideas (${categoryCounts["Idea"] || 0})` },
                  { value: "Bug", label: `🐞 Bugs (${categoryCounts["Bug"] || 0})` },
                  { value: "Feature Request", label: `🚀 Features (${categoryCounts["Feature Request"] || 0})` },
                  { value: "Missing Doorable", label: `🔎 Missing (${categoryCounts["Missing Doorable"] || 0})` },
                  { value: "Marketplace Concern", label: `⚠️ Marketplace (${categoryCounts["Marketplace Concern"] || 0})` },
                  { value: "planned", label: `🗓️ Planned (${plannedCount})` },
                  { value: "added", label: `✨ Added (${addedCount})` },
                  { value: "resolved", label: `✅ Resolved (${resolvedCount})` },
                  ...(isAdmin ? [{ value: "pending", label: `⏳ Hidden/Pending (${pendingCount})` }] : []),
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value as FilterKey)}
                    className={`filterButton ${filter === option.value ? "filterButtonActive" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="emptyCard">Loading feedback...</div>
            ) : visiblePosts.length === 0 ? (
              <div className="emptyCard">
                No feedback found for this filter yet.
              </div>
            ) : (
              <div className="postGrid">
                {visiblePosts.map((post) => {
                  const statusMeta = getStatusMeta(getPostStatus(post));

                  return (
                    <article key={post.id} className="postCard">
                      <div className="postHeader">
                        <div>
                          <div className="postName">
                            {post.anonymous ? "Anonymous" : post.name || "Guest"}
                          </div>
                          <div className="postMeta">
                            {getCategoryIcon(post.category)} {post.category || "General Comment"} •{" "}
                            {niceDate(post.created_at)}
                          </div>
                        </div>

                        <div className="badgeRow">
                          <span className={`badge ${statusMeta.className}`}>
                            {statusMeta.icon} {statusMeta.label}
                          </span>

                          {post.contact_me ? (
                            <span className="badge contactBadge">Contact Me</span>
                          ) : null}

                          {!isPubliclyVisible(post) ? (
                            <span className="badge privateBadge">Private/Hidden</span>
                          ) : null}

                          {isAdmin ? (
                            <span className={`badge ${isPubliclyVisible(post) ? "approvedBadge" : "pendingBadge"}`}>
                              {isPubliclyVisible(post) ? "Visible" : "Hidden/Pending"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="postMessage">{post.message}</div>

                      {post.admin_reply ? (
                        <div className="adminReply">
                          <div style={{ fontWeight: 1000, marginBottom: 6, color: "#1d4ed8" }}>
                            Reply from Adorable Vault
                          </div>
                          <div style={{ lineHeight: 1.6 }}>{post.admin_reply}</div>
                        </div>
                      ) : null}

                      <div className="buttonRow">
                        <button
                          onClick={() => void handleLike(post)}
                          className="bubbleButton softButton"
                        >
                          👍 {post.likes || 0}
                        </button>

                        {isAdmin ? (
                          <>
                            {!isPubliclyVisible(post) ? (
                              <button
                                onClick={() => void approvePost(post)}
                                disabled={busyId === post.id}
                                className="bubbleButton greenButton"
                              >
                                Show ✅
                              </button>
                            ) : (
                              <button
                                onClick={() => void unapprovePost(post)}
                                disabled={busyId === post.id}
                                className="bubbleButton orangeButton"
                              >
                                Hide ⏳
                              </button>
                            )}

                            <select
                              value={getPostStatus(post)}
                              onChange={(e) => void changeStatus(post, e.target.value)}
                              className="adminSelect"
                              disabled={busyId === post.id}
                              style={{ maxWidth: 190 }}
                            >
                              {STATUS_TAGS.map((tag) => (
                                <option key={tag} value={tag}>
                                  {tag}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => void markResolved(post)}
                              disabled={busyId === post.id}
                              className="bubbleButton resolvedButton"
                            >
                              Resolved ✅
                            </button>

                            <button
                              onClick={() => void deletePost(post)}
                              disabled={busyId === post.id}
                              className="bubbleButton redButton"
                            >
                              Delete 🗑️
                            </button>
                          </>
                        ) : null}
                      </div>

                      {isAdmin ? (
                        <div className="adminPanel">
                          <div style={{ fontWeight: 1000, marginBottom: 10 }}>
                            Admin Reply
                          </div>

                          <div className="adminGrid">
                            <textarea
                              value={replyDrafts[post.id] || ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              placeholder="Write a reply for this feedback..."
                              className="adminTextarea"
                            />

                            <button
                              onClick={() => void saveReply(post)}
                              disabled={busyId === post.id}
                              className="bubbleButton replyButton"
                            >
                              Save Reply 💬
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
