import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./LearningProgress.css";

export default function LearningProgress() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/courses")
      .then(async (response) => {
        if (!response) throw new Error("Your session ended. Please sign in again.");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Learning progress could not be loaded.");
        if (active) setCourses(data.courses || []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const { dailyActivity, recentCompletions } = useMemo(() => {
    const completions = courses.flatMap((course) => course.modules.flatMap((module) => module.lessons
      .filter((lesson) => lesson.completedAt)
      .map((lesson) => ({ title: lesson.title, course: course.title, completedAt: lesson.completedAt }))));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const count = completions.filter((item) => new Date(item.completedAt).toDateString() === date.toDateString()).length;
      return { day: date.toLocaleDateString(undefined, { weekday: "short" }), date, count };
    });
    return {
      dailyActivity: days,
      recentCompletions: completions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5),
    };
  }, [courses]);

  const totalLessons = courses.reduce((total, course) => total + course.totalLessons, 0);
  const completedLessons = courses.reduce((total, course) => total + course.completedLessons, 0);
  const totalModules = courses.reduce((total, course) => total + course.totalModules, 0);
  const completedModules = courses.reduce((total, course) => total + course.completedModules, 0);
  const courseCompletion = totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0;
  const maxCompletions = Math.max(1, ...dailyActivity.map((day) => day.count));

  if (loading) return <LoadingState label="Loading your progress…" />;
  if (error) return <div className="page"><EmptyState title="Progress could not be loaded" message={error} /></div>;

  return (
    <div className="page">
      <div className="page-head"><div><h2>Learning Progress</h2><p>How you're tracking across all enrolled courses</p></div></div>

      <div className="card progress-overview">
        <div><p className="progress-overview-value">{courseCompletion}%</p><p className="progress-overview-label">Overall completion</p></div>
        <div><p className="progress-overview-value">{completedLessons}/{totalLessons}</p><p className="progress-overview-label">Lessons completed</p></div>
        <div><p className="progress-overview-value">{completedModules}/{totalModules}</p><p className="progress-overview-label">Modules completed</p></div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Progress by course</h3>
        {courses.length === 0 ? <EmptyState title="No course progress yet" /> : <div className="progress-course-list">
          {courses.map((course) => {
            const nextLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => !lesson.completed);
            return <div key={course.id} className="progress-course-row">
              <div className="progress-course-info"><p className="progress-course-title">{course.title}</p>{nextLesson ? <p className="progress-course-next">Next: {nextLesson.title}</p> : <p className="progress-course-next progress-course-next--done">All lessons completed</p>}</div>
              <div className="progress-course-bar"><ProgressBar value={course.completion} label={`${course.title} completion`} /></div>
              <Link to={`/dashboard/courses/${course.id}`} className="btn btn-secondary">Resume</Link>
            </div>;
          })}
        </div>}
      </div>

      <div className="card">
        <h3 className="course-section-title">Lesson completions this week</h3>
        <p className="progress-chart-caption">Number of lessons completed each day</p>
        <div className="activity-chart" role="img" aria-label="Lesson completions per day over the last seven days">
          {dailyActivity.map((day) => <div key={day.date.toISOString()} className="activity-chart-col">
            <span className="activity-chart-count">{day.count}</span>
            <div className="activity-chart-bar" style={{ height: `${day.count ? Math.max(8, day.count / maxCompletions * 100) : 0}%`, minHeight: day.count ? "4px" : 0 }} title={`${day.count} lesson${day.count === 1 ? "" : "s"}`} />
            <span className="activity-chart-label">{day.day}</span>
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Recent lesson activity</h3>
        {recentCompletions.length ? <ul className="list">
          {recentCompletions.map((item, index) => <li key={`${item.completedAt}-${index}`} className="list-item"><div className="list-item-info"><p className="list-item-title">Completed {item.title}</p><p className="list-item-meta">{item.course} · {new Date(item.completedAt).toLocaleString()}</p></div></li>)}
        </ul> : <EmptyState title="No completed lessons yet" message="Completed lessons will show up here." />}
      </div>
    </div>
  );
}
