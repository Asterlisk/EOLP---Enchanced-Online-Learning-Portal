const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

function serializeQuizSummary(quiz, attempt) {
  return {
    id: quiz.id,
    title: quiz.title,
    type: quiz.type,
    course: quiz.course.title,
    courseId: quiz.course.id,
    schedule: quiz.scheduledAt,
    durationMinutes: quiz.durationMinutes,
    resultsReleased: quiz.resultsReleased,
    status: attempt
      ? attempt.submittedAt
        ? quiz.resultsReleased
          ? "Graded"
          : "Submitted"
        : "In Progress"
      : "Not Started",
    submittedAt: attempt?.submittedAt || null,
    score:
      attempt && attempt.submittedAt && quiz.resultsReleased
        ? `${attempt.score}/${attempt.maxScore}`
        : null,
  };
}

// GET /api/quizzes
router.get("/", async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        course: {
          isActive: true,
          enrollments: { some: { studentId: req.user.userId } },
        },
      },
      include: {
        course: { select: { id: true, title: true } },
        attempts: { where: { studentId: req.user.userId } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const payload = quizzes.map((q) => serializeQuizSummary(q, q.attempts[0]));
    return res.status(200).json({ quizzes: payload });
  } catch (error) {
    console.error("List quizzes error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching assessments." });
  }
});

// GET /api/quizzes/:id
// Questions are returned WITHOUT the isCorrect flag so answers can never
// leak to the client before grading.
router.get("/:id", async (req, res) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          include: { options: { select: { id: true, text: true } } },
        },
        attempts: { where: { studentId: req.user.userId } },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const existingAttempt = quiz.attempts[0] || null;

    return res.status(200).json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        course: quiz.course.title,
        durationMinutes: quiz.durationMinutes,
        resultsReleased: quiz.resultsReleased,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
        })),
      },
      attempt: existingAttempt && {
        id: existingAttempt.id,
        submittedAt: existingAttempt.submittedAt,
        score:
          existingAttempt.submittedAt && quiz.resultsReleased
            ? existingAttempt.score
            : null,
        maxScore:
          existingAttempt.submittedAt && quiz.resultsReleased
            ? existingAttempt.maxScore
            : null,
      },
    });
  } catch (error) {
    console.error("Fetch quiz error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching the assessment." });
  }
});

// POST /api/quizzes/:id/submit
// Body: { answers: [{ questionId, selectedOptionId }] }
router.post("/:id/submit", async (req, res) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "At least one answer is required." });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
      include: { questions: { include: { options: true } } },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const existing = await prisma.quizAttempt.findUnique({
      where: {
        quizId_studentId: { quizId: quiz.id, studentId: req.user.userId },
      },
    });

    if (existing?.submittedAt) {
      return res.status(409).json({ message: "You've already submitted this assessment." });
    }

    // Auto-grade: 1 point per question with a matching correct option.
    let score = 0;
    const maxScore = quiz.questions.length;

    const answerRows = answers.map(({ questionId, selectedOptionId }) => {
      const question = quiz.questions.find((q) => q.id === questionId);
      const selected = question?.options.find((o) => o.id === selectedOptionId);
      if (selected?.isCorrect) score += 1;
      return { questionId, selectedOptionId: selectedOptionId || null };
    });

    const attempt = await prisma.quizAttempt.upsert({
      where: {
        quizId_studentId: { quizId: quiz.id, studentId: req.user.userId },
      },
      update: {
        submittedAt: new Date(),
        score,
        maxScore,
        answers: {
          deleteMany: {},
          create: answerRows,
        },
      },
      create: {
        quizId: quiz.id,
        studentId: req.user.userId,
        submittedAt: new Date(),
        score,
        maxScore,
        answers: { create: answerRows },
      },
    });

    return res.status(200).json({
      message: "Assessment submitted.",
      attemptId: attempt.id,
      // Score is stored immediately but only surfaced to the student
      // once quiz.resultsReleased is true (see GET /:id).
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    return res.status(500).json({ message: "Something went wrong while submitting." });
  }
});

module.exports = router;
