import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { apiFetch } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./Announcements.css";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [courseFilter, setCourseFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/announcements")
      .then(async (response) => {
        if (!response) throw new Error("Your session ended. Please sign in again.");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load announcements.");
        if (active) setAnnouncements(payload.announcements || []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const courses = useMemo(() => ["All", ...new Map(announcements.map((item) => [item.course.id, `${item.course.code} · ${item.course.title}`])).values()], [announcements]);
  const filtered = courseFilter === "All"
    ? announcements
    : announcements.filter((item) => `${item.course.code} · ${item.course.title}` === courseFilter);

  if (loading) return <LoadingState label="Loading announcements…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Announcements</h2>
          <p>Updates from your enrolled courses</p>
        </div>
        {courses.length > 1 && <div className="filter-bar">
          <select aria-label="Filter announcements by course" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
            {courses.map((course) => <option key={course} value={course}>{course}</option>)}
          </select>
        </div>}
      </div>

      {error && <p className="announcement-error" role="alert">{error}</p>}
      {!error && filtered.length === 0 ? (
        <EmptyState title="No announcements" message="Your teachers’ course updates will appear here." icon={Megaphone} />
      ) : (
        <ul className="list">
          {filtered.map((announcement) => (
            <li key={announcement.id} className="list-item announcement-item">
              <div className="list-item-info">
                <p className="list-item-title">{announcement.title}</p>
                <p className="list-item-meta">{announcement.course.code} · {announcement.course.title} · {announcement.author.username} · {new Date(announcement.createdAt).toLocaleString()}</p>
                <p className="announcement-preview">{announcement.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
