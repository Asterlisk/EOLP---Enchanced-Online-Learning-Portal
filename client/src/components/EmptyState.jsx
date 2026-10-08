import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", message, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <Icon size={24} aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}
