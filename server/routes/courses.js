const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

function serializeCourse(course) {
  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      resourceUrl: lesson.resourceUrl,
      completed: lesson.progress.length > 0,
      completedAt: lesson.progress[0]?.completedAt || null,
    })),
  }));
  const lessons = modules.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const totalModules = modules.length;
  const completedModules = modules.filter((module) =>
    module.lessons.length > 0 && module.lessons.every((lesson) => lesson.completed)
  ).length;

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description,
    schedule: course.schedule,
    instructor: course.instructor,
    completion: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
    status: "Ongoing",
    completedLessons,
    totalLessons: lessons.length,
    completedModules,
    totalModules,
    modules,
    announcements: course.announcements || [],
  };
}

const courseContentInclude = (studentId) => ({
  instructor: { select: { username: true } },
  announcements: {
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  },
  modules: {
    orderBy: { orderIndex: "asc" },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        include: {
          progress: {
            where: { studentId },
            select: { completedAt: true },
          },
        },
      },
    },
  },
});

// GET /api/courses — courses enrolled for the authenticated student.
router.get("/", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { isActive: true, enrollments: { some: { studentId: req.user.userId } } },
      include: courseContentInclude(req.user.userId),
      orderBy: { code: "asc" },
    });
    return res.status(200).json({
      courses: courses.map((course) => serializeCourse(course)),
    });
  } catch (error) {
    console.error("List courses error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching courses." });
  }
});

// POST /api/courses/:courseId/lessons/:lessonId/progress — mark an enrolled lesson complete.
router.post("/:courseId/lessons/:lessonId/progress", async (req, res) => {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: req.params.lessonId,
        module: { courseId: req.params.courseId, course: { isActive: true } },
      },
      select: { id: true },
    });
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user.userId,
          courseId: req.params.courseId,
        },
      },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course." });

    const progress = await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId: req.user.userId, lessonId: lesson.id },
      },
      update: {},
      create: { studentId: req.user.userId, lessonId: lesson.id },
    });
    return res.status(200).json({ completed: true, completedAt: progress.completedAt });
  } catch (error) {
    console.error("Mark lesson complete error:", error);
    return res.status(500).json({ message: "Something went wrong while saving lesson progress." });
  }
});

// DELETE /api/courses/:courseId/lessons/:lessonId/progress — reopen a lesson.
router.delete("/:courseId/lessons/:lessonId/progress", async (req, res) => {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: req.params.lessonId,
        module: { courseId: req.params.courseId, course: { isActive: true } },
      },
      select: { id: true },
    });
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user.userId,
          courseId: req.params.courseId,
        },
      },
      select: { id: true },
    });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course." });

    await prisma.lessonProgress.deleteMany({
      where: { studentId: req.user.userId, lessonId: lesson.id },
    });
    return res.status(200).json({ completed: false });
  } catch (error) {
    console.error("Reopen lesson error:", error);
    return res.status(500).json({ message: "Something went wrong while saving lesson progress." });
  }
});

// GET /api/courses/:id — one enrolled course.
router.get("/:id", async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        enrollments: { some: { studentId: req.user.userId } },
      },
      include: courseContentInclude(req.user.userId),
    });
    if (!course) return res.status(404).json({ message: "Course not found." });
    return res.status(200).json({ course: serializeCourse(course) });
  } catch (error) {
    console.error("Fetch course error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching the course." });
  }
});

module.exports = router;
