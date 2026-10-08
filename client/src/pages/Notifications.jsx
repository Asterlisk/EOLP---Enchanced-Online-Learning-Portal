import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./Notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    let active = true;
    apiFetch("/notifications")
      .then(async (response) => {
        if (!response) throw new Error("Your session ended. Please sign in again.");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load notifications.");
        if (active) setNotifications(payload.notifications || []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markOneRead(id) {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      setError("Could not save the read status. Please refresh and try again.");
    }
  }

  async function markAllRead() {
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/notifications/read-all", { method: "PATCH" });
      if (!response) return;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not mark notifications as read.");
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading notifications…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Notifications</h2><p>{unreadCount} unread</p></div>
        {unreadCount > 0 && <button type="button" className="btn btn-secondary" onClick={markAllRead} disabled={saving}>{saving ? "Saving…" : "Mark all as read"}</button>}
      </div>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {notifications.length === 0 ? <EmptyState title="No notifications" message="Course announcements, class schedules, and results will appear here." icon={BellOff} /> : (
        <ul className="list">
          {notifications.map((item) => <li key={item.id}>
            <Link to={item.link || "/dashboard/notifications"} className={`list-item notification-item ${item.readAt ? "" : "notification-item--unread"}`} onClick={() => !item.readAt && markOneRead(item.id)}>
              <Bell size={16} aria-hidden="true" />
              <div className="list-item-info">
                <p className="list-item-title">{item.title}</p>
                <p className="notification-body">{item.body}</p>
                <p className="list-item-meta">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              {!item.readAt && <span className="unread-dot" aria-label="Unread" />}
            </Link>
          </li>)}
        </ul>
      )}
    </div>
  );
}
