import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { apiFetch, logout } from "../lib/api";
import LoadingState from "../components/LoadingState";
import "./Settings.css";

const DEFAULT_PREFERENCES = { assignments: true, grades: true, announcements: true, virtualClasses: false };

async function readResponse(response, fallback) {
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || fallback);
  return payload;
}

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [error, setError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreference, setSavingPreference] = useState("");
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch("/auth/me")
      .then((response) => readResponse(response, "Account settings could not be loaded."))
      .then(({ user }) => {
        if (!active) return;
        setPrefs({
          assignments: user.notifyAssignments,
          grades: user.notifyGrades,
          announcements: user.notifyAnnouncements,
          virtualClasses: user.notifyVirtualClasses,
        });
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError(""); setPasswordMsg(""); setSavingPassword(true);
    try {
      const response = await apiFetch("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await readResponse(response, "Could not update the password.");
      setPasswordMsg(payload.message || "Password updated successfully.");
      setCurrentPassword(""); setNewPassword("");
    } catch (actionError) { setError(actionError.message); }
    finally { setSavingPassword(false); }
  }

  async function togglePreference(key) {
    const nextValue = !prefs[key];
    setError(""); setPasswordMsg(""); setSavingPreference(key);
    setPrefs((current) => ({ ...current, [key]: nextValue }));
    try {
      const response = await apiFetch("/auth/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: nextValue }),
      });
      await readResponse(response, "Could not save this preference.");
    } catch (actionError) {
      setPrefs((current) => ({ ...current, [key]: !nextValue }));
      setError(actionError.message);
    } finally { setSavingPreference(""); }
  }

  if (loading) return <LoadingState label="Loading account settings…" />;

  return (
    <div className="page">
      <div className="page-head"><div><h2>Settings</h2><p>Manage your account and notification preferences</p></div></div>
      {error && <p className="settings-error" role="alert">{error}</p>}

      <div className="card">
        <h3 className="course-section-title">Change password</h3>
        <form className="settings-form" onSubmit={handlePasswordSubmit}>
          {passwordMsg && <p className="settings-success" role="status">{passwordMsg}</p>}
          <label className="settings-field"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label className="settings-field"><span>New password</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} maxLength={200} /><small>Use at least 8 characters.</small></label>
          <button type="submit" className="btn btn-primary" disabled={savingPassword}>{savingPassword ? "Updating…" : "Update password"}</button>
        </form>
      </div>

      <div className="card">
        <h3 className="course-section-title">Notification preferences</h3>
        <p className="settings-help">Turn off a category to stop creating new notifications of that type.</p>
        <div className="settings-toggles">
          {[
            { key: "assignments", label: "New assignments" },
            { key: "grades", label: "Grades and released quiz results" },
            { key: "announcements", label: "Course announcements" },
            { key: "virtualClasses", label: "Virtual class schedules" },
          ].map((item) => (
            <label key={item.key} className="settings-toggle">
              <span>{item.label}</span>
              <input type="checkbox" checked={Boolean(prefs[item.key])} onChange={() => togglePreference(item.key)} disabled={Boolean(savingPreference)} aria-label={`${item.label} notifications`} />
            </label>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-secondary settings-logout" onClick={logout}><LogOut size={16} /> Logout</button>
    </div>
  );
}
