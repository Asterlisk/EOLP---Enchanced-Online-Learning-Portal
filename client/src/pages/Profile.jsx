import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./Profile.css";

const ROLE_LABELS = { STUDENT: "Student", PROFESSOR: "Teacher", ADMIN: "Administrator" };

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([apiFetch("/auth/me"), apiFetch("/courses")])
      .then(async ([profileResponse, courseResponse]) => {
        if (!profileResponse || !courseResponse) throw new Error("Your session ended. Please sign in again.");
        const [profileData, courseData] = await Promise.all([profileResponse.json(), courseResponse.json()]);
        if (!profileResponse.ok) throw new Error(profileData.message || "Account information could not be loaded.");
        if (!courseResponse.ok) throw new Error(courseData.message || "Enrolled courses could not be loaded.");
        if (active) { setProfile(profileData.user); setCourses(courseData.courses || []); }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Loading your profile…" />;
  if (error && !profile) return <div className="page"><EmptyState title="Profile unavailable" message={error} /></div>;

  return (
    <div className="page">
      <div className="page-head"><div><h2>Profile</h2><p>Your account information</p></div></div>
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="card profile-card">
        <div className="profile-avatar">{(profile?.username?.[0] || "?").toUpperCase()}</div>
        <div><p className="profile-name">{profile?.username}</p><p className="profile-role">{ROLE_LABELS[profile?.role] || profile?.role}</p></div>
      </div>

      <div className="card">
        <h3 className="course-section-title">Account information</h3>
        <dl className="profile-info-grid">
          <div><dt>Username</dt><dd>{profile?.username}</dd></div>
          <div><dt>Account ID</dt><dd className="profile-id">{profile?.id}</dd></div>
          <div><dt>Role</dt><dd>{ROLE_LABELS[profile?.role] || profile?.role}</dd></div>
          <div><dt>Account status</dt><dd>{profile?.isActive ? "Active" : "Inactive"}</dd></div>
          <div><dt>Created</dt><dd>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</dd></div>
        </dl>
      </div>

      <div className="card">
        <h3 className="course-section-title">Enrolled courses</h3>
        {courses.length === 0 ? <EmptyState title="No enrolled courses yet" /> : <ul className="list">
          {courses.map((course) => <li key={course.id} className="list-item"><div className="list-item-info"><p className="list-item-title">{course.title}</p><p className="list-item-meta">{course.code} · {course.instructor?.username || "Teacher"}</p></div></li>)}
        </ul>}
      </div>

      <Link to="/dashboard/settings" className="btn btn-primary profile-settings-btn">Account settings</Link>
    </div>
  );
}
