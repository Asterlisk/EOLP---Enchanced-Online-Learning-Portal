import "./SummaryCard.css";

export default function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-card-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="summary-card-text">
        <p className="summary-card-value">{value}</p>
        <p className="summary-card-label">{label}</p>
      </div>
    </div>
  );
}
