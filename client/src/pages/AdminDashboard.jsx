import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, KeyRound, LogOut, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { apiFetch, getStoredUser, logout } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./AdminDashboard.css";

const ROLE_LABELS = { STUDENT: "Student", PROFESSOR: "Teacher", ADMIN: "Administrator" };

async function requestJson(path, options) {
  const response = await apiFetch(path, options);
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The request could not be completed.");
  return payload;
}

export default function AdminDashboard() {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "STUDENT" });

  async function loadUsers() {
    const data = await requestJson("/admin/users");
    setUsers(data.users);
  }

  useEffect(() => {
    let active = true;
    requestJson("/admin/users")
      .then((data) => { if (active) setUsers(data.users); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? users.filter((user) => user.username.toLowerCase().includes(query)) : users;
  }, [search, users]);

  async function createAccount(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { user } = await requestJson("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUsers((current) => [...current, user].sort((a, b) => a.username.localeCompare(b.username)));
      setForm({ username: "", password: "", role: "STUDENT" });
      setNotice(`${ROLE_LABELS[user.role]} account created for ${user.username}.`);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(user, changes) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { user: updated } = await requestJson(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Account updated for ${updated.username}.`);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetUserPassword(user) {
    if (!window.confirm(`Issue a new temporary password for ${user.username}? Their current password will stop working.`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    setResetPasswordResult(null);
    try {
      const result = await requestJson(`/admin/users/${user.id}/reset-password`, { method: "POST" });
      setResetPasswordResult(result);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyTemporaryPassword() {
    try {
      await navigator.clipboard.writeText(resetPasswordResult.temporaryPassword);
      setNotice("Temporary password copied. Save it somewhere private.");
    } catch {
      setNotice("Select and copy the temporary password manually, then save it somewhere private.");
    }
  }

  if (loading) return <LoadingState label="Loading user accounts…" />;
  if (error && users.length === 0) {
    return <EmptyState title="User management unavailable" message={error} icon={Users} />;
  }

  const activeCount = users.filter((user) => user.isActive).length;
  const professorCount = users.filter((user) => user.role === "PROFESSOR").length;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">EOLP · ADMINISTRATION</p>
          <h1>User management</h1>
          <p>Create accounts and manage user access.</p>
        </div>
        <div className="admin-account-actions">
          <span><ShieldCheck size={16} /> {currentUser?.username || "Administrator"}</span>
          <Link className="admin-course-link" to="/admin/courses">Manage courses</Link>
          <button type="button" className="admin-logout" onClick={logout}><LogOut size={16} /> Log out</button>
        </div>
      </header>

      {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
      {notice && <p className="admin-alert admin-alert--success" role="status">{notice}</p>}
      {resetPasswordResult && (
        <section className="admin-alert admin-password-reset-result" aria-label="Temporary password">
          <div>
            <strong>Temporary password for {resetPasswordResult.username}</strong>
            <p>It is shown only now. Share it securely and ask the user to change it after signing in.</p>
          </div>
          <input aria-label={`Temporary password for ${resetPasswordResult.username}`} readOnly value={resetPasswordResult.temporaryPassword} onFocus={(event) => event.target.select()} />
          <button type="button" className="admin-button" onClick={copyTemporaryPassword}><Copy size={15} /> Copy</button>
          <button type="button" className="admin-reset-dismiss" onClick={() => setResetPasswordResult(null)} aria-label="Dismiss temporary password">Dismiss</button>
        </section>
      )}

      <section className="admin-stats" aria-label="Account summary">
        <article><span>Total accounts</span><strong>{users.length}</strong></article>
        <article><span>Active accounts</span><strong>{activeCount}</strong></article>
        <article><span>Teachers</span><strong>{professorCount}</strong></article>
      </section>

      <div className="admin-content-grid">
        <section className="admin-panel admin-create-panel">
          <div className="admin-panel-heading">
            <div className="admin-panel-icon"><UserPlus size={18} /></div>
            <div><p className="admin-eyebrow">NEW ACCOUNT</p><h2>Create an account</h2></div>
          </div>
          <form className="admin-form" onSubmit={createAccount}>
            <label>Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} minLength={3} maxLength={80} autoComplete="off" required /></label>
            <label>Temporary password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} maxLength={200} autoComplete="new-password" required /><small>At least 8 characters</small></label>
            <label>Account role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="STUDENT">Student</option><option value="PROFESSOR">Teacher</option><option value="ADMIN">Administrator</option></select></label>
            <button className="admin-button admin-button--primary" type="submit" disabled={saving}><UserPlus size={16} /> Create account</button>
          </form>
        </section>

        <section className="admin-panel admin-user-list-panel">
          <div className="admin-list-heading">
            <div className="admin-panel-heading">
              <div className="admin-panel-icon"><Users size={18} /></div>
              <div><p className="admin-eyebrow">ACCOUNTS</p><h2>Manage users</h2></div>
            </div>
            <label className="admin-search"><Search size={16} /><input aria-label="Search users" placeholder="Search username" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          </div>

          {filteredUsers.length === 0 ? <p className="admin-empty">No accounts match this search.</p> : (
            <div className="admin-user-list">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                return (
                  <article className="admin-user-row" key={user.id}>
                    <div className="admin-user-identity">
                      <span className="admin-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{user.username}</strong><small>Created {new Date(user.createdAt).toLocaleDateString()}</small></div>
                    </div>
                    <label className="admin-role-control"><span className="admin-control-label">Role</span><select aria-label={`Role for ${user.username}`} value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })} disabled={saving || isCurrentUser}><option value="STUDENT">Student</option><option value="PROFESSOR">Teacher</option><option value="ADMIN">Administrator</option></select></label>
                    <button type="button" className={`admin-status ${user.isActive ? "admin-status--active" : "admin-status--inactive"}`} onClick={() => updateUser(user, { isActive: !user.isActive })} disabled={saving || isCurrentUser} aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.username}`}>
                      <span />{user.isActive ? "Active" : "Inactive"}
                    </button>
                    <button type="button" className="admin-reset-password" onClick={() => resetUserPassword(user)} disabled={saving || !user.isActive}><KeyRound size={14} /> Reset password</button>
                    {isCurrentUser && <small className="admin-current-user"><KeyRound size={13} /> You</small>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
