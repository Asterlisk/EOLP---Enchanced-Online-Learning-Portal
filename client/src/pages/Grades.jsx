import { useEffect, useState } from "react";
import { GraduationCap, MessageSquare } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./Grades.css";

const STATUS_PILL = { Pending: "pill--neutral", Released: "pill--done" };

export default function Grades() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([apiFetch("/assignments"), apiFetch("/quizzes")])
      .then(async ([assignmentResponse, quizResponse]) => {
        if (!assignmentResponse || !quizResponse) return;
        const [assignmentData, quizData] = await Promise.all([
          assignmentResponse.json(), quizResponse.json(),
        ]);
        if (!assignmentResponse.ok) throw new Error(assignmentData.message || "Assignment grades could not be loaded.");
        if (!quizResponse.ok) throw new Error(quizData.message || "Quiz results could not be loaded.");

        const byCourse = new Map();
        const addItem = (courseId, course, item) => {
          if (!byCourse.has(courseId)) byCourse.set(courseId, { courseId, course, items: [] });
          byCourse.get(courseId).items.push(item);
        };
        for (const assignment of assignmentData.assignments) {
          const submission = assignment.submissions?.[0];
          addItem(assignment.course.id, assignment.course.title, {
            id: assignment.id,
            title: assignment.title,
            type: "Assignment",
            score: submission?.score == null ? "—" : `${submission.score}/${submission.maxScore}`,
            status: submission?.score == null ? "Pending" : "Released",
            feedback: submission?.feedback || "",
          });
        }
        for (const quiz of quizData.quizzes) {
          addItem(quiz.courseId, quiz.course, {
            id: quiz.id,
            title: quiz.title,
            type: quiz.type === "EXAM" ? "Exam" : "Quiz",
            score: quiz.score || "—",
            status: quiz.resultsReleased && quiz.score ? "Released" : "Pending",
            feedback: "",
          });
        }
        if (active) setGroups([...byCourse.values()]);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Grades & Feedback</h2><p>Scores and comments released by your instructors</p></div>
      </div>

      {loading ? <LoadingState label="Loading grades…" /> : error ? (
        <EmptyState title="Grades could not be loaded" message={error} icon={GraduationCap} />
      ) : groups.length === 0 ? <EmptyState title="No results yet" icon={GraduationCap} /> : (
        <div className="grades-courses">
          {groups.map((group) => (
            <div key={group.courseId} className="card">
              <h3 className="course-section-title">{group.course}</h3>
              <ul className="list">
                {group.items.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="list-item">
                    <div className="list-item-info">
                      <p className="list-item-title">{item.title}</p>
                      <p className="list-item-meta">{item.type}</p>
                      {item.feedback && <p className="feedback-item-comment">{item.feedback}</p>}
                    </div>
                    <span className="grade-score">{item.score}</span>
                    <span className={`pill ${STATUS_PILL[item.status]}`}>{item.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && <div className="card grades-note">
        <h3 className="course-section-title"><MessageSquare size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />About feedback</h3>
        <p>Assignment feedback and released quiz scores appear here after your instructor grades or releases them.</p>
      </div>}
    </div>
  );
}
