import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./Assignments.css";

function getStatus(assignment) {
  const submission = assignment.submissions?.[0];
  if (submission?.status === "GRADED") return "Graded";
  if (submission?.status === "RETURNED") return "Returned";
  if (submission?.status === "LATE") return "Late";
  if (submission?.status === "SUBMITTED") return "Submitted";
  return new Date(assignment.dueAt) < new Date() ? "Overdue" : "Not Started";
}

const STATUS_PILL = {
  "Not Started": "pill--neutral",
  Overdue: "pill--late",
  Submitted: "pill--progress",
  Late: "pill--late",
  Returned: "pill--progress",
  Graded: "pill--done",
};

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/assignments")
      .then(async (response) => {
        if (!response) throw new Error("Your session ended. Please sign in again.");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Assignments could not be loaded.");
        if (active) setAssignments(payload.assignments || []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const withStatus = useMemo(() => assignments.map((assignment) => ({ ...assignment, status: getStatus(assignment) })), [assignments]);
  const statuses = ["All", ...new Set(withStatus.map((assignment) => assignment.status))];
  const filtered = statusFilter === "All" ? withStatus : withStatus.filter((assignment) => assignment.status === statusFilter);

  if (loading) return <LoadingState label="Loading assignments…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Assignments</h2><p>Track deadlines, submissions, and returned work</p></div>
        {statuses.length > 1 && <div className="filter-bar"><select aria-label="Filter assignments by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>}
      </div>
      {error && <p className="assignment-error" role="alert">{error}</p>}
      {!error && filtered.length === 0 ? <EmptyState title={statusFilter === "All" ? "No assignments yet" : "No assignments match this filter"} message="Assignments from your enrolled courses will appear here." icon={ClipboardList} /> : (
        <ul className="list">
          {filtered.map((assignment) => <li key={assignment.id} className="list-item">
            <div className="list-item-info"><p className="list-item-title">{assignment.title}</p><p className="list-item-meta">{assignment.course.code} · {assignment.course.title} · Due {new Date(assignment.dueAt).toLocaleString()}</p></div>
            <span className={`pill ${STATUS_PILL[assignment.status] || "pill--neutral"}`}>{assignment.status}</span>
            <Link to={`/dashboard/assignments/${assignment.id}`} className="btn btn-secondary">Open</Link>
          </li>)}
        </ul>
      )}
    </div>
  );
}
