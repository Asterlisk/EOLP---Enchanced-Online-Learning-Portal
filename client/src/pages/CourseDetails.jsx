import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Circle, Clock } from "lucide-react";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import { apiFetch } from "../lib/api";
import LoadingState from "../components/LoadingState";
import "./CourseDetails.css";

export default function CourseDetails() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [progressError, setProgressError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch(`/courses/${courseId}`)
      .then(async (response) => {
        if (!response) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Course could not be loaded.");
        if (active) setCourse(data.course);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  if (loading) return <LoadingState label="Loading course…" />;
  if (error) return <EmptyState title="Course could not be loaded" message={error} />;
  if (!course) {
    return <EmptyState title="Course not found" message="It may have been removed or you are not enrolled." />;
  }

  const courseAnnouncements = course.announcements || [];

  async function toggleLesson(lesson) {
    setProgressError("");
    const method = lesson.completed ? "DELETE" : "POST";
    try {
      const response = await apiFetch(`/courses/${course.id}/lessons/${lesson.id}/progress`, { method });
      if (!response) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Lesson progress could not be saved.");
      setCourse((current) => {
        const modules = current.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((item) =>
            item.id === lesson.id ? { ...item, completed: data.completed, completedAt: data.completed ? data.completedAt : null } : item
          ),
        }));
        const allLessons = modules.flatMap((module) => module.lessons);
        return {
          ...current,
          modules,
          completedLessons: allLessons.filter((item) => item.completed).length,
          completedModules: modules.filter((module) =>
            module.lessons.length > 0 && module.lessons.every((item) => item.completed)
          ).length,
          completion: allLessons.length
            ? Math.round(allLessons.filter((item) => item.completed).length / allLessons.length * 100)
            : 0,
        };
      });
    } catch (error) {
      setProgressError(error.message);
    }
  }

  return (
    <div className="page">
      <Link to="/dashboard/courses" className="back-link">
        <ChevronLeft size={16} /> Back to My Courses
      </Link>

      <div className="card course-header">
        <p className="course-header-code">{course.code}</p>
        <h2 className="course-header-title">{course.title}</h2>
        <p className="course-header-instructor">{course.instructor?.username || "Instructor profile pending"}</p>
        <p className="course-header-desc">{course.description}</p>
        <div className="course-header-meta">
          <span><Clock size={14} /> {course.schedule}</span>
          <span className="pill pill--progress">{course.status}</span>
        </div>
        <ProgressBar value={course.completion} label="Course completion" />
      </div>

      <div className="card">
        <h3 className="course-section-title">Modules</h3>
        {progressError && <p className="course-progress-error" role="alert">{progressError}</p>}
        <div className="module-list">
          {course.modules.map((m) => (
            <div key={m.id} className="module-block">
              <p className="module-title">{m.title}</p>
              <ul className="lesson-list">
                {m.lessons.map((l) => (
                  <li key={l.id} className="lesson-item">
                    <button
                      type="button"
                      className="lesson-completion-toggle"
                      onClick={() => toggleLesson(l)}
                      aria-label={`${l.completed ? "Mark incomplete" : "Mark complete"}: ${l.title}`}
                      aria-pressed={l.completed}
                    >
                      {l.completed ? (
                        <CheckCircle2 size={18} className="lesson-done" aria-hidden="true" />
                      ) : (
                        <Circle size={18} className="lesson-pending" aria-hidden="true" />
                      )}
                    </button>
                    <span>{l.title}</span>
                    <span className="lesson-type">{l.type}</span>
                    {(l.content || l.resourceUrl) && (
                      <details className="course-lesson-material">
                        <summary>View material</summary>
                        {l.content && <p>{l.content}</p>}
                        {l.resourceUrl && <a href={l.resourceUrl} target="_blank" rel="noreferrer">Open resource</a>}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Course Announcements</h3>
        {courseAnnouncements.length === 0 ? (
          <EmptyState title="No announcements yet" />
        ) : (
          <ul className="list">
            {courseAnnouncements.map((a) => (
              <li key={a.id} className="list-item">
                <div className="list-item-info">
                  <p className="list-item-title">{a.title}</p>
                  <p className="list-item-meta">{new Date(a.createdAt).toLocaleString()} · {a.author.username}</p>
                  <p className="course-announcement-body">{a.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
