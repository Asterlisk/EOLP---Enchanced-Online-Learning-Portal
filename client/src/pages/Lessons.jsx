import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Video, File } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./Lessons.css";

const TYPE_ICON = {
  Reading: FileText,
  Video: Video,
  Practice: FileText,
  Lab: FileText,
  Assignment: FileText,
  Project: FileText,
  Document: File,
};

export default function Lessons() {
  const [courseFilter, setCourseFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/courses")
      .then(async (response) => {
        if (!response) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Course lessons could not be loaded.");
        if (active) setCourseList(data.courses);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const materials = useMemo(() => courseList.flatMap((course) => course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      courseId: course.id,
      course: course.title,
      module: module.title,
    }))
  )), [courseList]);
  const courses = ["All", ...new Set(materials.map((lesson) => lesson.course))];
  const types = ["All", ...new Set(materials.map((lesson) => lesson.type))];

  const filtered = materials.filter(
    (m) =>
      (courseFilter === "All" || m.course === courseFilter) &&
      (typeFilter === "All" || m.type === typeFilter)
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Lessons & Materials</h2>
          <p>Browse lessons in your enrolled courses</p>
        </div>
        <div className="filter-bar">
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            {courses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <LoadingState label="Loading lessons…" /> : error ? (
        <EmptyState title="Lessons could not be loaded" message={error} icon={FileText} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No lessons match these filters" icon={FileText} />
      ) : (
        <ul className="list">
          {filtered.map((m) => {
            const Icon = TYPE_ICON[m.type] || File;
            return (
              <li key={m.id} className="list-item">
                <div className="material-icon">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="list-item-info">
                  <p className="list-item-title">
                    {m.title}
                  </p>
                  <p className="list-item-meta">{m.course} · {m.module} · {m.type}</p>
                </div>
                <Link to={`/dashboard/courses/${m.courseId}`} className="btn btn-secondary">Open course</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
