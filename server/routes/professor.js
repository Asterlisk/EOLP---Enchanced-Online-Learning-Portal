const express = require("express");
const prisma = require("../db");
const path = require("path");
const authenticateToken = require("../middleware/authMiddleware");
const { notifyCourseStudents, notifyUser, notifyUsers } = require("../services/notifications");

const router = express.Router();
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== "PROFESSOR") {
    return res.status(403).json({ message: "Professor access is required." });
  }
  next();
});

async function findOwnedCourse(courseId, professorId) {
  return prisma.course.findFirst({
    where: { id: courseId, instructorId: professorId },
    select: { id: true },
  });
}

async function findOwnedModule(moduleId, professorId) {
  return prisma.courseModule.findFirst({
    where: { id: moduleId, course: { instructorId: professorId } },
    select: { id: true },
  });
}

async function findOwnedLesson(lessonId, professorId) {
  return prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { instructorId: professorId } } },
    select: { id: true },
  });
}

function requiredText(value, label, maxLength = 5000) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    return `${label} is required and must be at most ${maxLength} characters.`;
  }
  return null;
}

function validateLessonMaterialUrl(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) return "Resource link must be a valid web address.";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? null : "Resource link must start with http:// or https://.";
  } catch {
    return "Resource link must be a valid web address.";
  }
}

router.get("/courses", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user.userId },
      orderBy: { code: "asc" },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: { lessons: { orderBy: { orderIndex: "asc" } } },
        },
        assignments: {
          orderBy: { dueAt: "asc" },
          include: {
            submissions: {
              orderBy: { submittedAt: "desc" },
              include: { student: { select: { id: true, username: true } } },
            },
          },
        },
        quizzes: {
          orderBy: { scheduledAt: "asc" },
          include: {
            _count: { select: { questions: true, attempts: true } },
            attempts: {
              orderBy: { startedAt: "desc" },
              include: {
                student: { select: { id: true, username: true } },
                answers: {
                  include: {
                    question: {
                      select: { prompt: true, options: { select: { text: true, isCorrect: true } } },
                    },
                    selectedOption: { select: { text: true } },
                  },
                },
              },
            },
          },
        },
        announcements: { orderBy: { createdAt: "desc" } },
        virtualClasses: { orderBy: { startsAt: "asc" } },
      },
    });
    return res.json({ courses });
  } catch (error) {
    console.error("Professor course list error:", error);
    return res.status(500).json({ message: "Could not load your courses." });
  }
});

router.patch("/courses/:courseId", async (req, res) => {
  try {
    const owned = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!owned) return res.status(404).json({ message: "Course not found." });

    const data = {};
    for (const field of ["title", "description", "schedule"]) {
      if (req.body[field] !== undefined) {
        if (field === "title" && requiredText(req.body[field], "Course title", 200)) {
          return res.status(400).json({ message: requiredText(req.body[field], "Course title", 200) });
        }
        if (field !== "title" && typeof req.body[field] !== "string") {
          return res.status(400).json({ message: `${field} must be text.` });
        }
        data[field] = req.body[field].trim();
      }
    }
    if (!Object.keys(data).length) return res.status(400).json({ message: "Provide a course field to update." });
    const course = await prisma.course.update({ where: { id: owned.id }, data });
    return res.json({ course });
  } catch (error) {
    console.error("Update course error:", error);
    return res.status(500).json({ message: "Could not update the course." });
  }
});

router.post("/courses/:courseId/modules", async (req, res) => {
  const error = requiredText(req.body.title, "Module title", 200);
  if (error) return res.status(400).json({ message: error });
  try {
    const course = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const lastModule = await prisma.courseModule.findFirst({
      where: { courseId: course.id }, orderBy: { orderIndex: "desc" }, select: { orderIndex: true },
    });
    const module = await prisma.courseModule.create({
      data: { courseId: course.id, title: req.body.title.trim(), orderIndex: (lastModule?.orderIndex ?? -1) + 1 },
    });
    return res.status(201).json({ module });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "A module with that title already exists in this course." });
    console.error("Create module error:", error);
    return res.status(500).json({ message: "Could not create the module." });
  }
});

router.patch("/modules/:moduleId", async (req, res) => {
  const error = requiredText(req.body.title, "Module title", 200);
  if (error) return res.status(400).json({ message: error });
  try {
    const module = await findOwnedModule(req.params.moduleId, req.user.userId);
    if (!module) return res.status(404).json({ message: "Module not found." });
    const updated = await prisma.courseModule.update({
      where: { id: module.id }, data: { title: req.body.title.trim() },
    });
    return res.json({ module: updated });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "A module with that title already exists in this course." });
    console.error("Update module error:", error);
    return res.status(500).json({ message: "Could not update the module." });
  }
});

router.delete("/modules/:moduleId", async (req, res) => {
  try {
    const module = await findOwnedModule(req.params.moduleId, req.user.userId);
    if (!module) return res.status(404).json({ message: "Module not found." });
    await prisma.courseModule.delete({ where: { id: module.id } });
    return res.status(200).json({ message: "Module deleted." });
  } catch (error) {
    console.error("Delete module error:", error);
    return res.status(500).json({ message: "Could not delete the module." });
  }
});

router.post("/modules/:moduleId/lessons", async (req, res) => {
  const titleError = requiredText(req.body.title, "Lesson title", 250);
  const typeError = requiredText(req.body.type, "Lesson type", 40);
  const contentError = req.body.content !== undefined && (typeof req.body.content !== "string" || req.body.content.length > 20000) ? "Lesson content must be text and no longer than 20,000 characters." : null;
  const urlError = validateLessonMaterialUrl(req.body.resourceUrl);
  if (titleError || typeError || contentError || urlError) return res.status(400).json({ message: titleError || typeError || contentError || urlError });
  try {
    const module = await findOwnedModule(req.params.moduleId, req.user.userId);
    if (!module) return res.status(404).json({ message: "Module not found." });
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId: module.id }, orderBy: { orderIndex: "desc" }, select: { orderIndex: true },
    });
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: module.id,
        title: req.body.title.trim(),
        type: req.body.type.trim(),
        content: req.body.content?.trim() || null,
        resourceUrl: req.body.resourceUrl?.trim() || null,
        orderIndex: (lastLesson?.orderIndex ?? -1) + 1,
      },
    });
    return res.status(201).json({ lesson });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "A lesson with that title already exists in this module." });
    console.error("Create lesson error:", error);
    return res.status(500).json({ message: "Could not create the lesson." });
  }
});

router.patch("/lessons/:lessonId", async (req, res) => {
  const titleError = req.body.title === undefined ? null : requiredText(req.body.title, "Lesson title", 250);
  const typeError = req.body.type === undefined ? null : requiredText(req.body.type, "Lesson type", 40);
  const contentError = req.body.content === undefined || typeof req.body.content === "string" && req.body.content.length <= 20000 ? null : "Lesson content must be text and no longer than 20,000 characters.";
  const urlError = Object.hasOwn(req.body, "resourceUrl") ? validateLessonMaterialUrl(req.body.resourceUrl) : null;
  if (titleError || typeError || contentError || urlError) return res.status(400).json({ message: titleError || typeError || contentError || urlError });
  if (!["title", "type", "content", "resourceUrl"].some((field) => Object.hasOwn(req.body, field))) {
    return res.status(400).json({ message: "Provide lesson details or material to update." });
  }
  try {
    const lesson = await findOwnedLesson(req.params.lessonId, req.user.userId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });
    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.type !== undefined) data.type = req.body.type.trim();
    if (req.body.content !== undefined) data.content = req.body.content.trim() || null;
    if (Object.hasOwn(req.body, "resourceUrl")) data.resourceUrl = req.body.resourceUrl?.trim() || null;
    const updated = await prisma.lesson.update({ where: { id: lesson.id }, data });
    return res.json({ lesson: updated });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "A lesson with that title already exists in this module." });
    console.error("Update lesson error:", error);
    return res.status(500).json({ message: "Could not update the lesson." });
  }
});

router.delete("/lessons/:lessonId", async (req, res) => {
  try {
    const lesson = await findOwnedLesson(req.params.lessonId, req.user.userId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });
    await prisma.lesson.delete({ where: { id: lesson.id } });
    return res.status(200).json({ message: "Lesson deleted." });
  } catch (error) {
    console.error("Delete lesson error:", error);
    return res.status(500).json({ message: "Could not delete the lesson." });
  }
});


router.patch("/submissions/:submissionId/grade", async (req, res) => {
  const score = Number(req.body.score);
  const maxScore = Number(req.body.maxScore);
  const feedback = req.body.feedback;
  if (req.body.score === undefined || req.body.score === null || req.body.maxScore === undefined || req.body.maxScore === null ||
    !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
    return res.status(400).json({ message: "Enter a score from 0 up to the maximum score." });
  }
  if (feedback !== undefined && (typeof feedback !== "string" || feedback.length > 10000)) {
    return res.status(400).json({ message: "Feedback must be text and no longer than 10,000 characters." });
  }
  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: req.params.submissionId,
        assignment: { course: { instructorId: req.user.userId } },
      },
      select: { id: true, studentId: true, assignment: { select: { title: true, course: { select: { title: true } } } } },
    });
    if (!submission) return res.status(404).json({ message: "Submission not found." });

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        score,
        maxScore,
        feedback: feedback?.trim() || null,
        status: "GRADED",
        gradedAt: new Date(),
      },
      select: { id: true, score: true, maxScore: true, feedback: true, status: true, gradedAt: true },
    });
    await notifyUser(submission.studentId, {
      type: "GRADE",
      title: "Assignment graded",
      body: `${submission.assignment.title} in ${submission.assignment.course.title} has been graded.`,
      link: "/dashboard/grades",
    });
    return res.json({ submission: updated });
  } catch (error) {
    console.error("Grade submission error:", error);
    return res.status(500).json({ message: "Could not save the grade." });
  }
});

router.get("/submissions/:submissionId/file", async (req, res) => {
  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: req.params.submissionId,
        assignment: { course: { instructorId: req.user.userId } },
      },
      select: { fileUrl: true },
    });
    if (!submission?.fileUrl) return res.status(404).json({ message: "No uploaded file was found." });
    const filename = path.basename(submission.fileUrl);
    const filePath = path.join(__dirname, "..", "uploads", "submissions", filename);
    return res.download(filePath, filename, (error) => {
      if (error && !res.headersSent) {
        console.error("Download submission error:", error);
        res.status(error.statusCode === 404 ? 404 : 500).json({ message: "Could not download the submitted file." });
      }
    });
  } catch (error) {
    console.error("Fetch submission file error:", error);
    return res.status(500).json({ message: "Could not fetch the submitted file." });
  }
});

router.patch("/quizzes/:quizId/results", async (req, res) => {
  if (typeof req.body.released !== "boolean") {
    return res.status(400).json({ message: "Specify whether quiz results should be released." });
  }
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.quizId, course: { instructorId: req.user.userId } },
      select: { id: true, title: true, resultsReleased: true },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: { resultsReleased: req.body.released },
      select: { id: true, resultsReleased: true },
    });
    if (req.body.released && !quiz.resultsReleased) {
      const attempts = await prisma.quizAttempt.findMany({
        where: { quizId: quiz.id, submittedAt: { not: null } },
        select: { studentId: true },
      });
      await notifyUsers(attempts.map((attempt) => attempt.studentId), {
        type: "QUIZ_RESULT",
        title: "Quiz results released",
        body: `Results for ${quiz.title} are now available.`,
        link: "/dashboard/grades",
      });
    }
    return res.json({ quiz: updated });
  } catch (error) {
    console.error("Release quiz results error:", error);
    return res.status(500).json({ message: "Could not update quiz result release." });
  }
});

router.post("/courses/:courseId/assignments", async (req, res) => {
  const titleError = requiredText(req.body.title, "Assignment title", 250);
  const instructionsError = requiredText(req.body.instructions, "Instructions");
  const dueAt = new Date(req.body.dueAt);
  if (titleError || instructionsError) return res.status(400).json({ message: titleError || instructionsError });
  if (!req.body.dueAt || Number.isNaN(dueAt.getTime())) return res.status(400).json({ message: "A valid due date is required." });
  try {
    const course = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const assignment = await prisma.assignment.create({
      data: { courseId: course.id, title: req.body.title.trim(), instructions: req.body.instructions.trim(), dueAt },
    });
    await notifyCourseStudents(course.id, {
      type: "ASSIGNMENT",
      title: "New assignment",
      body: `${assignment.title} was added to ${course.title}.`,
      link: "/dashboard/assignments",
    });
    return res.status(201).json({ assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    return res.status(500).json({ message: "Could not create the assignment." });
  }
});

router.patch("/assignments/:assignmentId", async (req, res) => {
  const titleError = req.body.title === undefined ? null : requiredText(req.body.title, "Assignment title", 250);
  const instructionsError = req.body.instructions === undefined ? null : requiredText(req.body.instructions, "Instructions");
  if (titleError || instructionsError) return res.status(400).json({ message: titleError || instructionsError });
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.assignmentId, course: { instructorId: req.user.userId } },
      select: { id: true },
    });
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.instructions !== undefined) data.instructions = req.body.instructions.trim();
    if (req.body.dueAt !== undefined) {
      const dueAt = new Date(req.body.dueAt);
      if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ message: "A valid due date is required." });
      data.dueAt = dueAt;
    }
    if (!Object.keys(data).length) return res.status(400).json({ message: "Provide assignment fields to update." });
    const updated = await prisma.assignment.update({ where: { id: assignment.id }, data });
    return res.json({ assignment: updated });
  } catch (error) {
    console.error("Update assignment error:", error);
    return res.status(500).json({ message: "Could not update the assignment." });
  }
});

function validateMeetingUrl(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) return "Meeting link must be a valid web address.";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? null : "Meeting link must start with http:// or https://.";
  } catch {
    return "Meeting link must be a valid web address.";
  }
}

router.post("/courses/:courseId/virtual-classes", async (req, res) => {
  const titleError = requiredText(req.body.title, "Session title", 200);
  const startsAt = new Date(req.body.startsAt);
  const durationMinutes = Number(req.body.durationMinutes ?? 60);
  const urlError = validateMeetingUrl(req.body.meetingUrl);
  if (titleError || urlError) return res.status(400).json({ message: titleError || urlError });
  if (!req.body.startsAt || Number.isNaN(startsAt.getTime())) return res.status(400).json({ message: "Choose a valid session date and time." });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).json({ message: "Session duration must be between 1 and 600 minutes." });
  if (req.body.notes !== undefined && (typeof req.body.notes !== "string" || req.body.notes.length > 5000)) return res.status(400).json({ message: "Session notes must be 5,000 characters or fewer." });
  try {
    const course = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const session = await prisma.virtualClassSession.create({
      data: { courseId: course.id, title: req.body.title.trim(), startsAt, durationMinutes, meetingUrl: req.body.meetingUrl?.trim() || null, notes: req.body.notes?.trim() || null },
    });
    await notifyCourseStudents(course.id, {
      type: "VIRTUAL_CLASS",
      title: "Virtual class scheduled",
      body: `${session.title} is scheduled for ${session.startsAt.toLocaleString()}.`,
      link: "/dashboard/virtual-classes",
    });
    return res.status(201).json({ session });
  } catch (error) {
    console.error("Create virtual class error:", error);
    return res.status(500).json({ message: "Could not schedule the virtual class." });
  }
});

router.patch("/virtual-classes/:sessionId", async (req, res) => {
  const data = {};
  if (Object.hasOwn(req.body, "title")) {
    const error = requiredText(req.body.title, "Session title", 200);
    if (error) return res.status(400).json({ message: error });
    data.title = req.body.title.trim();
  }
  if (Object.hasOwn(req.body, "startsAt")) {
    const startsAt = new Date(req.body.startsAt);
    if (!req.body.startsAt || Number.isNaN(startsAt.getTime())) return res.status(400).json({ message: "Choose a valid session date and time." });
    data.startsAt = startsAt;
  }
  if (Object.hasOwn(req.body, "durationMinutes")) {
    const durationMinutes = Number(req.body.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).json({ message: "Session duration must be between 1 and 600 minutes." });
    data.durationMinutes = durationMinutes;
  }
  if (Object.hasOwn(req.body, "meetingUrl")) {
    const error = validateMeetingUrl(req.body.meetingUrl);
    if (error) return res.status(400).json({ message: error });
    data.meetingUrl = req.body.meetingUrl?.trim() || null;
  }
  if (Object.hasOwn(req.body, "notes")) {
    if (typeof req.body.notes !== "string" || req.body.notes.length > 5000) return res.status(400).json({ message: "Session notes must be 5,000 characters or fewer." });
    data.notes = req.body.notes.trim() || null;
  }
  if (!Object.keys(data).length) return res.status(400).json({ message: "Provide session details to update." });
  try {
    const session = await prisma.virtualClassSession.findFirst({
      where: { id: req.params.sessionId, course: { instructorId: req.user.userId } },
      select: { id: true },
    });
    if (!session) return res.status(404).json({ message: "Virtual class not found." });
    return res.json({ session: await prisma.virtualClassSession.update({ where: { id: session.id }, data }) });
  } catch (error) {
    console.error("Update virtual class error:", error);
    return res.status(500).json({ message: "Could not update the virtual class." });
  }
});

router.delete("/virtual-classes/:sessionId", async (req, res) => {
  try {
    const session = await prisma.virtualClassSession.findFirst({
      where: { id: req.params.sessionId, course: { instructorId: req.user.userId } },
      select: { id: true },
    });
    if (!session) return res.status(404).json({ message: "Virtual class not found." });
    await prisma.virtualClassSession.delete({ where: { id: session.id } });
    return res.json({ message: "Virtual class deleted." });
  } catch (error) {
    console.error("Delete virtual class error:", error);
    return res.status(500).json({ message: "Could not delete the virtual class." });
  }
});

router.post("/courses/:courseId/announcements", async (req, res) => {
  const titleError = requiredText(req.body.title, "Announcement title", 200);
  const bodyError = requiredText(req.body.body, "Announcement message", 10000);
  if (titleError || bodyError) return res.status(400).json({ message: titleError || bodyError });
  try {
    const course = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const announcement = await prisma.announcement.create({
      data: { courseId: course.id, authorId: req.user.userId, title: req.body.title.trim(), body: req.body.body.trim() },
    });
    await notifyCourseStudents(course.id, {
      type: "ANNOUNCEMENT",
      title: "New course announcement",
      body: announcement.title,
      link: "/dashboard/announcements",
    });
    return res.status(201).json({ announcement });
  } catch (error) {
    console.error("Create announcement error:", error);
    return res.status(500).json({ message: "Could not publish the announcement." });
  }
});

router.patch("/announcements/:announcementId", async (req, res) => {
  const data = {};
  if (Object.hasOwn(req.body, "title")) {
    const error = requiredText(req.body.title, "Announcement title", 200);
    if (error) return res.status(400).json({ message: error });
    data.title = req.body.title.trim();
  }
  if (Object.hasOwn(req.body, "body")) {
    const error = requiredText(req.body.body, "Announcement message", 10000);
    if (error) return res.status(400).json({ message: error });
    data.body = req.body.body.trim();
  }
  if (!Object.keys(data).length) return res.status(400).json({ message: "Provide a title or message to update." });
  try {
    const announcement = await prisma.announcement.findFirst({
      where: { id: req.params.announcementId, course: { instructorId: req.user.userId } },
      select: { id: true },
    });
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });
    const updated = await prisma.announcement.update({ where: { id: announcement.id }, data });
    return res.json({ announcement: updated });
  } catch (error) {
    console.error("Update announcement error:", error);
    return res.status(500).json({ message: "Could not update the announcement." });
  }
});

router.delete("/announcements/:announcementId", async (req, res) => {
  try {
    const announcement = await prisma.announcement.findFirst({
      where: { id: req.params.announcementId, course: { instructorId: req.user.userId } },
      select: { id: true },
    });
    if (!announcement) return res.status(404).json({ message: "Announcement not found." });
    await prisma.announcement.delete({ where: { id: announcement.id } });
    return res.json({ message: "Announcement deleted." });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return res.status(500).json({ message: "Could not delete the announcement." });
  }
});

router.post("/courses/:courseId/quizzes", async (req, res) => {
  const titleError = requiredText(req.body.title, "Quiz title", 250);
  const scheduledAt = new Date(req.body.scheduledAt);
  const durationMinutes = Number(req.body.durationMinutes);
  const questions = req.body.questions;
  if (titleError) return res.status(400).json({ message: titleError });
  if (!req.body.scheduledAt || Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ message: "A valid quiz date is required." });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
    return res.status(400).json({ message: "Quiz duration must be between 1 and 600 minutes." });
  }
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 100) {
    return res.status(400).json({ message: "Add between 1 and 100 questions." });
  }
  for (const question of questions) {
    if (requiredText(question.prompt, "Question prompt", 2000)) {
      return res.status(400).json({ message: "Every question needs a prompt." });
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 8 ||
      question.options.some((option) => typeof option !== "string" || !option.trim() || option.length > 500) ||
      new Set(question.options.map((option) => option.trim())).size !== question.options.length ||
      !Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 || question.correctOptionIndex >= question.options.length) {
      return res.status(400).json({ message: "Each question needs 2–8 distinct options and one correct answer." });
    }
  }
  const type = req.body.type || "QUIZ";
  if (!["QUIZ", "EXAM"].includes(type)) return res.status(400).json({ message: "Quiz type must be QUIZ or EXAM." });

  try {
    const course = await findOwnedCourse(req.params.courseId, req.user.userId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: req.body.title.trim(),
        type,
        scheduledAt,
        durationMinutes,
        questions: {
          create: questions.map((question) => ({
            prompt: question.prompt.trim(),
            options: {
              create: question.options.map((text, index) => ({
                text: text.trim(), isCorrect: index === question.correctOptionIndex,
              })),
            },
          })),
        },
      },
      select: { id: true, title: true, type: true, scheduledAt: true, durationMinutes: true },
    });
    return res.status(201).json({ quiz });
  } catch (error) {
    console.error("Create quiz error:", error);
    return res.status(500).json({ message: "Could not create the quiz." });
  }
});

module.exports = router;
