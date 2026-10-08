import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Save, LogOut } from "lucide-react";
import { apiFetch, getStoredUser, logout } from "../lib/api";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import "./ProfessorDashboard.css";

async function requestJson(path, options = {}) {
  const response = await apiFetch(path, {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response) throw new Error("Your session ended. Please sign in again.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The request could not be completed.");
  return payload;
}

const QUIZ_OPTION_DEFAULTS = ["", "", "", ""];
const localDateTimeValue = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function ProfessorDashboard() {
  const user = getStoredUser();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", schedule: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [virtualClassForm, setVirtualClassForm] = useState({ title: "", startsAt: "", durationMinutes: 60, meetingUrl: "", notes: "" });
  const [editingVirtualClass, setEditingVirtualClass] = useState(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonForms, setLessonForms] = useState({});
  const [editingModule, setEditingModule] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({ title: "", instructions: "", dueAt: "" });
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [gradeForms, setGradeForms] = useState({});
  const [quizForm, setQuizForm] = useState({
    title: "", type: "QUIZ", scheduledAt: "", durationMinutes: 20,
    prompt: "", options: QUIZ_OPTION_DEFAULTS, correctOptionIndex: 0,
  });

  async function refreshCourses() {
    const data = await requestJson("/professor/courses");
    setCourses(data.courses);
    setSelectedCourseId((current) => current || data.courses[0]?.id || "");
    return data.courses;
  }

  useEffect(() => {
    let active = true;
    requestJson("/professor/courses")
      .then((data) => {
        if (!active) return;
        setCourses(data.courses);
        setSelectedCourseId(data.courses[0]?.id || "");
      })
      .catch((error) => { if (active) setPageError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const course = courses.find((item) => item.id === selectedCourseId) || null;

  useEffect(() => {
    if (course) setCourseForm({
      title: course.title || "",
      description: course.description || "",
      schedule: course.schedule || "",
    });
  }, [course?.id, course?.title, course?.description, course?.schedule]);

  async function perform(action, successMessage, afterSuccess) {
    setNotice("");
    setPageError("");
    setSaving(true);
    try {
      await action();
      if (afterSuccess) afterSuccess();
      await refreshCourses();
      setNotice(successMessage);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function createModule(event) {
    event.preventDefault();
    if (!course || !moduleTitle.trim()) return;
    perform(
      () => requestJson(`/professor/courses/${course.id}/modules`, { method: "POST", body: { title: moduleTitle } }),
      "Module added.",
      () => setModuleTitle("")
    );
  }

  function saveModule(event, moduleId) {
    event.preventDefault();
    const title = editingModule?.title?.trim();
    if (!title) return;
    perform(
      () => requestJson(`/professor/modules/${moduleId}`, { method: "PATCH", body: { title } }),
      "Module updated.",
      () => setEditingModule(null)
    );
  }

  function deleteModule(module) {
    if (!window.confirm(`Delete “${module.title}” and all of its lessons?`)) return;
    perform(
      () => requestJson(`/professor/modules/${module.id}`, { method: "DELETE" }),
      "Module deleted."
    );
  }

  function addLesson(event, moduleId) {
    event.preventDefault();
    const values = lessonForms[moduleId] || { title: "", type: "Reading", content: "", resourceUrl: "" };
    if (!values.title.trim()) return;
    perform(
      () => requestJson(`/professor/modules/${moduleId}/lessons`, { method: "POST", body: values }),
      "Lesson added.",
      () => setLessonForms((current) => ({ ...current, [moduleId]: { title: "", type: "Reading", content: "", resourceUrl: "" } }))
    );
  }

  function saveLesson(event, lessonId) {
    event.preventDefault();
    if (!editingLesson?.title?.trim()) return;
    perform(
      () => requestJson(`/professor/lessons/${lessonId}`, {
        method: "PATCH", body: { title: editingLesson.title, type: editingLesson.type, content: editingLesson.content, resourceUrl: editingLesson.resourceUrl },
      }),
      "Lesson updated.",
      () => setEditingLesson(null)
    );
  }

  function deleteLesson(lesson) {
    if (!window.confirm(`Delete “${lesson.title}”? Its saved completion records will also be removed.`)) return;
    perform(
      () => requestJson(`/professor/lessons/${lesson.id}`, { method: "DELETE" }),
      "Lesson deleted."
    );
  }

  function saveCourse(event) {
    event.preventDefault();
    if (!course) return;
    perform(
      () => requestJson(`/professor/courses/${course.id}`, { method: "PATCH", body: courseForm }),
      "Course details saved."
    );
  }

  function createAnnouncement(event) {
    event.preventDefault();
    if (!course) return;
    perform(
      () => requestJson(`/professor/courses/${course.id}/announcements`, { method: "POST", body: announcementForm }),
      "Announcement published to students.",
      () => setAnnouncementForm({ title: "", body: "" })
    );
  }

  function saveAnnouncement(event) {
    event.preventDefault();
    if (!editingAnnouncement) return;
    perform(
      () => requestJson(`/professor/announcements/${editingAnnouncement.id}`, {
        method: "PATCH", body: { title: editingAnnouncement.title, body: editingAnnouncement.body },
      }),
      "Announcement updated.",
      () => setEditingAnnouncement(null)
    );
  }

  function deleteAnnouncement(announcement) {
    if (!window.confirm(`Delete “${announcement.title}”?`)) return;
    perform(
      () => requestJson(`/professor/announcements/${announcement.id}`, { method: "DELETE" }),
      "Announcement deleted."
    );
  }

  function createVirtualClass(event) {
    event.preventDefault();
    if (!course) return;
    const body = { ...virtualClassForm, startsAt: new Date(virtualClassForm.startsAt).toISOString(), durationMinutes: Number(virtualClassForm.durationMinutes) };
    perform(
      () => requestJson(`/professor/courses/${course.id}/virtual-classes`, { method: "POST", body }),
      "Virtual class scheduled.",
      () => setVirtualClassForm({ title: "", startsAt: "", durationMinutes: 60, meetingUrl: "", notes: "" })
    );
  }

  function saveVirtualClass(event) {
    event.preventDefault();
    if (!editingVirtualClass) return;
    const body = { ...editingVirtualClass, startsAt: new Date(editingVirtualClass.startsAt).toISOString(), durationMinutes: Number(editingVirtualClass.durationMinutes) };
    perform(
      () => requestJson(`/professor/virtual-classes/${editingVirtualClass.id}`, { method: "PATCH", body }),
      "Virtual class updated.",
      () => setEditingVirtualClass(null)
    );
  }

  function deleteVirtualClass(session) {
    if (!window.confirm(`Delete “${session.title}”?`)) return;
    perform(
      () => requestJson(`/professor/virtual-classes/${session.id}`, { method: "DELETE" }),
      "Virtual class deleted."
    );
  }

  function createAssignment(event) {
    event.preventDefault();
    if (!course) return;
    perform(
      () => requestJson(`/professor/courses/${course.id}/assignments`, { method: "POST", body: assignmentForm }),
      "Assignment created.",
      () => setAssignmentForm({ title: "", instructions: "", dueAt: "" })
    );
  }

  function saveAssignment(event, assignmentId) {
    event.preventDefault();
    if (!editingAssignment) return;
    const body = {
      title: editingAssignment.title,
      instructions: editingAssignment.instructions,
      dueAt: new Date(editingAssignment.dueAt).toISOString(),
    };
    perform(
      () => requestJson(`/professor/assignments/${assignmentId}`, { method: "PATCH", body }),
      "Assignment updated.",
      () => setEditingAssignment(null)
    );
  }

  function updateGradeField(submission, field, value) {
    setGradeForms((current) => ({
      ...current,
      [submission.id]: {
        score: current[submission.id]?.score ?? submission.score ?? "",
        maxScore: current[submission.id]?.maxScore ?? submission.maxScore ?? "100",
        feedback: current[submission.id]?.feedback ?? submission.feedback ?? "",
        [field]: value,
      },
    }));
  }

  function saveGrade(event, submission) {
    event.preventDefault();
    const fields = gradeForms[submission.id] || {};
    const score = Number(fields.score ?? submission.score);
    const maxScore = Number(fields.maxScore ?? submission.maxScore ?? 100);
    perform(
      () => requestJson(`/professor/submissions/${submission.id}/grade`, {
        method: "PATCH",
        body: { score, maxScore, feedback: fields.feedback ?? submission.feedback ?? "" },
      }),
      `Grade saved for ${submission.student.username}.`,
      () => setGradeForms((current) => { const next = { ...current }; delete next[submission.id]; return next; })
    );
  }

  async function downloadSubmission(submission) {
    setPageError("");
    try {
      const response = await apiFetch(`/professor/submissions/${submission.id}/file`);
      if (!response) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Could not download the submission.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = submission.fileUrl.split("/").pop() || "submission";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setPageError(error.message);
    }
  }

  function toggleResults(quiz) {
    const releasing = !quiz.resultsReleased;
    const verb = releasing ? "released" : "hidden";
    perform(
      () => requestJson(`/professor/quizzes/${quiz.id}/results`, {
        method: "PATCH", body: { released: releasing },
      }),
      `${quiz.title} results ${verb}.`
    );
  }

  function createQuiz(event) {
    event.preventDefault();
    if (!course) return;
    const body = {
      title: quizForm.title,
      type: quizForm.type,
      scheduledAt: new Date(quizForm.scheduledAt).toISOString(),
      durationMinutes: Number(quizForm.durationMinutes),
      questions: [{
        prompt: quizForm.prompt,
        options: quizForm.options,
        correctOptionIndex: Number(quizForm.correctOptionIndex),
      }],
    };
    perform(
      () => requestJson(`/professor/courses/${course.id}/quizzes`, { method: "POST", body }),
      "Quiz created.",
      () => setQuizForm({
        title: "", type: "QUIZ", scheduledAt: "", durationMinutes: 20,
        prompt: "", options: QUIZ_OPTION_DEFAULTS, correctOptionIndex: 0,
      })
    );
  }

  if (loading) return <LoadingState label="Loading your teaching workspace…" />;
  if (pageError && courses.length === 0) {
    return <EmptyState title="Teaching workspace unavailable" message={pageError} icon={BookOpen} />;
  }

  return (
    <main className="professor-page">
      <header className="professor-topbar">
        <div>
          <p className="professor-eyebrow">EOLP · FACULTY</p>
          <h1>Teaching workspace</h1>
          <p>Welcome, {user?.username || "Professor"}. Manage your courses and learning activities.</p>
        </div>
        <button type="button" className="professor-logout" onClick={logout}><LogOut size={17} /> Log out</button>
      </header>

      <section className="professor-course-picker">
        <label htmlFor="professor-course-select">Assigned course</label>
        {courses.length ? (
          <select id="professor-course-select" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
          </select>
        ) : <p>No courses are assigned to this professor account yet.</p>}
      </section>

      {pageError && <p className="professor-alert professor-alert--error" role="alert">{pageError}</p>}
      {notice && <p className="professor-alert professor-alert--success" role="status">{notice}</p>}

      {!course ? <EmptyState title="No assigned courses" message="When an administrator assigns a course to your account, it will appear here." icon={BookOpen} /> : (
        <>
          <section className="professor-panel">
            <div className="professor-section-heading">
              <div><p className="professor-code">{course.code}</p><h2>Course details</h2></div>
              <span className="professor-count">{course.modules.length} modules · {course.assignments.length} assignments · {course.quizzes.length} quizzes</span>
            </div>
            <form className="professor-form professor-course-form" onSubmit={saveCourse}>
              <label>Course title<input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} maxLength={200} required /></label>
              <label>Meeting schedule<input value={courseForm.schedule} onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })} placeholder="e.g. Tue/Thu, 9:00–10:30 AM" /></label>
              <label className="professor-form-wide">Description<textarea rows="3" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} /></label>
              <button type="submit" className="professor-button professor-button--primary" disabled={saving}><Save size={16} /> Save course details</button>
            </form>
          </section>

          <section className="professor-panel">
            <div className="professor-section-heading"><div><p className="professor-code">COURSE UPDATES</p><h2>Announcements</h2></div></div>
            <form className="professor-form" onSubmit={createAnnouncement}>
              <label className="professor-form-wide">Title<input value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} maxLength={200} required /></label>
              <label className="professor-form-wide">Message<textarea rows="4" value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} maxLength={10000} required /></label>
              <button type="submit" className="professor-button professor-button--primary" disabled={saving}><Plus size={16} /> Publish announcement</button>
            </form>
            {course.announcements.length ? <ul className="professor-record-list professor-announcement-list">
              {course.announcements.map((announcement) => <li className="professor-announcement-row" key={announcement.id}>
                {editingAnnouncement?.id === announcement.id ? <form className="professor-form" onSubmit={saveAnnouncement}>
                  <label className="professor-form-wide">Title<input value={editingAnnouncement.title} onChange={(event) => setEditingAnnouncement({ ...editingAnnouncement, title: event.target.value })} maxLength={200} required /></label>
                  <label className="professor-form-wide">Message<textarea rows="3" value={editingAnnouncement.body} onChange={(event) => setEditingAnnouncement({ ...editingAnnouncement, body: event.target.value })} maxLength={10000} required /></label>
                  <div className="professor-actions"><button className="professor-button professor-button--primary" disabled={saving}><Save size={15} /> Save</button><button type="button" className="professor-button" onClick={() => setEditingAnnouncement(null)}>Cancel</button></div>
                </form> : <>
                  <div><strong>{announcement.title}</strong><p>{announcement.body}</p><small>Published {new Date(announcement.createdAt).toLocaleString()}</small></div>
                  <div className="professor-actions"><button type="button" className="professor-icon-button" aria-label={`Edit ${announcement.title}`} onClick={() => setEditingAnnouncement({ id: announcement.id, title: announcement.title, body: announcement.body })}><Pencil size={15} /></button><button type="button" className="professor-icon-button professor-icon-button--danger" aria-label={`Delete ${announcement.title}`} onClick={() => deleteAnnouncement(announcement)}><Trash2 size={15} /></button></div>
                </>}
              </li>)}
            </ul> : <p className="professor-muted">No announcements for this course yet.</p>}
          </section>

          <section className="professor-panel">
            <div className="professor-section-heading"><div><p className="professor-code">LIVE LEARNING</p><h2>Virtual classes</h2></div></div>
            <form className="professor-form" onSubmit={createVirtualClass}>
              <label>Session title<input value={virtualClassForm.title} onChange={(event) => setVirtualClassForm({ ...virtualClassForm, title: event.target.value })} maxLength={200} required /></label>
              <label>Start date and time<input type="datetime-local" value={virtualClassForm.startsAt} onChange={(event) => setVirtualClassForm({ ...virtualClassForm, startsAt: event.target.value })} required /></label>
              <label>Duration (minutes)<input type="number" min="1" max="600" value={virtualClassForm.durationMinutes} onChange={(event) => setVirtualClassForm({ ...virtualClassForm, durationMinutes: event.target.value })} required /></label>
              <label>Meeting link<input type="url" value={virtualClassForm.meetingUrl} onChange={(event) => setVirtualClassForm({ ...virtualClassForm, meetingUrl: event.target.value })} maxLength={2000} placeholder="https://…" /></label>
              <label className="professor-form-wide">Notes<textarea rows="3" value={virtualClassForm.notes} onChange={(event) => setVirtualClassForm({ ...virtualClassForm, notes: event.target.value })} maxLength={5000} /></label>
              <button type="submit" className="professor-button professor-button--primary" disabled={saving}><Plus size={16} /> Schedule class</button>
            </form>
            {course.virtualClasses.length ? <ul className="professor-record-list professor-announcement-list">
              {course.virtualClasses.map((session) => <li className="professor-announcement-row" key={session.id}>
                {editingVirtualClass?.id === session.id ? <form className="professor-form" onSubmit={saveVirtualClass}>
                  <label>Session title<input value={editingVirtualClass.title} onChange={(event) => setEditingVirtualClass({ ...editingVirtualClass, title: event.target.value })} maxLength={200} required /></label>
                  <label>Start date and time<input type="datetime-local" value={editingVirtualClass.startsAt} onChange={(event) => setEditingVirtualClass({ ...editingVirtualClass, startsAt: event.target.value })} required /></label>
                  <label>Duration (minutes)<input type="number" min="1" max="600" value={editingVirtualClass.durationMinutes} onChange={(event) => setEditingVirtualClass({ ...editingVirtualClass, durationMinutes: event.target.value })} required /></label>
                  <label>Meeting link<input type="url" value={editingVirtualClass.meetingUrl} onChange={(event) => setEditingVirtualClass({ ...editingVirtualClass, meetingUrl: event.target.value })} maxLength={2000} /></label>
                  <label className="professor-form-wide">Notes<textarea rows="3" value={editingVirtualClass.notes} onChange={(event) => setEditingVirtualClass({ ...editingVirtualClass, notes: event.target.value })} maxLength={5000} /></label>
                  <div className="professor-actions"><button className="professor-button professor-button--primary" disabled={saving}><Save size={15} /> Save</button><button type="button" className="professor-button" onClick={() => setEditingVirtualClass(null)}>Cancel</button></div>
                </form> : <>
                  <div><strong>{session.title}</strong><p>{new Date(session.startsAt).toLocaleString()} · {session.durationMinutes} minutes</p>{session.meetingUrl && <p><a href={session.meetingUrl} target="_blank" rel="noreferrer">Open meeting link</a></p>}{session.notes && <p>{session.notes}</p>}</div>
                  <div className="professor-actions"><button type="button" className="professor-icon-button" aria-label={`Edit ${session.title}`} onClick={() => setEditingVirtualClass({ ...session, startsAt: localDateTimeValue(session.startsAt), meetingUrl: session.meetingUrl || "", notes: session.notes || "" })}><Pencil size={15} /></button><button type="button" className="professor-icon-button professor-icon-button--danger" aria-label={`Delete ${session.title}`} onClick={() => deleteVirtualClass(session)}><Trash2 size={15} /></button></div>
                </>}
              </li>)}
            </ul> : <p className="professor-muted">No virtual classes scheduled for this course.</p>}
          </section>

          <section className="professor-panel">
            <div className="professor-section-heading"><div><p className="professor-code">COURSE CONTENT</p><h2>Modules and lessons</h2></div></div>
            <form className="professor-inline-form" onSubmit={createModule}>
              <input aria-label="New module title" placeholder="New module title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} maxLength={200} required />
              <button type="submit" className="professor-button professor-button--primary" disabled={saving}><Plus size={16} /> Add module</button>
            </form>
            {course.modules.length === 0 ? <p className="professor-muted">No modules in this course yet.</p> : (
              <div className="professor-module-list">
                {course.modules.map((module) => (
                  <article className="professor-module" key={module.id}>
                    <div className="professor-module-heading">
                      {editingModule?.id === module.id ? (
                        <form className="professor-inline-form professor-edit-module" onSubmit={(e) => saveModule(e, module.id)}>
                          <input aria-label="Module title" value={editingModule.title} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} required maxLength={200} />
                          <button className="professor-button professor-button--primary" disabled={saving}>Save</button>
                          <button type="button" className="professor-button" onClick={() => setEditingModule(null)}>Cancel</button>
                        </form>
                      ) : <><div><h3>{module.title}</h3><p>{module.lessons.length} lessons</p></div><div className="professor-actions"><button className="professor-icon-button" type="button" aria-label={`Rename ${module.title}`} onClick={() => setEditingModule({ id: module.id, title: module.title })}><Pencil size={16} /></button><button className="professor-icon-button professor-icon-button--danger" type="button" aria-label={`Delete ${module.title}`} onClick={() => deleteModule(module)}><Trash2 size={16} /></button></div></>}
                    </div>
                    <ul className="professor-lesson-list">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          {editingLesson?.id === lesson.id ? (
                            <form className="professor-inline-form professor-edit-lesson" onSubmit={(e) => saveLesson(e, lesson.id)}>
                              <input aria-label="Lesson title" value={editingLesson.title} onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })} required maxLength={250} />
                              <select aria-label="Lesson type" value={editingLesson.type} onChange={(e) => setEditingLesson({ ...editingLesson, type: e.target.value })}>{["Reading", "Video", "Practice", "Lab", "Assignment", "Project"].map((type) => <option key={type}>{type}</option>)}</select>
                              <div className="professor-lesson-material-fields">
                                <label>Lesson content<textarea value={editingLesson.content} onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })} maxLength={20000} rows={4} placeholder="Add instructions or learning notes" /></label>
                                <label>Resource or video URL<input type="url" value={editingLesson.resourceUrl} onChange={(e) => setEditingLesson({ ...editingLesson, resourceUrl: e.target.value })} maxLength={2000} placeholder="https://…" /></label>
                              </div>
                              <button className="professor-button professor-button--primary" disabled={saving}>Save</button>
                              <button type="button" className="professor-button" onClick={() => setEditingLesson(null)}>Cancel</button>
                            </form>
                          ) : <><span>{lesson.title}</span><span className="professor-lesson-type">{lesson.type}</span><div className="professor-actions"><button type="button" className="professor-icon-button" aria-label={`Edit ${lesson.title}`} onClick={() => setEditingLesson({ id: lesson.id, title: lesson.title, type: lesson.type, content: lesson.content || "", resourceUrl: lesson.resourceUrl || "" })}><Pencil size={15} /></button><button type="button" className="professor-icon-button professor-icon-button--danger" aria-label={`Delete ${lesson.title}`} onClick={() => deleteLesson(lesson)}><Trash2 size={15} /></button></div></>}
                        </li>
                      ))}
                    </ul>
                    <form className="professor-inline-form professor-add-lesson" onSubmit={(e) => addLesson(e, module.id)}>
                      <input aria-label={`New lesson for ${module.title}`} placeholder="Lesson title" value={lessonForms[module.id]?.title || ""} onChange={(e) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || { title: "", type: "Reading", content: "", resourceUrl: "" }), title: e.target.value } }))} maxLength={250} required />
                      <select aria-label="New lesson type" value={lessonForms[module.id]?.type || "Reading"} onChange={(e) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || { title: "", type: "Reading", content: "", resourceUrl: "" }), type: e.target.value } }))}>{["Reading", "Video", "Practice", "Lab", "Assignment", "Project"].map((type) => <option key={type}>{type}</option>)}</select>
                      <button type="submit" className="professor-button" disabled={saving}><Plus size={15} /> Add lesson</button>
                      <details className="professor-lesson-material-details">
                        <summary>Add lesson material (optional)</summary>
                        <div className="professor-lesson-material-fields">
                          <label>Lesson content<textarea value={lessonForms[module.id]?.content || ""} onChange={(e) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || { title: "", type: "Reading", content: "", resourceUrl: "" }), content: e.target.value } }))} maxLength={20000} rows={4} placeholder="Add instructions or learning notes" /></label>
                          <label>Resource or video URL<input type="url" value={lessonForms[module.id]?.resourceUrl || ""} onChange={(e) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || { title: "", type: "Reading", content: "", resourceUrl: "" }), resourceUrl: e.target.value } }))} maxLength={2000} placeholder="https://…" /></label>
                        </div>
                      </details>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="professor-panel">
            <div className="professor-section-heading">
              <div><p className="professor-code">STUDENT WORK</p><h2>Assignment submissions</h2></div>
            </div>
            {course.assignments.flatMap((assignment) => assignment.submissions.map((submission) => ({ assignment, submission }))).length === 0 ? (
              <p className="professor-muted">No students have submitted work for this course yet.</p>
            ) : (
              <div className="professor-submission-list">
                {course.assignments.flatMap((assignment) => assignment.submissions.map((submission) => ({ assignment, submission }))).map(({ assignment, submission }) => {
                  const fields = gradeForms[submission.id] || {};
                  return (
                    <article className="professor-submission" key={submission.id}>
                      <div className="professor-submission-heading">
                        <div><h3>{submission.student.username}</h3><p>{assignment.title} · Submitted {new Date(submission.submittedAt).toLocaleString()}</p></div>
                        <span className={`professor-status professor-status--${submission.status.toLowerCase()}`}>{submission.status}</span>
                      </div>
                      {submission.textResponse && <div className="professor-student-response"><strong>Student response</strong><p>{submission.textResponse}</p></div>}
                      {submission.fileUrl && <button type="button" className="professor-button" onClick={() => downloadSubmission(submission)}>Download submitted file</button>}
                      <form className="professor-grade-form" onSubmit={(event) => saveGrade(event, submission)}>
                        <label>Score<input type="number" min="0" step="any" value={fields.score ?? submission.score ?? ""} onChange={(event) => updateGradeField(submission, "score", event.target.value)} required /></label>
                        <span className="professor-grade-divider">out of</span>
                        <label>Maximum score<input type="number" min="0.01" step="any" value={fields.maxScore ?? submission.maxScore ?? 100} onChange={(event) => updateGradeField(submission, "maxScore", event.target.value)} required /></label>
                        <label className="professor-grade-feedback">Feedback<textarea rows="2" value={fields.feedback ?? submission.feedback ?? ""} onChange={(event) => updateGradeField(submission, "feedback", event.target.value)} maxLength={10000} placeholder="Comments for the student" /></label>
                        <button className="professor-button professor-button--primary" disabled={saving}><Save size={15} /> Save grade</button>
                      </form>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="professor-panel">
            <div className="professor-section-heading">
              <div><p className="professor-code">ASSESSMENT RESULTS</p><h2>Quiz attempts and result release</h2></div>
            </div>
            {!course.quizzes.some((quiz) => quiz.attempts.length) ? (
              <p className="professor-muted">No quiz attempts have been submitted for this course yet.</p>
            ) : course.quizzes.filter((quiz) => quiz.attempts.length).map((quiz) => (
              <article className="professor-quiz-review" key={quiz.id}>
                <div className="professor-quiz-review-heading">
                  <div><h3>{quiz.title}</h3><p>{quiz._count.attempts} attempts · {quiz._count.questions} questions</p></div>
                  <button type="button" className={`professor-button ${quiz.resultsReleased ? "" : "professor-button--primary"}`} onClick={() => toggleResults(quiz)} disabled={saving}>
                    {quiz.resultsReleased ? "Hide results" : "Release results"}
                  </button>
                </div>
                <ul className="professor-record-list">
                  {quiz.attempts.map((attempt) => (
                    <li className="professor-attempt" key={attempt.id}>
                      <div><strong>{attempt.student.username}</strong><p>{attempt.submittedAt ? `Submitted ${new Date(attempt.submittedAt).toLocaleString()}` : "In progress"}</p>
                        {attempt.answers.map((answer) => <p className="professor-answer-review" key={answer.questionId}><span>{answer.question.prompt}</span><br />Student answer: {answer.selectedOption?.text || "No answer"}<br />Correct answer: {answer.question.options.find((option) => option.isCorrect)?.text || "—"}</p>)}
                      </div>
                      <span className="professor-attempt-score">{attempt.submittedAt ? `${attempt.score ?? 0}/${attempt.maxScore ?? quiz._count.questions}` : "In progress"}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <div className="professor-two-column">
            <section className="professor-panel">
              <div className="professor-section-heading"><div><p className="professor-code">ASSESSMENT</p><h2>Assignments</h2></div></div>
              <form className="professor-form" onSubmit={createAssignment}>
                <label>Title<input value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} maxLength={250} required /></label>
                <label>Due date<input type="datetime-local" value={assignmentForm.dueAt} onChange={(e) => setAssignmentForm({ ...assignmentForm, dueAt: e.target.value })} required /></label>
                <label className="professor-form-wide">Instructions<textarea rows="4" value={assignmentForm.instructions} onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })} required /></label>
                <button type="submit" className="professor-button professor-button--primary" disabled={saving}><Plus size={16} /> Create assignment</button>
              </form>
              <ul className="professor-record-list">
                {course.assignments.map((assignment) => (
                  <li key={assignment.id}>
                    {editingAssignment?.id === assignment.id ? (
                      <form className="professor-form" onSubmit={(e) => saveAssignment(e, assignment.id)}>
                        <label>Title<input value={editingAssignment.title} onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })} required /></label>
                        <label>Due date<input type="datetime-local" value={editingAssignment.dueAt} onChange={(e) => setEditingAssignment({ ...editingAssignment, dueAt: e.target.value })} required /></label>
                        <label className="professor-form-wide">Instructions<textarea rows="3" value={editingAssignment.instructions} onChange={(e) => setEditingAssignment({ ...editingAssignment, instructions: e.target.value })} required /></label>
                        <button className="professor-button professor-button--primary" disabled={saving}>Save assignment</button>
                      </form>
                    ) : <><div><strong>{assignment.title}</strong><p>Due {new Date(assignment.dueAt).toLocaleString()}</p></div><button type="button" className="professor-icon-button" aria-label={`Edit ${assignment.title}`} onClick={() => setEditingAssignment({ ...assignment, dueAt: new Date(assignment.dueAt).toISOString().slice(0, 16) })}><Pencil size={15} /></button></>}
                  </li>
                ))}
              </ul>
              {!course.assignments.length && <p className="professor-muted">No assignments yet.</p>}
            </section>

            <section className="professor-panel">
              <div className="professor-section-heading"><div><p className="professor-code">ASSESSMENT</p><h2>Quizzes and exams</h2></div></div>
              <form className="professor-form" onSubmit={createQuiz}>
                <label>Title<input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} maxLength={250} required /></label>
                <label>Type<select value={quizForm.type} onChange={(e) => setQuizForm({ ...quizForm, type: e.target.value })}><option value="QUIZ">Quiz</option><option value="EXAM">Exam</option></select></label>
                <label>Scheduled for<input type="datetime-local" value={quizForm.scheduledAt} onChange={(e) => setQuizForm({ ...quizForm, scheduledAt: e.target.value })} required /></label>
                <label>Duration (minutes)<input type="number" min="1" max="600" value={quizForm.durationMinutes} onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: e.target.value })} required /></label>
                <label className="professor-form-wide">First question<textarea rows="2" value={quizForm.prompt} onChange={(e) => setQuizForm({ ...quizForm, prompt: e.target.value })} required /></label>
                {quizForm.options.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={(e) => setQuizForm((current) => ({ ...current, options: current.options.map((value, optionIndex) => optionIndex === index ? e.target.value : value) }))} required /></label>)}
                <label className="professor-form-wide">Correct option<select value={quizForm.correctOptionIndex} onChange={(e) => setQuizForm({ ...quizForm, correctOptionIndex: e.target.value })}>{quizForm.options.map((option, index) => <option key={index} value={index}>Option {index + 1}{option ? ` · ${option}` : ""}</option>)}</select></label>
                <button type="submit" className="professor-button professor-button--primary professor-form-wide" disabled={saving}><Plus size={16} /> Create quiz</button>
              </form>
              <ul className="professor-record-list">
                {course.quizzes.map((quiz) => <li key={quiz.id}><div><strong>{quiz.title}</strong><p>{quiz.type} · {quiz._count.questions} questions · {new Date(quiz.scheduledAt).toLocaleString()}</p></div><span>{quiz._count.attempts} attempts</span></li>)}
              </ul>
              {!course.quizzes.length && <p className="professor-muted">No quizzes yet.</p>}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
