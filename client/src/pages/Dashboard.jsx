import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardCheck, ClipboardList, CalendarClock, TrendingUp, Zap, ArrowRight, GraduationCap, Star, Trophy } from "lucide-react";
import SummaryCard from "../components/SummaryCard";
import CourseCard from "../components/CourseCard";
import ProgressBar from "../components/ProgressBar";
import { apiFetch, getStoredUser } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./Dashboard.css";

const BADGE_ICONS = { BookOpen, Star, GraduationCap, ClipboardCheck, Trophy };
const STATUS_CLASS = { "Not Started": "status--neutral", "In Progress": "status--progress", Submitted: "status--progress", Late: "status--late", Returned: "status--progress", Graded: "status--done", Upcoming: "status--neutral" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function getPayload(path) {
  const response = await apiFetch(path);
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Dashboard information could not be loaded.");
  return data;
}

export default function Dashboard() {
  const user = getStoredUser();
  const [data, setData] = useState({ courses: [], assignments: [], quizzes: [], announcements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getPayload("/courses"), getPayload("/assignments"), getPayload("/quizzes"), getPayload("/announcements")])
      .then(([courses, assignments, quizzes, announcements]) => {
        if (active) setData({ courses: courses.courses || [], assignments: assignments.assignments || [], quizzes: quizzes.quizzes || [], announcements: announcements.announcements || [] });
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const courseTotals = data.courses.reduce((totals, course) => ({
    completedLessons: totals.completedLessons + course.completedLessons,
    totalLessons: totals.totalLessons + course.totalLessons,
    completedModules: totals.completedModules + course.completedModules,
    totalModules: totals.totalModules + course.totalModules,
  }), { completedLessons: 0, totalLessons: 0, completedModules: 0, totalModules: 0 });
  const overallProgress = courseTotals.totalLessons ? Math.round(courseTotals.completedLessons / courseTotals.totalLessons * 100) : 0;
  const pendingAssignments = data.assignments.filter((assignment) => assignment.submissions?.[0]?.status !== "GRADED").length;
  const upcomingQuizzes = data.quizzes.filter((quiz) => new Date(quiz.schedule) >= new Date() && !["Graded", "Submitted"].includes(quiz.status));
  const upcomingActivities = [
    ...data.assignments.filter((assignment) => assignment.submissions?.[0]?.status !== "GRADED").map((assignment) => {
      const submission = assignment.submissions?.[0];
      const status = submission?.status === "SUBMITTED" ? "Submitted" : submission?.status === "LATE" ? "Late" : submission?.status === "RETURNED" ? "Returned" : "Not Started";
      return { id: assignment.id, title: assignment.title, course: assignment.course.title, type: "Assignment", dueAt: assignment.dueAt, status, link: `/dashboard/assignments/${assignment.id}` };
    }),
    ...upcomingQuizzes.map((quiz) => ({ id: quiz.id, title: quiz.title, course: quiz.course, type: quiz.type === "EXAM" ? "Exam" : "Quiz", dueAt: quiz.schedule, status: quiz.status, link: `/dashboard/quizzes/${quiz.id}` })),
  ].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 5);

  const gradedAssignments = data.assignments.filter((assignment) => assignment.submissions?.some((submission) => submission.status === "GRADED")).length;
  const completedQuizzes = data.quizzes.filter((quiz) => ["Graded", "Submitted"].includes(quiz.status)).length;
  const xpTotal = courseTotals.completedLessons * 10 + gradedAssignments * 20 + completedQuizzes * 15;
  const level = Math.floor(xpTotal / 100) + 1;
  const xp = xpTotal % 100;
  const xpPercent = xp;
  const earnedBadges = [
    { id: "first-lesson", label: "First Steps", icon: "BookOpen", earned: courseTotals.completedLessons >= 1 },
    { id: "ten-lessons", label: "Lesson Learner", icon: "Star", earned: courseTotals.completedLessons >= 10 },
    { id: "course-finished", label: "Course Finisher", icon: "GraduationCap", earned: data.courses.some((course) => course.totalLessons > 0 && course.completedLessons === course.totalLessons) },
    { id: "assignment-graded", label: "Assignment Graded", icon: "ClipboardCheck", earned: gradedAssignments >= 1 },
    { id: "quiz-submitted", label: "Quiz Complete", icon: "Trophy", earned: completedQuizzes >= 1 },
  ].filter((badge) => badge.earned);

  return (
    <div className="dash">
      <section className="dash-welcome">
        <div><p className="dash-welcome-eyebrow">{greeting()}, {user?.username || "Student"} 👋</p><h2 className="dash-welcome-title">Ready to keep your momentum going?</h2><p className="dash-welcome-sub">Your courses, assignments, and updates at a glance.</p></div>
        <Link to="/dashboard/courses" className="dash-welcome-btn">Continue Learning <ArrowRight size={16} /></Link>
      </section>

      {error && <p className="dash-error" role="alert">{error}</p>}
      <section className="dash-summary">
        <SummaryCard icon={BookOpen} label="Enrolled Courses" value={loading ? "…" : data.courses.length} />
        <SummaryCard icon={ClipboardList} label="Pending Assignments" value={loading ? "…" : pendingAssignments} />
        <SummaryCard icon={CalendarClock} label="Upcoming Assessments" value={loading ? "…" : upcomingQuizzes.length} />
        <SummaryCard icon={TrendingUp} label="Overall Progress" value={loading ? "…" : `${overallProgress}%`} />
        <SummaryCard icon={Zap} label="Total XP" value={loading ? "…" : xpTotal.toLocaleString()} />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          <section className="dash-section">
            <div className="dash-section-head"><h3>Continue Learning</h3><Link to="/dashboard/courses">View all</Link></div>
            {loading ? <LoadingState label="Loading your courses…" /> : data.courses.length === 0 ? <EmptyState title="No enrolled courses yet" /> : <div className="dash-course-row">
              {data.courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={{ ...course, instructor: course.instructor?.username || "Teacher", progress: course.completion }} />)}
            </div>}
          </section>

          <section className="dash-section">
            <div className="dash-section-head"><h3>Upcoming Activities</h3><Link to="/dashboard/assignments">View all</Link></div>
            {loading ? <LoadingState label="Loading assignments and quizzes…" /> : upcomingActivities.length === 0 ? <EmptyState title="No upcoming activities" /> : <ul className="dash-activity-list">
              {upcomingActivities.map((item) => <li key={`${item.type}-${item.id}`} className="dash-activity-item">
                <div className="dash-activity-info"><p className="dash-activity-title">{item.title}</p><p className="dash-activity-meta">{item.course} · {item.type} · Due {new Date(item.dueAt).toLocaleString()}</p></div>
                <span className={`dash-status ${STATUS_CLASS[item.status] || "status--neutral"}`}>{item.status}</span>
                <Link to={item.link} className="dash-activity-btn">Open</Link>
              </li>)}
            </ul>}
          </section>

          <section className="dash-section">
            <div className="dash-section-head"><h3>Recent Announcements</h3><Link to="/dashboard/announcements">View all</Link></div>
            {loading ? <LoadingState label="Loading announcements…" /> : data.announcements.length === 0 ? <EmptyState title="No announcements yet" /> : <ul className="dash-announcement-list">
              {data.announcements.slice(0, 3).map((announcement) => <li key={announcement.id} className="dash-announcement-item">
                <p className="dash-announcement-title">{announcement.title}</p>
                <p className="dash-announcement-meta">{announcement.course.title} · {announcement.author.username} · {new Date(announcement.createdAt).toLocaleString()}</p>
                <p className="dash-announcement-preview">{announcement.body}</p>
                <Link to="/dashboard/announcements" className="dash-announcement-link">View announcement</Link>
              </li>)}
            </ul>}
          </section>
        </div>

        <div className="dash-col dash-col--side">
          <section className="dash-section">
            <div className="dash-section-head"><h3>Learning Progress</h3><Link to="/dashboard/progress">Details</Link></div>
            {loading ? <LoadingState label="Loading progress…" /> : <div className="dash-progress-card">
              <p className="dash-progress-label">Course completion</p><ProgressBar value={overallProgress} label="Course completion" />
              <div className="dash-progress-stats"><div><p className="dash-progress-stat-value">{courseTotals.completedLessons}/{courseTotals.totalLessons}</p><p className="dash-progress-stat-label">Lessons completed</p></div><div><p className="dash-progress-stat-value">{courseTotals.completedModules}/{courseTotals.totalModules}</p><p className="dash-progress-stat-label">Modules completed</p></div></div>
            </div>}
          </section>

          <section className="dash-section">
            <div className="dash-section-head"><h3>Achievements</h3><Link to="/dashboard/achievements">View all</Link></div>
            {loading ? <LoadingState label="Loading achievements…" /> : <div className="dash-gamification-card">
              <div className="dash-level-row"><div className="dash-level-badge">Lv {level}</div><div className="dash-level-info"><p className="dash-level-xp">{xp} / 100 XP to next level</p><ProgressBar value={xpPercent} label="XP progress to next level" /></div></div>
              {earnedBadges.length ? <div className="dash-badges">{earnedBadges.slice(0, 3).map((badge) => { const Icon = BADGE_ICONS[badge.icon] || Trophy; return <span key={badge.id} className="dash-badge"><Icon size={14} aria-hidden="true" />{badge.label}</span>; })}</div> : <p className="dash-no-badges">Complete lessons, assignments, or quizzes to earn your first badge.</p>}
            </div>}
          </section>
        </div>
      </div>
    </div>
  );
}
