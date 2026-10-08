import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, UploadCloud, FileCheck2 } from "lucide-react";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { apiFetch } from "../lib/api";
import "./AssignmentDetails.css";

const STATUS_PILL = {
  "Not Started": "pill--neutral",
  Submitted: "pill--progress",
  Late: "pill--late",
  Returned: "pill--done",
  Graded: "pill--done",
};

// Backend enum values are ALL_CAPS; this maps them to the display labels
// the rest of the UI already uses.
function toDisplayStatus(submission) {
  if (!submission) return "Not Started";
  const map = { SUBMITTED: "Submitted", LATE: "Late", RETURNED: "Returned", GRADED: "Graded" };
  return map[submission.status] || "Submitted";
}

export default function AssignmentDetails() {
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [file, setFile] = useState(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadAssignment = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiFetch(`/assignments/${assignmentId}`);
      if (!res) return; // apiFetch already redirected on an expired session

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong while loading this assignment.");
      }

      setAssignment(data.assignment);
    } catch (err) {
      setLoadError(err.message || "Something went wrong while loading this assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  if (loading) return <LoadingState label="Loading assignment…" />;

  if (loadError) {
    return <EmptyState title="Couldn't load this assignment" message={loadError} />;
  }

  if (!assignment) {
    return <EmptyState title="Assignment not found" message="It may have been removed or the link is incorrect." />;
  }

  const submission = assignment.submissions?.[0] || null;
  const status = toDisplayStatus(submission);
  const canSubmit = !submission;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (response) formData.append("textResponse", response);

      const res = await apiFetch(`/assignments/${assignment.id}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!res) return; // apiFetch already redirected on an expired session

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong while submitting.");
      }

      // Re-fetch so the page reflects the real stored submission.
      await loadAssignment();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Link to="/dashboard/assignments" className="back-link">
        <ChevronLeft size={16} /> Back to Assignments
      </Link>

      <div className="card">
        <div className="assignment-head">
          <div>
            <p className="assignment-course">{assignment.course?.title}</p>
            <h2 className="assignment-title">{assignment.title}</h2>
          </div>
          <span className={`pill ${STATUS_PILL[status] || "pill--neutral"}`}>{status}</span>
        </div>

        <p className="assignment-due">Due {new Date(assignment.dueAt).toLocaleString()}</p>
        <p className="assignment-instructions">{assignment.instructions}</p>
      </div>

      {canSubmit && (
        <div className="card">
          <h3 className="course-section-title">Submit your work</h3>
          <form className="submission-form" onSubmit={handleSubmit}>
            {submitError && (
              <p className="login-error" role="alert">
                {submitError}
              </p>
            )}

            <label className="submission-file">
              <UploadCloud size={18} aria-hidden="true" />
              <span>{file ? file.name : "Choose a file to upload"}</span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                hidden
              />
            </label>

            <label className="submission-text-label">
              <span>Text response (optional)</span>
              <textarea
                rows={4}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Add any notes for your instructor…"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={(!file && !response) || submitting}
            >
              {submitting ? "Submitting…" : "Submit assignment"}
            </button>
          </form>
        </div>
      )}

      {submission && (
        <div className="card">
          <div className="submission-success">
            <FileCheck2 size={20} aria-hidden="true" />
            <p>Submitted. You can track its status here.</p>
          </div>

          <h3 className="course-section-title">Submission history</h3>
          <ul className="list">
            <li className="list-item">
              <div className="list-item-info">
                <p className="list-item-title">
                  Submitted {new Date(submission.submittedAt).toLocaleString()}
                </p>
                {submission.score != null && (
                  <p className="list-item-meta">
                    Score: {submission.score}/{submission.maxScore}
                  </p>
                )}
              </div>
            </li>
          </ul>

          {submission.feedback && (
            <div className="feedback-box">
              <p className="feedback-box-label">Instructor feedback</p>
              <p className="feedback-box-text">{submission.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
