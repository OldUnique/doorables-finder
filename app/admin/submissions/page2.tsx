"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

type Submission = {
  id: string;
  doorable_id: string;
  image_url: string;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

type Doorable = {
  id: string;
  name: string | null;
  series: string | null;
  movie: string | null;
  image_url: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
};

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function niceDate(value?: string | null) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [doorablesById, setDoorablesById] = useState<Record<string, Doorable>>({});
  const [usersById, setUsersById] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadEverything() {
    setLoading(true);
    setMessage("");

    const { data: subData, error: subError } = await supabase
      .from("image_submissions")
      .select("id, doorable_id, image_url, status, created_at, user_id")
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false });

    if (subError) {
      setMessage("Could not load submissions: " + subError.message);
      setLoading(false);
      return;
    }

    const submissionRows = (subData || []) as Submission[];
    setSubmissions(submissionRows);

    const doorableIds = Array.from(
      new Set(submissionRows.map((row) => row.doorable_id).filter(Boolean))
    );

    const userIds = Array.from(
      new Set(submissionRows.map((row) => row.user_id).filter(Boolean))
    ) as string[];

    if (doorableIds.length > 0) {
      const { data: doorableData } = await supabase
        .from("doorables")
        .select("id, name, series, movie, image_url")
        .in("id", doorableIds);

      const nextDoorables: Record<string, Doorable> = {};
      (doorableData || []).forEach((row: any) => {
        nextDoorables[row.id] = row as Doorable;
      });
      setDoorablesById(nextDoorables);
    } else {
      setDoorablesById({});
    }

    if (userIds.length > 0) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds);

      const nextUsers: Record<string, UserRow> = {};
      (userData || []).forEach((row: any) => {
        nextUsers[row.id] = row as UserRow;
      });
      setUsersById(nextUsers);
    } else {
      setUsersById({});
    }

    setLoading(false);
  }

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const email = user.email || "";
      setCurrentEmail(email);

      if (!isAdminEmail(email)) {
        setAuthorized(false);
        setCheckingAccess(false);
        return;
      }

      setAuthorized(true);
      setCheckingAccess(false);
      await loadEverything();
    }

    checkAccess();
  }, [router, supabase]);

  async function approveSubmission(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const { error: updateError } = await supabase
      .from("doorables")
      .update({ image_url: submission.image_url })
      .eq("id", submission.doorable_id);

    if (updateError) {
      setMessage("Could not update doorable image: " + updateError.message);
      setBusyId(null);
      return;
    }

    const { error: statusError } = await supabase
      .from("image_submissions")
      .update({ status: "approved" })
      .eq("id", submission.id);

    if (statusError) {
      setMessage("Image updated, but status failed: " + statusError.message);
      setBusyId(null);
      return;
    }

    setMessage("Approved image successfully.");
    await loadEverything();
    setBusyId(null);
  }

  async function rejectSubmission(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const { error } = await supabase
      .from("image_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);

    if (error) {
      setMessage("Could not reject submission: " + error.message);
      setBusyId(null);
      return;
    }

    setMessage("Rejected submission.");
    await loadEverything();
    setBusyId(null);
  }

  async function markPending(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const { error } = await supabase
      .from("image_submissions")
      .update({ status: "pending" })
      .eq("id", submission.id);

    if (error) {
      setMessage("Could not move back to pending: " + error.message);
      setBusyId(null);
      return;
    }

    setMessage("Moved back to pending.");
    await loadEverything();
    setBusyId(null);
  }

  async function deleteSubmission(submission: Submission) {
    const ok = window.confirm("Delete this submission permanently?");
    if (!ok) return;

    setBusyId(submission.id);
    setMessage("");

    const { error } = await supabase
      .from("image_submissions")
      .delete()
      .eq("id", submission.id);

    if (error) {
      setMessage("Could not delete submission: " + error.message);
      setBusyId(null);
      return;
    }

    setMessage("Deleted submission.");
    await loadEverything();
    setBusyId(null);
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  if (checkingAccess) {
    return (
      <main style={{ minHeight: "100vh", padding: 24, color: "white" }}>
        Checking admin access...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            borderRadius: 24,
            padding: 28,
            background: "linear-gradient(135deg,#111827,#4338ca)",
            color: "white",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 900, marginBottom: 12 }}>
            Admin Only 🔒
          </div>
          <div style={{ fontSize: 18, opacity: 0.95, lineHeight: 1.5 }}>
            This page is only for approved admin emails.
          </div>
          <div style={{ marginTop: 14, fontSize: 14, opacity: 0.8 }}>
            Signed in as: {currentEmail || "Unknown"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1350, margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg,#111827,#4338ca)",
            borderRadius: 24,
            padding: 28,
            marginBottom: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900 }}>
            Image Submission Admin Panel 🛠️
          </div>
          <div style={{ marginTop: 8, fontSize: 18, opacity: 0.95 }}>
            Review, approve, reject, and manage live image submissions
          </div>
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
            Signed in as: {currentEmail}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Pending</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{pending.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Approved</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{approved.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Rejected</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{rejected.length}</div>
          </div>
        </div>

        <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => loadEverything()}
            style={{
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {message ? (
          <div
            style={{
              marginBottom: 16,
              background: "rgba(255,255,255,0.95)",
              color: "#111827",
              borderRadius: 16,
              padding: 14,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 20 }}>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#111827",
              borderRadius: 18,
              padding: 24,
            }}
          >
            No submissions yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
              gap: 18,
            }}
          >
            {submissions.map((submission) => {
              const doorable = doorablesById[submission.doorable_id];
              const submitter = submission.user_id
                ? usersById[submission.user_id]?.email || submission.user_id
                : "Unknown user";

              const statusColor =
                submission.status === "approved"
                  ? "#16a34a"
                  : submission.status === "rejected"
                  ? "#dc2626"
                  : "#d97706";

              return (
                <div
                  key={submission.id}
                  style={{
                    background: "rgba(255,255,255,0.97)",
                    color: "#111827",
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      {doorable?.name || "Unknown Doorable"}
                    </div>

                    <div
                      style={{
                        background: statusColor,
                        color: "white",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {submission.status || "pending"}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 6 }}>
                    Series: {doorable?.series || "Unknown"}
                  </div>

                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 6 }}>
                    Movie: {doorable?.movie || "Unknown"}
                  </div>

                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 6 }}>
                    Submitted by: {submitter}
                  </div>

                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 14 }}>
                    Submitted: {niceDate(submission.created_at)}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>
                        Current image
                      </div>
                      <div
                        style={{
                          height: 180,
                          borderRadius: 14,
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {doorable?.image_url ? (
                          <img
                            src={doorable.image_url}
                            alt={doorable.name || "Current image"}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <div style={{ color: "#6b7280", fontWeight: 700 }}>
                            No current image
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>
                        Submitted image
                      </div>
                      <div
                        style={{
                          height: 180,
                          borderRadius: 14,
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={submission.image_url}
                          alt="Submitted image"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => approveSubmission(submission)}
                      disabled={busyId === submission.id}
                      style={{
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Approve ✅
                    </button>

                    <button
                      onClick={() => rejectSubmission(submission)}
                      disabled={busyId === submission.id}
                      style={{
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Reject ❌
                    </button>

                    <button
                      onClick={() => markPending(submission)}
                      disabled={busyId === submission.id}
                      style={{
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Pending ⏳
                    </button>

                    <button
                      onClick={() => deleteSubmission(submission)}
                      disabled={busyId === submission.id}
                      style={{
                        background: "#334155",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Delete 🗑️
                    </button>
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
