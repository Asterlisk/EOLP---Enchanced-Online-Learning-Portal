import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import { apiFetch } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./VirtualClasses.css";

const STATUS_PILL = { Upcoming: "pill--neutral", Ongoing: "pill--progress", Completed: "pill--done" };

function getStatus(session) {
  const start = new Date(session.startsAt).getTime();
  const end = start + session.durationMinutes * 60 * 1000;
  const now = Date.now();
  if (now < start) return "Upcoming";
  if (now < end) return "Ongoing";
  return "Completed";
}

export default function VirtualClasses() {
  const [sessions, setSessions] = useState([]);
  const [courseFilter, setCourseFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/virtual-classes")
      .then(async (response) => {
        if (!response) throw new Error("Your session ended. Please sign in again.");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load virtual classes.");
        if (active) setSessions(payload.sessions || []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const courses = useMemo(() => ["All", ...new Map(sessions.map((session) => [session.course.id, `${session.course.code} · ${session.course.title}`])).values()], [sessions]);
  const filtered = courseFilter === "All"
    ? sessions
    : sessions.filter((session) => `${session.course.code} · ${session.course.title}` === courseFilter);

  if (loading) return <LoadingState label="Loading virtual classes…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Virtual Classes</h2><p>Join live sessions scheduled by your teachers</p></div>
        {courses.length > 1 && <div className="filter-bar"><select aria-label="Filter classes by course" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>{courses.map((course) => <option key={course} value={course}>{course}</option>)}</select></div>}
      </div>

      {error && <p className="vclass-error" role="alert">{error}</p>}
      {!error && filtered.length === 0 ? <EmptyState title="No virtual classes scheduled" message="Scheduled sessions for your courses will appear here." icon={Video} /> : (
        <ul className="list">
          {filtered.map((session) => {
            const status = getStatus(session);
            return <li key={session.id} className="list-item vclass-item">
              <div className="list-item-info">
                <p className="list-item-title">{session.title}</p>
                <p className="list-item-meta">{session.course.code} · {session.course.title} · {session.course.instructor.username} · {new Date(session.startsAt).toLocaleString()} · {session.durationMinutes} min</p>
                {session.notes && <p className="vclass-notes">{session.notes}</p>}
              </div>
              <span className={`pill ${STATUS_PILL[status]}`}>{status}</span>
              {session.meetingUrl && status !== "Completed" ? <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="btn btn-primary">Join Class <ExternalLink size={14} /></a>
                : status === "Completed" ? <button type="button" className="btn btn-secondary" disabled>Ended</button>
                  : <span className="vclass-no-link">Meeting link not added</span>}
            </li>;
          })}
        </ul>
      )}
    </div>
  );
}
