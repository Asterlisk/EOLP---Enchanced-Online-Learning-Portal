import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PencilLine, Clock } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./Quizzes.css";

const STATUS_PILL = {
  "Not Started": "pill--neutral",
  Upcoming: "pill--neutral",
  "In Progress": "pill--progress",
  Submitted: "pill--progress",
  Graded: "pill--done",
};

export default function Quizzes() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const types = ["All", "Quiz", "Exam"];

  useEffect(() => {
    let active = true;
    apiFetch("/quizzes")
      .then(async (response) => {
        if (!response) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Assessments could not be loaded.");
        if (active) setQuizzes(data.quizzes);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = typeFilter === "All" ? quizzes : quizzes.filter((quiz) =>
    (typeFilter === "Exam" ? quiz.type === "EXAM" : quiz.type === "QUIZ")
  );

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Quizzes & Exams</h2><p>Upcoming, in-progress, and completed assessments</p></div>
        <div className="filter-bar"><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></div>
      </div>

      {loading ? <LoadingState label="Loading assessments…" /> : error ? (
        <EmptyState title="Assessments could not be loaded" message={error} icon={PencilLine} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No assessments match this filter" icon={PencilLine} />
      ) : (
        <ul className="list">
          {filtered.map((quiz) => {
            const status = quiz.status === "Not Started" && new Date(quiz.schedule) > new Date() ? "Upcoming" : quiz.status;
            const type = quiz.type === "EXAM" ? "Exam" : "Quiz";
            return (
              <li key={quiz.id} className="list-item">
                <div className="list-item-info">
                  <p className="list-item-title">{quiz.title}</p>
                  <p className="list-item-meta">{quiz.course} · {type} · <Clock size={12} style={{ verticalAlign: "-1px" }} /> {new Date(quiz.schedule).toLocaleString()} · {quiz.durationMinutes} min</p>
                </div>
                <span className={`pill ${STATUS_PILL[status] || "pill--neutral"}`}>{status}</span>
                {status === "Graded" && quiz.resultsReleased ? (
                  <span className="quiz-score">{quiz.score}</span>
                ) : (
                  <Link to={`/dashboard/quizzes/${quiz.id}`} className="btn btn-primary">
                    {status === "Submitted" ? "View submission" : status === "In Progress" ? "Resume" : "Start"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
