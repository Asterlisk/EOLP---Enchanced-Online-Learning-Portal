import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2 } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./QuizAttempt.css";

export default function QuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [existingAttempt, setExistingAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await apiFetch(`/quizzes/${quizId}`);
        if (!res) return; // apiFetch already redirected on an expired session

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Something went wrong while loading this assessment.");
        }

        if (cancelled) return;
        setQuiz(data.quiz);
        setExistingAttempt(data.attempt);
        setSecondsLeft(data.quiz.durationMinutes * 60);
        if (data.attempt?.submittedAt) setSubmitted(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Something went wrong while loading this assessment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (!quiz || submitted || secondsLeft === null) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, submitted, secondsLeft]);

  if (loading) return <LoadingState label="Loading assessment…" />;

  if (loadError) {
    return <EmptyState title="Couldn't load this assessment" message={loadError} />;
  }

  if (!quiz) {
    return <EmptyState title="Assessment not found" />;
  }

  if (!quiz.questions.length) {
    return (
      <EmptyState
        title="Assessment not yet available"
        message="Your instructor hasn't published the questions for this assessment yet."
      />
    );
  }

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);

    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      };

      const res = await apiFetch(`/quizzes/${quiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res) return; // apiFetch already redirected on an expired session

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong while submitting.");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const released = existingAttempt?.score != null;
    return (
      <div className="quiz-attempt quiz-attempt--done">
        <CheckCircle2 size={32} aria-hidden="true" />
        <h2>Assessment submitted</h2>
        {released ? (
          <p>Your score: {existingAttempt.score}/{existingAttempt.maxScore}</p>
        ) : (
          <p>Your results will appear here once your instructor releases them.</p>
        )}
        <button type="button" className="btn btn-primary" onClick={() => navigate("/dashboard/quizzes")}>
          Back to Quizzes & Exams
        </button>
      </div>
    );
  }

  const question = quiz.questions[index];
  const unanswered = quiz.questions.filter((q) => !(q.id in answers)).length;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="quiz-attempt">
      <div className="quiz-attempt-bar">
        <div>
          <p className="quiz-attempt-course">{quiz.course}</p>
          <h2 className="quiz-attempt-title">{quiz.title}</h2>
        </div>
        <div className="quiz-attempt-timer">
          <Clock size={16} aria-hidden="true" />
          {mm}:{ss}
        </div>
      </div>

      <div className="quiz-attempt-progress">
        Question {index + 1} of {quiz.questions.length}
      </div>

      <div className="quiz-attempt-question">
        <p>{question.prompt}</p>
        <div className="quiz-attempt-options">
          {question.options.map((opt) => (
            <label key={opt.id} className="quiz-attempt-option">
              <input
                type="radio"
                name={question.id}
                checked={answers[question.id] === opt.id}
                onChange={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="quiz-attempt-nav">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          Previous
        </button>

        {index < quiz.questions.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit assessment"}
          </button>
        )}
      </div>

      {unanswered > 0 && (
        <p className="quiz-attempt-warning">{unanswered} question(s) still unanswered.</p>
      )}

      {submitError && (
        <p className="login-error" role="alert">
          {submitError}
        </p>
      )}
    </div>
  );
}
