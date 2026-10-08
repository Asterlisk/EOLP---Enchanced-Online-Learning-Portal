const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
const validRoles = new Set(["STUDENT", "PROFESSOR", "ADMIN"]);
const safeUserFields = { id: true, username: true, role: true, isActive: true, createdAt: true };

async function requireActiveAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user?.isActive) return res.status(401).json({ message: "This account is inactive." });
    if (user.role !== "ADMIN") return res.status(403).json({ message: "Administrator access is required." });
    req.admin = user;
    return next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ message: "Could not verify administrator access." });
  }
}

router.use(authenticateToken, requireActiveAdmin);

router.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: safeUserFields,
      orderBy: [{ role: "asc" }, { username: "asc" }],
    });
    return res.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ message: "Could not load user accounts." });
  }
});

router.post("/users", async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = req.body.role;
  if (username.length < 3 || username.length > 80) {
    return res.status(400).json({ message: "Username must be between 3 and 80 characters." });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ message: "Temporary password must be between 8 and 200 characters." });
  }
  if (!validRoles.has(role)) return res.status(400).json({ message: "Choose a valid account role." });

  try {
    const user = await prisma.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, 10), role },
      select: safeUserFields,
    });
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "That username is already in use." });
    console.error("Create user error:", error);
    return res.status(500).json({ message: "Could not create the account." });
  }
});

router.post("/users/:userId/reset-password", async (req, res) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, username: true, isActive: true },
    });
    if (!target) return res.status(404).json({ message: "Account not found." });
    if (!target.isActive) return res.status(400).json({ message: "Activate this account before resetting its password." });

    const temporaryPassword = crypto.randomBytes(24).toString("base64url");
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(temporaryPassword, 10) },
    });
    return res.json({ username: target.username, temporaryPassword });
  } catch (error) {
    console.error("Reset user password error:", error);
    return res.status(500).json({ message: "Could not reset the account password." });
  }
});

router.patch("/users/:userId", async (req, res) => {
  const data = {};
  if (Object.hasOwn(req.body, "role")) {
    if (!validRoles.has(req.body.role)) return res.status(400).json({ message: "Choose a valid account role." });
    data.role = req.body.role;
  }
  if (Object.hasOwn(req.body, "isActive")) {
    if (typeof req.body.isActive !== "boolean") return res.status(400).json({ message: "Account status must be active or inactive." });
    data.isActive = req.body.isActive;
  }
  if (!Object.keys(data).length) return res.status(400).json({ message: "No account changes were provided." });
  if (req.params.userId === req.admin.id && (data.role && data.role !== "ADMIN" || data.isActive === false)) {
    return res.status(400).json({ message: "You cannot remove your own administrator access or deactivate your account." });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.userId }, select: safeUserFields });
    if (!target) return res.status(404).json({ message: "Account not found." });
    const removesActiveAdmin = target.role === "ADMIN" && target.isActive && (data.role && data.role !== "ADMIN" || data.isActive === false);
    if (removesActiveAdmin) {
      const activeAdminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdminCount <= 1) return res.status(400).json({ message: "At least one active administrator must remain." });
    }
    const user = await prisma.user.update({ where: { id: target.id }, data, select: safeUserFields });
    return res.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Could not update the account." });
  }
});

const adminCourseFields = {
  id: true, code: true, title: true, description: true, schedule: true, isActive: true,
  instructor: { select: { id: true, username: true } },
  enrollments: { select: { student: { select: { id: true, username: true } } } },
  _count: { select: { enrollments: true, modules: true, assignments: true, quizzes: true, announcements: true, virtualClasses: true } },
};

router.get("/courses", async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({ select: adminCourseFields, orderBy: { code: "asc" } });
    return res.json({ courses });
  } catch (error) {
    console.error("List admin courses error:", error);
    return res.status(500).json({ message: "Could not load courses." });
  }
});

router.post("/courses", async (req, res) => {
  const body = req.body || {};
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!code || code.length > 32 || !title || title.length > 200) return res.status(400).json({ message: "Enter a course code (max 32 characters) and title (max 200 characters)." });
  let instructor;
  try {
    instructor = await prisma.user.findFirst({ where: { id: body.instructorId, role: "PROFESSOR", isActive: true }, select: { id: true } });
  } catch (error) {
    console.error("Validate instructor error:", error);
    return res.status(500).json({ message: "Could not validate the selected professor." });
  }
  if (!instructor) return res.status(400).json({ message: "Select an active professor to teach this course." });
  try {
    const course = await prisma.course.create({
      data: { code, title, description: typeof body.description === "string" ? body.description.trim() || null : null, schedule: typeof body.schedule === "string" ? body.schedule.trim() || null : null, instructorId: instructor.id },
      select: adminCourseFields,
    });
    return res.status(201).json({ course });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "That course code is already in use." });
    console.error("Create admin course error:", error);
    return res.status(500).json({ message: "Could not create the course." });
  }
});

router.patch("/courses/:courseId", async (req, res) => {
  const body = req.body || {};
  const data = {};
  for (const [key, maxLength] of [["code", 32], ["title", 200], ["description", 10000], ["schedule", 200]]) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== "string" || body[key].length > maxLength) return res.status(400).json({ message: `Invalid ${key}.` });
    data[key] = body[key].trim() || null;
    if (key === "code") data[key] = data[key]?.toUpperCase();
    if ((key === "code" || key === "title") && !data[key]) return res.status(400).json({ message: `Course ${key} is required.` });
  }
  if (Object.hasOwn(body, "instructorId")) {
    let instructor;
    try {
      instructor = await prisma.user.findFirst({ where: { id: body.instructorId, role: "PROFESSOR", isActive: true }, select: { id: true } });
    } catch (error) {
      console.error("Validate instructor error:", error);
      return res.status(500).json({ message: "Could not validate the selected professor." });
    }
    if (!instructor) return res.status(400).json({ message: "Select an active professor to teach this course." });
    data.instructorId = instructor.id;
  }
  if (Object.hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") return res.status(400).json({ message: "Course status must be active or inactive." });
    data.isActive = body.isActive;
  }
  if (!Object.keys(data).length) return res.status(400).json({ message: "No course changes were provided." });
  try {
    const course = await prisma.course.update({ where: { id: req.params.courseId }, data, select: adminCourseFields });
    return res.json({ course });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Course not found." });
    if (error.code === "P2002") return res.status(409).json({ message: "That course code is already in use." });
    console.error("Update admin course error:", error);
    return res.status(500).json({ message: "Could not update the course." });
  }
});

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      select: { id: true, _count: { select: { enrollments: true, modules: true, assignments: true, quizzes: true, announcements: true, virtualClasses: true } } },
    });
    if (!course) return res.status(404).json({ message: "Course not found." });
    const { enrollments, modules, assignments, quizzes, announcements, virtualClasses } = course._count;
    if (enrollments || modules || assignments || quizzes || announcements || virtualClasses) {
      return res.status(409).json({ message: "This course has enrollments or learning content. Deactivate it instead to preserve student records." });
    }
    await prisma.course.delete({ where: { id: course.id } });
    return res.json({ message: "Course deleted." });
  } catch (error) {
    console.error("Delete admin course error:", error);
    return res.status(500).json({ message: "Could not delete the course." });
  }
});

router.post("/courses/:courseId/enrollments", async (req, res) => {
  const body = req.body || {};
  try {
    const [course, student] = await Promise.all([
      prisma.course.findUnique({ where: { id: req.params.courseId }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: body.studentId, role: "STUDENT", isActive: true }, select: { id: true, username: true } }),
    ]);
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!student) return res.status(400).json({ message: "Select an active student account." });
    const enrollment = await prisma.enrollment.create({ data: { courseId: course.id, studentId: student.id } });
    return res.status(201).json({ enrollment: { id: enrollment.id, student } });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "That student is already enrolled in this course." });
    console.error("Enroll student error:", error);
    return res.status(500).json({ message: "Could not enroll the student." });
  }
});

router.delete("/courses/:courseId/enrollments/:studentId", async (req, res) => {
  try {
    const result = await prisma.enrollment.deleteMany({ where: { courseId: req.params.courseId, studentId: req.params.studentId } });
    if (!result.count) return res.status(404).json({ message: "Enrollment not found." });
    return res.json({ message: "Student removed from the course." });
  } catch (error) {
    console.error("Remove course enrollment error:", error);
    return res.status(500).json({ message: "Could not remove the student from this course." });
  }
});

module.exports = router;
