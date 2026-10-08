import "./ProgressBar.css";

export default function ProgressBar({ value, label }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="progress-bar" role="group" aria-label={label || "Progress"}>
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="progress-bar-value">{clamped}%</span>
    </div>
  );
}
