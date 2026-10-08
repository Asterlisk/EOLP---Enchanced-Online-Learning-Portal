import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, LogOut, Pencil, Plus, Power, Save, Trash2, Users } from "lucide-react";
import { apiFetch, getStoredUser, logout } from "../lib/api";
import LoadingState from "../components/LoadingState";
import "./AdminCourses.css";

async function requestJson(path, options) {
  const response = await apiFetch(path, options);
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The request could not be completed.");
  return payload;
}

const blankCourse = { code: "", title: "", description: "", schedule: "", instructorId: "" };

export default function AdminCourses() {
  const user = getStoredUser();
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankCourse);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(blankCourse);
  const [enrollmentChoice, setEnrollmentChoice] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([requestJson("/admin/courses"), requestJson("/admin/users")])
      .then(([courseData, userData]) => {
        if (!active) return;
        setCourses(courseData.courses);
        setUsers(userData.users);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const professors = users.filter((item) => item.role === "PROFESSOR" && item.isActive);
  const students = users.filter((item) => item.role === "STUDENT" && item.isActive);

  async function createCourse(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const { course } = await requestJson("/admin/courses", { method: "POST", body: JSON.stringify(form) });
      setCourses((current) => [...current, course].sort((a, b) => a.code.localeCompare(b.code)));
      setForm(blankCourse);
      setNotice(`${course.code} was created and assigned to ${course.instructor.username}.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  function beginEdit(course) {
    setEditingId(course.id);
    setEditForm({ code: course.code, title: course.title, description: course.description || "", schedule: course.schedule || "", instructorId: course.instructor.id });
  }

  async function saveCourse(event, course) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const { course: updated } = await requestJson(`/admin/courses/${course.id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      setCourses((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingId(""); setNotice(`${updated.code} was updated.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  async function enroll(course) {
    const studentId = enrollmentChoice[course.id];
    if (!studentId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const { enrollment } = await requestJson(`/admin/courses/${course.id}/enrollments`, { method: "POST", body: JSON.stringify({ studentId }) });
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, enrollments: [...item.enrollments, enrollment] } : item));
      setEnrollmentChoice((current) => ({ ...current, [course.id]: "" }));
      setNotice(`${enrollment.student.username} was enrolled in ${course.code}.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  async function removeStudent(course, student) {
    setSaving(true); setError(""); setNotice("");
    try {
      await requestJson(`/admin/courses/${course.id}/enrollments/${student.id}`, { method: "DELETE" });
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, enrollments: item.enrollments.filter((entry) => entry.student.id !== student.id) } : item));
      setNotice(`${student.username} was removed from ${course.code}.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  async function toggleCourse(course) {
    setSaving(true); setError(""); setNotice("");
    try {
      const { course: updated } = await requestJson(`/admin/courses/${course.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !course.isActive }) });
      setCourses((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`${updated.code} is now ${updated.isActive ? "available to students" : "paused"}.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete ${course.code} — ${course.title}? This cannot be undone.`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await requestJson(`/admin/courses/${course.id}`, { method: "DELETE" });
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setNotice(`${course.code} was deleted.`);
    } catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Loading courses…" />;

  return (
    <main className="admin-page admin-courses-page">
      <header className="admin-topbar">
        <div><p className="admin-eyebrow">EOLP · ADMINISTRATION</p><h1>Course management</h1><p>Create courses, assign professors, and manage enrollment.</p></div>
        <div className="admin-account-actions"><span>{user?.username || "Administrator"}</span><Link className="admin-logout" to="/admin"><ArrowLeft size={16} /> User accounts</Link><button type="button" className="admin-logout" onClick={logout}><LogOut size={16} /> Log out</button></div>
      </header>

      {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
      {notice && <p className="admin-alert admin-alert--success" role="status">{notice}</p>}

      <section className="admin-panel admin-course-create">
        <div className="admin-panel-heading"><div className="admin-panel-icon"><Plus size={18} /></div><div><p className="admin-eyebrow">COURSE SETUP</p><h2>Create a course</h2></div></div>
        {!professors.length ? <p className="admin-course-note">Create or activate a professor account before creating a course.</p> : (
          <form className="admin-course-form" onSubmit={createCourse}>
            <label>Course code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} maxLength={32} required /></label>
            <label>Course title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={200} required /></label>
            <label>Professor<select value={form.instructorId} onChange={(event) => setForm({ ...form, instructorId: event.target.value })} required><option value="">Select professor</option>{professors.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
            <label>Schedule<input value={form.schedule} onChange={(event) => setForm({ ...form, schedule: event.target.value })} maxLength={200} placeholder="e.g. Tue/Thu, 9:00–10:30 AM" /></label>
            <label className="admin-course-wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={10000} rows="2" /></label>
            <button className="admin-button admin-button--primary" type="submit" disabled={saving}><Plus size={16} /> Create course</button>
          </form>
        )}
      </section>

      <section className="admin-course-list-section">
        <div className="admin-course-section-heading"><div><p className="admin-eyebrow">COURSE CATALOG</p><h2>Courses</h2></div><span>{courses.length} total</span></div>
        {!courses.length ? <div className="admin-panel admin-course-empty"><BookOpen size={22} /><p>No courses have been created yet.</p></div> : (
          <div className="admin-course-list">
            {courses.map((course) => {
              const enrolledIds = new Set(course.enrollments.map((entry) => entry.student.id));
              const availableStudents = students.filter((student) => !enrolledIds.has(student.id));
              return (
                <article className={`admin-panel admin-course-card${course.isActive ? "" : " admin-course-card--inactive"}`} key={course.id}>
                  <div className="admin-course-card-heading"><div><span className="admin-course-code">{course.code}</span><span className={`admin-course-status${course.isActive ? "" : " admin-course-status--inactive"}`}>{course.isActive ? "Available" : "Paused"}</span><h3>{course.title}</h3><p>Teacher {course.instructor.username}{course.schedule ? ` · ${course.schedule}` : ""}</p></div><div className="admin-course-counts"><span>{course._count.modules} modules</span><span>{course._count.assignments} assignments</span><span>{course._count.quizzes} quizzes</span><span>{course._count.enrollments} enrolled</span></div></div>
                  <div className="admin-course-actions"><button type="button" className="admin-button" onClick={() => toggleCourse(course)} disabled={saving}><Power size={15} /> {course.isActive ? "Pause course" : "Make available"}</button>{!course._count.enrollments && !course._count.modules && !course._count.assignments && !course._count.quizzes && !course._count.announcements && !course._count.virtualClasses && <button type="button" className="admin-course-delete" onClick={() => deleteCourse(course)} disabled={saving}><Trash2 size={15} /> Delete empty course</button>}</div>
                  <details className="admin-course-details">
                    <summary><Pencil size={15} /> Edit course and enrollment</summary>
                    {editingId === course.id ? (
                      <form className="admin-course-form admin-course-edit-form" onSubmit={(event) => saveCourse(event, course)}>
                        <label>Course code<input value={editForm.code} onChange={(event) => setEditForm({ ...editForm, code: event.target.value.toUpperCase() })} maxLength={32} required /></label>
                        <label>Course title<input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} maxLength={200} required /></label>
                        <label>Professor<select value={editForm.instructorId} onChange={(event) => setEditForm({ ...editForm, instructorId: event.target.value })} required>{professors.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}</select></label>
                        <label>Schedule<input value={editForm.schedule} onChange={(event) => setEditForm({ ...editForm, schedule: event.target.value })} maxLength={200} /></label>
                        <label className="admin-course-wide">Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength={10000} rows="2" /></label>
                        <div className="admin-course-form-actions"><button className="admin-button admin-button--primary" disabled={saving}><Save size={15} /> Save changes</button><button type="button" className="admin-button" onClick={() => setEditingId("")}>Cancel</button></div>
                      </form>
                    ) : <button type="button" className="admin-course-edit-button" onClick={() => beginEdit(course)}><Pencil size={14} /> Edit course details</button>}
                    <div className="admin-enrollment-manager">
                      <div className="admin-enrollment-heading"><h4><Users size={16} /> Enrolled students</h4><span>{course.enrollments.length}</span></div>
                      {availableStudents.length ? <div className="admin-enroll-form"><select aria-label={`Choose student for ${course.code}`} value={enrollmentChoice[course.id] || ""} onChange={(event) => setEnrollmentChoice({ ...enrollmentChoice, [course.id]: event.target.value })}><option value="">Select student to enroll</option>{availableStudents.map((student) => <option key={student.id} value={student.id}>{student.username}</option>)}</select><button type="button" className="admin-button" onClick={() => enroll(course)} disabled={saving || !enrollmentChoice[course.id]}><Plus size={15} /> Enroll</button></div> : <p className="admin-course-note">No active students are available to enroll.</p>}
                      {course.enrollments.length ? <ul className="admin-enrollment-list">{course.enrollments.map(({ student }) => <li key={student.id}><span>{student.username}</span><button type="button" onClick={() => removeStudent(course, student)} disabled={saving}><Trash2 size={14} /> Remove</button></li>)}</ul> : <p className="admin-course-note">No students are enrolled yet.</p>}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
