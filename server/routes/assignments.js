const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(authenticateToken);

// GET /api/assignments
// All assignments across the student's enrolled courses, with their own
// submission (if any) attached so the frontend can derive status.
router.get("/", async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        course: {
          isActive: true,
          enrollments: { some: { studentId: req.user.userId } },
        },
      },
      include: {
        course: { select: { id: true, title: true, code: true, isActive: true } },
        submissions: {
          where: { studentId: req.user.userId },
        },
      },
      orderBy: { dueAt: "asc" },
    });

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error("List assignments error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching assignments." });
  }
});

// GET /api/assignments/:id
router.get("/:id", async (req, res) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id, course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
      include: {
        course: { select: { id: true, title: true, code: true, isActive: true } },
        submissions: { where: { studentId: req.user.userId } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    return res.status(200).json({ assignment });
  } catch (error) {
    console.error("Fetch assignment error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching the assignment." });
  }
});

// POST /api/assignments/:id/submit
// Accepts multipart/form-data: an optional "file" field plus an optional
// "textResponse" field. At least one of the two is required.
router.post("/:id/submit", upload.single("file"), async (req, res) => {
  try {
    const { textResponse } = req.body;

    if (!req.file && !textResponse) {
      return res.status(400).json({
        message: "Submit a file, a text response, or both.",
      });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id, course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    const isLate = new Date() > assignment.dueAt;

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.user.userId,
        },
      },
      update: {
        fileUrl: req.file ? `/uploads/submissions/${req.file.filename}` : undefined,
        textResponse: textResponse || undefined,
        submittedAt: new Date(),
        status: isLate ? "LATE" : "SUBMITTED",
      },
      create: {
        assignmentId: assignment.id,
        studentId: req.user.userId,
        fileUrl: req.file ? `/uploads/submissions/${req.file.filename}` : null,
        textResponse: textResponse || null,
        status: isLate ? "LATE" : "SUBMITTED",
      },
    });

    return res.status(200).json({
      message: "Submission received.",
      submission,
    });
  } catch (error) {
    console.error("Submit assignment error:", error);
    return res.status(500).json({ message: "Something went wrong while submitting." });
  }
});

module.exports = router;
