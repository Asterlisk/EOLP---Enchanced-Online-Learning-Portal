import { Construction } from "lucide-react";
import "./ComingSoon.css";

export default function ComingSoon({ title }) {
  return (
    <div className="coming-soon">
      <Construction size={28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>This section is being built and will be available soon.</p>
    </div>
  );
}
