import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import { apiFetch } from "../lib/api";
import LoadingState from "../components/LoadingState";
import "./Courses.css";

export default function Courses() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/courses")
      .then(async (response) => {
        if (!response) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Courses could not be loaded.");
        if (active) setCourses(data.courses);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const statuses = ["All", ...new Set(courses.map((c) => c.status))];
  const filtered = statusFilter === "All" ? courses : courses.filter((c) => c.status === statusFilter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>My Courses</h2>
          <p>{courses.length} enrolled courses this semester</p>
        </div>
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <LoadingState label="Loading your courses…" /> : error ? (
        <EmptyState title="Courses could not be loaded" message={error} icon={BookOpen} />
      ) : filtered.length === 0 ? (
        <EmptyState title={courses.length ? "No courses match this filter" : "No enrolled courses yet"} icon={BookOpen} />
      ) : (
        <div className="courses-grid">
          {filtered.map((course) => (
            <Link key={course.id} to={`/dashboard/courses/${course.id}`} className="course-tile">
              <div className="course-tile-icon">
                <BookOpen size={20} aria-hidden="true" />
              </div>
              <div className="course-tile-body">
                <p className="course-tile-code">{course.code}</p>
                <h3 className="course-tile-title">{course.title}</h3>
                <p className="course-tile-instructor">{course.instructor?.username || "Instructor profile pending"}</p>
                <ProgressBar value={course.completion} label={`${course.title} completion`} />
              </div>
              <ArrowRight size={16} className="course-tile-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
