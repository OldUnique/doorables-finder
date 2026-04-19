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

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const { data } = await supabase
      .from("image_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    const filtered = (data || []).filter((row: Submission) => {
      if (row.status === "pending") {
        return row.created_at && row.created_at >= oneDayAgo;
      }
      return true;
    });

    setSubmissions(filtered);

    const doorableIds = [...new Set(filtered.map((r) => r.doorable_id))];
    const userIds = [...new Set(filtered.map((r) => r.user_id).filter(Boolean))];

    const { data: dData } = await supabase
      .from("doorables")
      .select("*")
      .in("id", doorableIds);

    const dMap: any = {};
    (dData || []).forEach((d: any) => (dMap[d.id] = d));
    setDoorablesById(dMap);

    const { data: uData } = await supabase
      .from("users")
      .select("id,email")
      .in("id", userIds);

    const uMap: any = {};
    (uData || []).forEach((u: any) => (uMap[u.id] = u));
    setUsersById(uMap);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return router.push("/login");

      if (!isAdminEmail(user.email)) {
        setCheckingAccess(false);
        return;
      }

      setAuthorized(true);
      setCurrentEmail(user.email || "");
      setCheckingAccess(false);
      await loadEverything();
    })();
  }, []);

  async function approveSubmission(s: Submission) {
    setBusyId(s.id);

    await supabase
      .from("doorables")
      .update({ image_url: s.image_url })
      .eq("id", s.doorable_id);

    await supabase
      .from("image_submissions")
      .update({ status: "approved" })
      .eq("id", s.id);

    setSubmissions((p) => p.filter((x) => x.id !== s.id));
    setBusyId(null);
  }

  async function rejectSubmission(s: Submission) {
    setBusyId(s.id);

    await supabase
      .from("image_submissions")
      .delete()
      .eq("id", s.id);

    setSubmissions((p) => p.filter((x) => x.id !== s.id));
    setBusyId(null);
  }

  async function markPending(s: Submission) {
    setBusyId(s.id);

    await supabase
      .from("image_submissions")
      .update({ status: "pending" })
      .eq("id", s.id);

    await loadEverything();
    setBusyId(null);
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const visible = useMemo(() => {
    if (viewMode === "pending") return pending;
    if (viewMode === "approved") return approved;
    if (viewMode === "rejected") return rejected;
    return submissions;
  }, [viewMode, submissions]);

  if (checkingAccess) return <main style={{ padding: 24 }}>Loading...</main>;
  if (!authorized) return <main style={{ padding: 24 }}>Not authorized</main>;

  return (
    <main style={{ padding: 24, color: "white" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>Admin Panel</h1>

      <div style={{ display: "flex", gap: 10, margin: "20px 0" }}>
        {["pending", "approved", "rejected", "all"].map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m as ViewMode)}
            style={{
              padding: 10,
              borderRadius: 10,
              background: viewMode === m ? "#4f46e5" : "#333",
              color: "white",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {visible.map((s) => {
        const d = doorablesById[s.doorable_id];
        return (
          <div key={s.id} style={{ background: "#fff", color: "#000", padding: 16, marginBottom: 12, borderRadius: 12 }}>
            <h3>{d?.name || "Unknown"}</h3>

            <img src={s.image_url} style={{ width: 120 }} />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button onClick={() => approveSubmission(s)}>Approve</button>
              <button onClick={() => rejectSubmission(s)}>Reject</button>
              <button onClick={() => markPending(s)}>Pending</button>
            </div>
          </div>
        );
      })}
    </main>
  );
}