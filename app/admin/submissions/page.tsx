"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

type SubmissionStatus = "all" | "pending" | "approved" | "rejected";
type SortMode = "newest" | "oldest" | "doorable" | "status";
type ImageMode = "compare" | "submitted" | "current";

type Submission = {
  id: string;
  doorable_id: string;
  image_url: string;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
  submitted_by?: string | null;
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
  "rffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function cleanId(value: unknown) {
  return String(value || "").trim();
}

function niceDate(value?: string | null) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusTheme(status?: string | null) {
  if (status === "approved") {
    return { bg: "#dcfce7", text: "#166534", border: "#86efac", label: "Approved ✅" };
  }

  if (status === "rejected") {
    return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca", label: "Rejected ❌" };
  }

  return { bg: "#fef3c7", text: "#92400e", border: "#fde68a", label: "Pending ⏳" };
}

function getSubmitterId(submission: Submission) {
  return cleanId(submission.user_id || submission.submitted_by);
}

function getSubmitterLabel(submission: Submission, usersById: Record<string, UserRow>) {
  const submitterId = getSubmitterId(submission);

  if (!submitterId) return "Unknown user";
  if (submitterId.includes("@")) return submitterId;

  return usersById[submitterId]?.email || submitterId;
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

  const [statusFilter, setStatusFilter] = useState<SubmissionStatus>("pending");
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [movieFilter, setMovieFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [imageMode, setImageMode] = useState<ImageMode>("compare");
  const [selectedId, setSelectedId] = useState("");
  const [compactMode, setCompactMode] = useState(false);

  async function fetchSubmissionsWithFallback() {
    const selectOptions = [
      "id, doorable_id, image_url, status, created_at, user_id, submitted_by",
      "id, doorable_id, image_url, status, created_at, submitted_by",
      "id, doorable_id, image_url, status, created_at, user_id",
      "id, doorable_id, image_url, status, created_at",
    ];

    let lastError = "";

    for (const selectColumns of selectOptions) {
      const { data, error } = await supabase
        .from("image_submissions")
        .select(selectColumns)
        .in("status", ["pending", "approved", "rejected"])
        .order("created_at", { ascending: false });

      if (!error) {
        return { data: data || [], error: "" };
      }

      lastError = error.message;
    }

    return { data: [], error: lastError || "Could not load image submissions." };
  }

  async function loadDoorablesBySubmissionIds(doorableIds: string[]) {
    const nextDoorables: Record<string, Doorable> = {};
    let lookupWarning = "";

    if (doorableIds.length === 0) {
      return { nextDoorables, lookupWarning };
    }

    const idLookup = await supabase
      .from("doorables")
      .select("id, name, series, movie, image_url")
      .in("id", doorableIds);

    if (!idLookup.error) {
      (idLookup.data || []).forEach((row: any) => {
        const id = cleanId(row.id);
        if (!id) return;

        nextDoorables[id] = {
          id,
          name: row.name ?? null,
          series: row.series ?? null,
          movie: row.movie ?? null,
          image_url: row.image_url ?? null,
        };
      });
    } else {
      lookupWarning = "Doorable lookup by id failed: " + idLookup.error.message;
    }

    const missingAfterIdLookup = doorableIds.filter((id) => !nextDoorables[id]);

    if (missingAfterIdLookup.length > 0) {
      const uuidLookup = await supabase
        .from("doorables")
        .select("uuid, name, series, movie, image_url")
        .in("uuid", missingAfterIdLookup);

      if (!uuidLookup.error) {
        (uuidLookup.data || []).forEach((row: any) => {
          const id = cleanId(row.uuid);
          if (!id) return;

          nextDoorables[id] = {
            id,
            name: row.name ?? null,
            series: row.series ?? null,
            movie: row.movie ?? null,
            image_url: row.image_url ?? null,
          };
        });
      }
    }

    const stillMissing = doorableIds.filter((id) => !nextDoorables[id]);

    if (stillMissing.length > 0) {
      lookupWarning =
        lookupWarning ||
        `Loaded submissions, but ${stillMissing.length} submission${
          stillMissing.length === 1 ? "" : "s"
        } could not be matched to a Doorable row. The Doorable ID will show on those cards.`;
    }

    return { nextDoorables, lookupWarning };
  }

  async function loadUsersBySubmissionIds(submissionRows: Submission[]) {
    const submitterIds = Array.from(
      new Set(
        submissionRows
          .map((row) => getSubmitterId(row))
          .filter((value) => value && !value.includes("@"))
      )
    );

    const nextUsers: Record<string, UserRow> = {};

    if (submitterIds.length === 0) {
      return nextUsers;
    }

    const { data } = await supabase
      .from("users")
      .select("id, email")
      .in("id", submitterIds);

    (data || []).forEach((row: any) => {
      const id = cleanId(row.id);
      if (!id) return;
      nextUsers[id] = row as UserRow;
    });

    return nextUsers;
  }

  async function loadEverything() {
    setLoading(true);
    setMessage("");

    const submissionResult = await fetchSubmissionsWithFallback();

    if (submissionResult.error) {
      setMessage("Could not load submissions: " + submissionResult.error);
      setSubmissions([]);
      setDoorablesById({});
      setUsersById({});
      setLoading(false);
      return;
    }

    const submissionRows = ((submissionResult.data || []) as any[]).map((row) => ({
      id: cleanId(row.id),
      doorable_id: cleanId(row.doorable_id),
      image_url: cleanId(row.image_url),
      status: row.status || "pending",
      created_at: row.created_at ?? null,
      user_id: row.user_id ? cleanId(row.user_id) : null,
      submitted_by: row.submitted_by ? cleanId(row.submitted_by) : null,
    })) as Submission[];

    setSubmissions(submissionRows);

    const doorableIds = Array.from(
      new Set(submissionRows.map((row) => cleanId(row.doorable_id)).filter(Boolean))
    );

    const { nextDoorables, lookupWarning } = await loadDoorablesBySubmissionIds(doorableIds);
    setDoorablesById(nextDoorables);

    const nextUsers = await loadUsersBySubmissionIds(submissionRows);
    setUsersById(nextUsers);

    if (lookupWarning) {
      setMessage(lookupWarning);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  async function updateDoorableImage(doorableId: string, imageUrl: string) {
    const cleanDoorableId = cleanId(doorableId);

    const updateById = await supabase
      .from("doorables")
      .update({ image_url: imageUrl })
      .eq("id", cleanDoorableId)
      .select("id");

    if (!updateById.error && updateById.data && updateById.data.length > 0) {
      return { success: true, message: "" };
    }

    const updateByUuid = await supabase
      .from("doorables")
      .update({ image_url: imageUrl })
      .eq("uuid", cleanDoorableId)
      .select("uuid");

    if (!updateByUuid.error && updateByUuid.data && updateByUuid.data.length > 0) {
      return { success: true, message: "" };
    }

    return {
      success: false,
      message:
        updateById.error?.message ||
        updateByUuid.error?.message ||
        "The Doorable image did not update. Check that image_submissions.doorable_id matches the Doorables table primary ID.",
    };
  }

  async function approveSubmission(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const doorableUpdate = await updateDoorableImage(submission.doorable_id, submission.image_url);

    if (!doorableUpdate.success) {
      setMessage("Approve blocked: " + doorableUpdate.message);
      setBusyId(null);
      return;
    }

    const { data, error: statusError } = await supabase
      .from("image_submissions")
      .update({ status: "approved" })
      .eq("id", submission.id)
      .select("id");

    if (statusError) {
      setMessage("Image updated, but status failed: " + statusError.message);
      setBusyId(null);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Approve blocked: status did not update. Check RLS permissions on image_submissions.");
      setBusyId(null);
      return;
    }

    setMessage("Approved image successfully 💜");
    await loadEverything();
    setBusyId(null);
  }

  async function rejectSubmission(submission: Submission) {
    setBusyId(submission.id);
    setMessage("");

    const { data, error } = await supabase
      .from("image_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id)
      .select("id");

    if (error) {
      setMessage("Could not reject submission: " + error.message);
      setBusyId(null);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Reject blocked. Check RLS permissions on image_submissions.");
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

    const { data, error } = await supabase
      .from("image_submissions")
      .update({ status: "pending" })
      .eq("id", submission.id)
      .select("id");

    if (error) {
      setMessage("Could not move back to pending: " + error.message);
      setBusyId(null);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Pending update blocked. Check RLS permissions on image_submissions.");
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

    const { data, error } = await supabase
      .from("image_submissions")
      .delete()
      .eq("id", submission.id)
      .select("id");

    if (error) {
      setMessage("Could not delete submission: " + error.message);
      setBusyId(null);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Delete blocked. Check RLS permissions on image_submissions.");
      setBusyId(null);
      return;
    }

    setMessage("Deleted submission.");
    await loadEverything();
    setBusyId(null);
  }

  const pending = submissions.filter((s) => (s.status || "pending") === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const seriesOptions = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          submissions
            .map((sub) => doorablesById[cleanId(sub.doorable_id)]?.series || "")
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })),
    ];
  }, [submissions, doorablesById]);

  const movieOptions = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          submissions
            .map((sub) => doorablesById[cleanId(sub.doorable_id)]?.movie || "")
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })),
    ];
  }, [submissions, doorablesById]);

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = submissions.filter((submission) => {
      const doorable = doorablesById[cleanId(submission.doorable_id)];
      const submitter = getSubmitterLabel(submission, usersById);

      const matchesStatus =
        statusFilter === "all" ? true : (submission.status || "pending") === statusFilter;

      const matchesSeries =
        seriesFilter === "all" ? true : String(doorable?.series || "") === seriesFilter;

      const matchesMovie =
        movieFilter === "all" ? true : String(doorable?.movie || "") === movieFilter;

      const searchable = [
        doorable?.name,
        doorable?.series,
        doorable?.movie,
        submitter,
        submission.status,
        submission.id,
        submission.doorable_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && matchesSeries && matchesMovie && (!q || searchable.includes(q));
    });

    filtered.sort((a, b) => {
      const doorableA = doorablesById[cleanId(a.doorable_id)];
      const doorableB = doorablesById[cleanId(b.doorable_id)];

      if (sortMode === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }

      if (sortMode === "doorable") {
        return String(doorableA?.name || "").localeCompare(String(doorableB?.name || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (sortMode === "status") {
        return String(a.status || "pending").localeCompare(String(b.status || "pending"));
      }

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return filtered;
  }, [
    submissions,
    doorablesById,
    usersById,
    statusFilter,
    seriesFilter,
    movieFilter,
    search,
    sortMode,
  ]);

  const selectedSubmission =
    filteredSubmissions.find((submission) => submission.id === selectedId) || null;

  function clearFilters() {
    setStatusFilter("all");
    setSearch("");
    setSeriesFilter("all");
    setMovieFilter("all");
    setSortMode("newest");
  }

  if (checkingAccess) {
    return (
      <main className="adminPage">
        <style jsx>{pageStyles}</style>
        <div className="loadingCard">Checking admin access...</div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="adminPage centerPage">
        <style jsx>{pageStyles}</style>
        <div className="adminOnlyCard">
          <div className="adminOnlyTitle">Admin Only 🔒</div>
          <div className="adminOnlyText">
            This page is only for approved admin emails.
          </div>
          <div className="adminOnlyEmail">Signed in as: {currentEmail || "Unknown"}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="adminPage">
      <style jsx>{pageStyles}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">Admin Tools</div>
            <h1>Image Submission Review 🛠️</h1>
            <p>
              Sort, compare, approve, reject, and clean up submitted Doorables photos.
            </p>
            <div className="signedIn">Signed in as: {currentEmail}</div>
          </div>

          <button type="button" onClick={() => void loadEverything()} className="refreshButton">
            Refresh
          </button>
        </section>

        <section className="statsGrid">
          <button
            type="button"
            className={`statCard ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            <span>Pending</span>
            <strong>{pending.length}</strong>
          </button>

          <button
            type="button"
            className={`statCard ${statusFilter === "approved" ? "active" : ""}`}
            onClick={() => setStatusFilter("approved")}
          >
            <span>Approved</span>
            <strong>{approved.length}</strong>
          </button>

          <button
            type="button"
            className={`statCard ${statusFilter === "rejected" ? "active" : ""}`}
            onClick={() => setStatusFilter("rejected")}
          >
            <span>Rejected</span>
            <strong>{rejected.length}</strong>
          </button>

          <button
            type="button"
            className={`statCard ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <span>Total</span>
            <strong>{submissions.length}</strong>
          </button>
        </section>

        <section className="toolsCard">
          <div className="toolsTop">
            <div>
              <div className="toolsTitle">Review Queue</div>
              <div className="toolsMeta">
                Showing {filteredSubmissions.length} of {submissions.length}
              </div>
            </div>

            <button type="button" onClick={clearFilters} className="lightButton">
              Clear Filters
            </button>
          </div>

          <div className="filterGrid">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Doorable, series, movie, submitter, ID..."
              className="field"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus)}
              className="field"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="field"
            >
              {seriesOptions.map((series) => (
                <option key={series} value={series}>
                  {series === "all" ? "All Series" : series}
                </option>
              ))}
            </select>

            <select
              value={movieFilter}
              onChange={(e) => setMovieFilter(e.target.value)}
              className="field"
            >
              {movieOptions.map((movie) => (
                <option key={movie} value={movie}>
                  {movie === "all" ? "All Movies" : movie}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="field"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="doorable">Doorable Name</option>
              <option value="status">Status</option>
            </select>

            <select
              value={imageMode}
              onChange={(e) => setImageMode(e.target.value as ImageMode)}
              className="field"
            >
              <option value="compare">Compare Images</option>
              <option value="submitted">Submitted Only</option>
              <option value="current">Current Only</option>
            </select>
          </div>

          <div className="toggleLine">
            <label className="toggleLabel">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
              />
              Compact review cards
            </label>
          </div>
        </section>

        {message ? <div className="messageBox">{message}</div> : null}

        {selectedSubmission ? (
          <SubmissionPreviewModal
            submission={selectedSubmission}
            doorable={doorablesById[cleanId(selectedSubmission.doorable_id)]}
            submitter={getSubmitterLabel(selectedSubmission, usersById)}
            busyId={busyId}
            onClose={() => setSelectedId("")}
            onApprove={approveSubmission}
            onReject={rejectSubmission}
            onPending={markPending}
            onDelete={deleteSubmission}
          />
        ) : null}

        {loading ? (
          <div className="loadingCard">Loading submissions...</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="emptyCard">
            No submissions match those filters.
          </div>
        ) : (
          <section className={`submissionGrid ${compactMode ? "compact" : ""}`}>
            {filteredSubmissions.map((submission, index) => {
              const doorable = doorablesById[cleanId(submission.doorable_id)];
              const submitter = getSubmitterLabel(submission, usersById);
              const theme = statusTheme(submission.status);
              const isBusy = busyId === submission.id;

              return (
                <article key={submission.id} className="submissionCard">
                  <div className="cardHeader">
                    <div>
                      <h2>{doorable?.name || "Unknown Doorable"}</h2>
                      <div className="subMeta">
                        {doorable?.series || "Unknown Series"} • {doorable?.movie || "Unknown Movie"}
                      </div>
                      {!doorable ? (
                        <div className="idWarning">
                          Doorable ID: {submission.doorable_id || "Missing doorable_id"}
                        </div>
                      ) : null}
                    </div>

                    <span
                      className="statusBadge"
                      style={{
                        background: theme.bg,
                        color: theme.text,
                        borderColor: theme.border,
                      }}
                    >
                      {theme.label}
                    </span>
                  </div>

                  <div className="detailGrid">
                    <div>
                      <span>Submitted by</span>
                      <strong>{submitter}</strong>
                    </div>
                    <div>
                      <span>Submitted</span>
                      <strong>{niceDate(submission.created_at)}</strong>
                    </div>
                    <div>
                      <span>Submission ID</span>
                      <strong>{submission.id}</strong>
                    </div>
                    <div>
                      <span>Doorable ID</span>
                      <strong>{submission.doorable_id || "Missing"}</strong>
                    </div>
                  </div>

                  {imageMode === "compare" ? (
                    <div className="compareGrid">
                      <ImagePanel
                        label="Current"
                        src={doorable?.image_url || ""}
                        alt={doorable?.name || "Current image"}
                        eager={index < 2}
                      />
                      <ImagePanel
                        label="Submitted"
                        src={submission.image_url}
                        alt="Submitted image"
                        eager={index < 2}
                      />
                    </div>
                  ) : imageMode === "submitted" ? (
                    <ImagePanel
                      label="Submitted image"
                      src={submission.image_url}
                      alt="Submitted image"
                      large
                      eager={index < 2}
                    />
                  ) : (
                    <ImagePanel
                      label="Current image"
                      src={doorable?.image_url || ""}
                      alt={doorable?.name || "Current image"}
                      large
                      eager={index < 2}
                    />
                  )}

                  <div className="actionGrid">
                    <button
                      type="button"
                      onClick={() => void approveSubmission(submission)}
                      disabled={isBusy}
                      className="greenButton"
                    >
                      Approve ✅
                    </button>

                    <button
                      type="button"
                      onClick={() => void rejectSubmission(submission)}
                      disabled={isBusy}
                      className="redButton"
                    >
                      Reject ❌
                    </button>

                    <button
                      type="button"
                      onClick={() => void markPending(submission)}
                      disabled={isBusy}
                      className="orangeButton"
                    >
                      Pending ⏳
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedId(submission.id)}
                      className="blueButton"
                    >
                      Preview 🔍
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteSubmission(submission)}
                      disabled={isBusy}
                      className="darkButton"
                    >
                      Delete 🗑️
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function ImagePanel(props: {
  label: string;
  src: string;
  alt: string;
  large?: boolean;
  eager?: boolean;
}) {
  return (
    <div className={props.large ? "imagePanel large" : "imagePanel"}>
      <div className="imageLabel">{props.label}</div>
      <div className={props.large ? "imageBox large" : "imageBox"}>
        {props.src ? (
          <img
            src={props.src}
            alt={props.alt}
            loading={props.eager ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="noImage">No image</div>
        )}
      </div>
    </div>
  );
}

function SubmissionPreviewModal(props: {
  submission: Submission;
  doorable?: Doorable;
  submitter: string;
  busyId: string | null;
  onClose: () => void;
  onApprove: (submission: Submission) => Promise<void>;
  onReject: (submission: Submission) => Promise<void>;
  onPending: (submission: Submission) => Promise<void>;
  onDelete: (submission: Submission) => Promise<void>;
}) {
  const theme = statusTheme(props.submission.status);
  const isBusy = props.busyId === props.submission.id;

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <button type="button" className="modalClose" onClick={props.onClose}>
          ×
        </button>

        <div className="cardHeader">
          <div>
            <h2>{props.doorable?.name || "Unknown Doorable"}</h2>
            <div className="subMeta">
              {props.doorable?.series || "Unknown Series"} • {props.doorable?.movie || "Unknown Movie"}
            </div>
            <div className="subMeta">Submitted by: {props.submitter}</div>
            {!props.doorable ? (
              <div className="idWarning">
                Doorable ID: {props.submission.doorable_id || "Missing doorable_id"}
              </div>
            ) : null}
          </div>

          <span
            className="statusBadge"
            style={{
              background: theme.bg,
              color: theme.text,
              borderColor: theme.border,
            }}
          >
            {theme.label}
          </span>
        </div>

        <div className="modalCompare">
          <ImagePanel
            label="Current image"
            src={props.doorable?.image_url || ""}
            alt={props.doorable?.name || "Current image"}
            large
            eager
          />
          <ImagePanel
            label="Submitted image"
            src={props.submission.image_url}
            alt="Submitted image"
            large
            eager
          />
        </div>

        <div className="actionGrid modalActions">
          <button
            type="button"
            onClick={() => void props.onApprove(props.submission)}
            disabled={isBusy}
            className="greenButton"
          >
            Approve ✅
          </button>

          <button
            type="button"
            onClick={() => void props.onReject(props.submission)}
            disabled={isBusy}
            className="redButton"
          >
            Reject ❌
          </button>

          <button
            type="button"
            onClick={() => void props.onPending(props.submission)}
            disabled={isBusy}
            className="orangeButton"
          >
            Pending ⏳
          </button>

          <button
            type="button"
            onClick={() => void props.onDelete(props.submission)}
            disabled={isBusy}
            className="darkButton"
          >
            Delete 🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyles = `
  .adminPage {
    min-height: 100vh;
    padding: 24px;
    color: white;
    background:
      radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
      radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
      linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%);
  }

  .centerPage {
    display: grid;
    place-items: center;
  }

  .shell {
    max-width: 1450px;
    margin: 0 auto;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    background:
      radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 30%),
      linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.30);
    margin-bottom: 18px;
    border: 1px solid rgba(255,255,255,0.08);
  }

  .eyebrow {
    display: inline-flex;
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.14);
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.1rem);
    line-height: 1;
    letter-spacing: -1px;
    font-weight: 1000;
  }

  .hero p {
    margin: 10px 0 0;
    color: rgba(255,255,255,0.88);
    font-weight: 750;
    line-height: 1.5;
  }

  .signedIn {
    margin-top: 10px;
    font-size: 13px;
    color: rgba(255,255,255,0.74);
    font-weight: 800;
  }

  .refreshButton,
  .lightButton {
    border: none;
    border-radius: 14px;
    padding: 12px 16px;
    min-height: 46px;
    font-weight: 950;
    cursor: pointer;
  }

  .refreshButton {
    color: white;
    background: linear-gradient(135deg, #f59e0b, #fb7185);
    box-shadow: 0 12px 24px rgba(245,158,11,0.22);
  }

  .lightButton {
    color: #3730a3;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .statCard {
    border: 1px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.95);
    color: #111827;
    border-radius: 20px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(0,0,0,0.16);
  }

  .statCard.active {
    outline: 3px solid #8b5cf6;
  }

  .statCard span {
    display: block;
    color: #64748b;
    font-weight: 900;
    margin-bottom: 6px;
  }

  .statCard strong {
    font-size: 34px;
    line-height: 1;
    font-weight: 1000;
  }

  .toolsCard,
  .messageBox,
  .loadingCard,
  .emptyCard,
  .adminOnlyCard {
    background: rgba(255,255,255,0.96);
    color: #111827;
    border-radius: 24px;
    padding: 18px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.16);
    margin-bottom: 18px;
    border: 1px solid rgba(255,255,255,0.35);
  }

  .adminOnlyCard {
    width: min(560px, 100%);
    text-align: center;
    color: white;
    background: linear-gradient(135deg,#111827,#4338ca);
    padding: 28px;
  }

  .adminOnlyTitle {
    font-size: 38px;
    font-weight: 1000;
    margin-bottom: 12px;
  }

  .adminOnlyText {
    font-size: 18px;
    opacity: 0.95;
    line-height: 1.5;
  }

  .adminOnlyEmail {
    margin-top: 14px;
    font-size: 14px;
    opacity: 0.8;
  }

  .toolsTop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 14px;
  }

  .toolsTitle {
    font-size: 22px;
    font-weight: 1000;
  }

  .toolsMeta {
    color: #64748b;
    font-weight: 800;
    margin-top: 4px;
    font-size: 13px;
  }

  .filterGrid {
    display: grid;
    grid-template-columns: 1.4fr repeat(5, minmax(150px, 1fr));
    gap: 10px;
  }

  .field {
    width: 100%;
    box-sizing: border-box;
    padding: 13px 14px;
    border-radius: 14px;
    border: 1px solid #d1d5db;
    background: white;
    color: #111827;
    min-height: 48px;
    font-size: 14px;
  }

  .toggleLine {
    margin-top: 12px;
  }

  .toggleLabel {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #334155;
    font-weight: 900;
  }

  .submissionGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 18px;
  }

  .submissionGrid.compact {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .submissionCard {
    background: rgba(255,255,255,0.97);
    color: #111827;
    border-radius: 22px;
    padding: 16px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.35);
  }

  .submissionGrid.compact .submissionCard {
    padding: 13px;
    border-radius: 18px;
  }

  .cardHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .cardHeader h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 1000;
    line-height: 1.1;
  }

  .subMeta {
    margin-top: 5px;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.35;
  }

  .idWarning {
    margin-top: 8px;
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .statusBadge {
    display: inline-flex;
    white-space: nowrap;
    border: 1px solid;
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 1000;
  }

  .detailGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .detailGrid div {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 10px;
    min-width: 0;
  }

  .detailGrid span {
    display: block;
    font-size: 11px;
    color: #64748b;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .detailGrid strong {
    display: block;
    color: #111827;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .compareGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }

  .imagePanel {
    min-width: 0;
  }

  .imageLabel {
    font-weight: 1000;
    margin-bottom: 8px;
    color: #334155;
  }

  .imageBox {
    height: 190px;
    border-radius: 16px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .imageBox.large {
    height: 340px;
  }

  .imageBox img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .noImage {
    color: #6b7280;
    font-weight: 900;
    text-align: center;
    padding: 10px;
  }

  .actionGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .actionGrid button {
    border: none;
    border-radius: 13px;
    padding: 11px 12px;
    min-height: 44px;
    color: white;
    font-weight: 950;
    cursor: pointer;
  }

  .actionGrid button:disabled {
    opacity: 0.62;
    cursor: wait;
  }

  .greenButton { background: #16a34a; }
  .redButton { background: #dc2626; }
  .orangeButton { background: #f59e0b; }
  .blueButton { background: #2563eb; }
  .darkButton { background: #334155; grid-column: span 2; }

  .modalOverlay {
    position: fixed;
    inset: 0;
    background: rgba(2,6,23,0.78);
    backdrop-filter: blur(10px);
    z-index: 1000;
    padding: 16px;
    display: grid;
    place-items: center;
  }

  .modalCard {
    width: min(1120px, 100%);
    max-height: 92vh;
    overflow: auto;
    border-radius: 28px;
    background: white;
    color: #111827;
    padding: 20px;
    box-shadow: 0 28px 80px rgba(0,0,0,0.45);
    position: relative;
  }

  .modalClose {
    position: absolute;
    right: 14px;
    top: 12px;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: none;
    background: #eef2ff;
    color: #312e81;
    font-size: 25px;
    font-weight: 900;
    cursor: pointer;
  }

  .modalCompare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }

  .modalActions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .modalActions .darkButton {
    grid-column: auto;
  }

  @media (max-width: 1020px) {
    .filterGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .adminPage {
      padding: 12px;
    }

    .hero {
      border-radius: 22px;
      padding: 18px;
    }

    .hero h1 {
      font-size: clamp(2rem, 10vw, 2.7rem);
    }

    .refreshButton,
    .lightButton {
      width: 100%;
    }

    .statsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .toolsCard,
    .messageBox,
    .loadingCard,
    .emptyCard {
      border-radius: 20px;
      padding: 14px;
    }

    .filterGrid {
      grid-template-columns: 1fr;
    }

    .submissionGrid,
    .submissionGrid.compact {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .cardHeader {
      display: grid;
    }

    .statusBadge {
      width: fit-content;
    }

    .detailGrid,
    .compareGrid,
    .modalCompare,
    .modalActions {
      grid-template-columns: 1fr;
    }

    .imageBox {
      height: 220px;
    }

    .imageBox.large {
      height: 300px;
    }

    .darkButton,
    .modalActions .darkButton {
      grid-column: auto;
    }

    .actionGrid {
      grid-template-columns: 1fr;
    }

    .modalCard {
      border-radius: 22px;
      padding: 16px;
    }
  }
`;
