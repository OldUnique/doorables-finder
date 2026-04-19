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

type ViewMode = "pending" | "approved" | "rejected" | "all";

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
  if (Number.isNaN(d.getTime())) return String(value);
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
  const [viewMode, setViewMode] = useState<ViewMode>("pending");

  async function loadEverything() {
    setLoading(true);
    setMessage("");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: subData, error: subError } = await supabase
      .from("image_submissions")
      .select("id, doorable_id, image_url, status, created_at, user_id")
      .order("created_at", { ascending: false });

    if (subError) {
      setMessage("Could not load submissions: " + subError.message);
      setLoading(false);
      return;
    }

    const allRows = ((subData || []) as Submission[]).filter((row) => {
      if (row.status === "pending") {
        return !!row.created_at && row.created_at >= oneDayAgo;
      }
      return true;
    });

    setSubmissions(allRows);

    const doorableIds = Array.from(
      new Set(allRows.map((row) => row.doorable_id).filter(Boolean))
    );

    const userIds = Array.from(
      new Set(allRows.map((row) => row.user_id).filter(Boolean))
    ) as string[];

    if (doorableIds.length > 0) {
      const { data: doorableData } = await supabase
        .from("doorables")
        .select("id, name, series, movie, image_url")
        .in("id", doorableIds);

      const nextDoorables: Record<string, Doorable> = {};
      (doorableData || []).forEach((row: any) => {
        nextDoorables[String(row.id)] = row as Doorable;
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
        nextUsers[String(row.id)] = row as UserRow;
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

    void checkAccess();
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

    setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
    setMessage("Approved image successfully.");
    setBusyId(null);
  }

  async function rejectSubmission(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const { error } = await supabase
      .from("image_submissions")
      .delete()
      .eq("id", submission.id);

    if (error) {
      setMessage("Could not reject/delete submission: " + error.message);
      setBusyId(null);
      return;
    }

    setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
    setMessage("Rejected submission removed.");
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

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === submission.id ? { ...item, status: "pending" } : item
      )
    );
    setMessage("Moved back to pending.");
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

    setSubmissions((prev) => prev.filter((item) => item.id !== submission.id));
    setMessage("Deleted submission.");
    setBusyId(null);
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const visibleSubmissions = useMemo(() => {
    if (viewMode === "pending") return pending;
    if (viewMode === "approved") return approved;
    if (viewMode === "rejected") return rejected;
    return submissions;
  }, [viewMode, pending, approved, rejected, submissions]);

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
background:
  "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0) 22%), linear-gradient(135deg, #0f172a, #1e3a8a)",
color: "white",

      }}
    >
      <style jsx>{`
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .statCard {
          background: rgba(255,255,255,0.96);
          color: #111827;
          padding: 18px;
          border-radius: 20px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.16);
          border: 1px solid rgba(255,255,255,0.45);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          text-align: left;
        }

        .statCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 28px rgba(0,0,0,0.2);
        }

        .statCardActive {
          outline: 3px solid #4f46e5;
        }

        .filterRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .filterButton {
          border: none;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          background: rgba(255,255,255,0.14);
          color: white;
          box-shadow: 0 8px 18px rgba(0,0,0,0.14);
        }

        .filterButtonActive {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        .refreshButton {
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(0,0,0,0.14);
        }

        .cardsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 18px;
        }

        .submissionCard {
          background: rgba(255,255,255,0.97);
          color: #111827;
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.16);
          border: 1px solid rgba(255,255,255,0.5);
        }

        .imageCompare {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .imageBox {
          height: 180px;
          border-radius: 14px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .actionRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .actionButton {
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          color: white;
        }

        @media (max-width: 920px) {
          main {
            padding: 16px !important;
          }

          .imageCompare {
            grid-template-columns: 1fr;
          }

          .actionRow {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .actionButton {
            width: 100%;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1350, margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg,#111827,#4338ca)",
            borderRadius: 26,
            padding: 28,
            marginBottom: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 900 }}>
            Image Submission Admin Panel 🛠️
          </div>
          <div style={{ marginTop: 8, fontSize: 18, opacity: 0.95 }}>
            Review submitted images and keep the database looking good.
          </div>
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
            Signed in as: {currentEmail}
          </div>
        </div>

        <div className="statsGrid">
          {[
            { key: "pending", label: "Pending (24h)", value: pending.length },
            { key: "approved", label: "Approved", value: approved.length },
            { key: "rejected", label: "Rejected", value: rejected.length },
            { key: "all", label: "All Visible", value: submissions.length },
          ].map((item) => {
            const active = viewMode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`statCard ${active ? "statCardActive" : ""}`}
                onClick={() => setViewMode(item.key as ViewMode)}
              >
                <div style={{ fontWeight: 800, marginBottom: 8, color: "#6b7280" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 34, fontWeight: 900 }}>{item.value}</div>
              </button>
            );
          })}
        </div>

        <div className="filterRow">
          {[
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All" },
          ].map((item) => {
            const active = viewMode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`filterButton ${active ? "filterButtonActive" : ""}`}
                onClick={() => setViewMode(item.key as ViewMode)}
              >
                {item.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => void loadEverything()}
            className="refreshButton"
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
              boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
            }}
          >
            {message}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 20 }}>Loading submissions...</div>
        ) : visibleSubmissions.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#111827",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
            }}
          >
            No submissions in this section.
          </div>
        ) : (
          <div className="cardsGrid">
            {visibleSubmissions.map((submission) => {
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
                <div key={submission.id} className="submissionCard">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 12,
                      flexWrap: "wrap",
                  <div className="imageCompare">
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>
                        Current image
                      </div>
                      <div className="imageBox">
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
                      <div className="imageBox">
                        <img
                          src={submission.image_url}
                          alt="Submitted image"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="actionRow">
                    <button
                      onClick={() => void approveSubmission(submission)}
                      disabled={busyId === submission.id}
                      className="actionButton"
                      style={{
                        background: "#16a34a",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Approve ✅
                    </button>

                    <button
                      onClick={() => void rejectSubmission(submission)}
                      disabled={busyId === submission.id}
                      className="actionButton"
                      style={{
                        background: "#dc2626",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Reject ❌
                    </button>

                    <button
                      onClick={() => void markPending(submission)}
                      disabled={busyId === submission.id}
                      className="actionButton"
                      style={{
                        background: "#f59e0b",
                        opacity: busyId === submission.id ? 0.7 : 1,
                      }}
                    >
                      Pending ⏳
                    </button>

                    <button
                      onClick={() => void deleteSubmission(submission)}
                      disabled={busyId === submission.id}
                      className="actionButton"
                      style={{
                        background: "#334155",
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

