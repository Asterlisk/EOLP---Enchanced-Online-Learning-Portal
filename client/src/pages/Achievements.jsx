import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Star, Trophy } from "lucide-react";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./Achievements.css";

const ICONS = { BookOpen, ClipboardCheck, GraduationCap, Star, Trophy };

async function getPayload(path) {
  const response = await apiFetch(path);
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Achievements could not be loaded.");
  return payload;
}

export default function Achievements() {
  const [activity, setActivity] = useState({ courses: [], assignments: [], quizzes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getPayload("/courses"), getPayload("/assignments"), getPayload("/quizzes")])
      .then(([courses, assignments, quizzes]) => {
        if (active) setActivity({ courses: courses.courses || [], assignments: assignments.assignments || [], quizzes: quizzes.quizzes || [] });
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const completedLessons = activity.courses.reduce((sum, course) => sum + course.completedLessons, 0);
    const completedCourses = activity.courses.filter((course) => course.totalLessons > 0 && course.completedLessons === course.totalLessons).length;
    const gradedAssignments = activity.assignments.filter((assignment) => assignment.submissions?.some((submission) => submission.status === "GRADED")).length;
    const completedQuizzes = activity.quizzes.filter((quiz) => quiz.status === "Graded" || quiz.status === "Submitted").length;
    const xpTotal = completedLessons * 10 + gradedAssignments * 20 + completedQuizzes * 15;
    const level = Math.floor(xpTotal / 100) + 1;
    const xp = xpTotal % 100;
    const badges = [
      { id: "first-lesson", label: "First Steps", icon: "BookOpen", earned: completedLessons >= 1 },
      { id: "ten-lessons", label: "Lesson Learner", icon: "Star", earned: completedLessons >= 10 },
      { id: "course-finished", label: "Course Finisher", icon: "GraduationCap", earned: completedCourses >= 1 },
      { id: "assignment-graded", label: "Assignment Graded", icon: "ClipboardCheck", earned: gradedAssignments >= 1 },
      { id: "quiz-submitted", label: "Quiz Complete", icon: "Trophy", earned: completedQuizzes >= 1 },
    ];
    const milestones = [
      { id: "lessons", label: "Complete lessons", progress: completedLessons, total: 10 },
      { id: "assignments", label: "Receive graded assignments", progress: gradedAssignments, total: 5 },
      { id: "quizzes", label: "Submit quizzes", progress: completedQuizzes, total: 5 },
      { id: "courses", label: "Finish a course", progress: completedCourses, total: 1 },
    ];
    return { xpTotal, xp, level, xpToNextLevel: 100, badges, milestones };
  }, [activity]);

  if (loading) return <LoadingState label="Loading achievements…" />;
  if (error) return <div className="page"><EmptyState title="Achievements could not be loaded" message={error} /></div>;

  const xpPercent = Math.round((stats.xp / stats.xpToNextLevel) * 100);
  return (
    <div className="page">
      <div className="page-head"><div><h2>Achievements</h2><p>Badges and points earned through your course activity</p></div></div>

      <div className="card achievements-level-card">
        <div className="achievements-level-badge">Lv {stats.level}</div>
        <div className="achievements-level-info">
          <p className="achievements-level-xp">{stats.xp} / {stats.xpToNextLevel} XP to next level <span>({stats.xpTotal} total earned)</span></p>
          <ProgressBar value={xpPercent} label="XP progress" />
        </div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Badges</h3>
        <div className="badge-grid">
          {stats.badges.map((badge) => {
            const Icon = ICONS[badge.icon] || Trophy;
            return <div key={badge.id} className={`badge-tile ${badge.earned ? "" : "badge-tile--locked"}`}><Icon size={22} aria-hidden="true" /><span>{badge.label}</span><small>{badge.earned ? "Earned" : "Not earned yet"}</small></div>;
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Milestones</h3>
        <div className="milestone-list">
          {stats.milestones.map((milestone) => <div key={milestone.id} className="milestone-row">
            <p className="milestone-label">{milestone.label}</p>
            <ProgressBar value={Math.min(100, Math.round(milestone.progress / milestone.total * 100))} label={milestone.label} />
            <p className="milestone-count">{milestone.progress}/{milestone.total}</p>
          </div>)}
        </div>
      </div>
    </div>
  );
}
