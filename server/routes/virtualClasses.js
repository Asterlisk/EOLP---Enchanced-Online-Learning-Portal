const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  if (req.user.role !== "STUDENT") return res.status(403).json({ message: "Student access is required." });
  try {
    const sessions = await prisma.virtualClassSession.findMany({
      where: { course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
      orderBy: { startsAt: "asc" },
      select: {
        id: true, title: true, startsAt: true, durationMinutes: true, meetingUrl: true, notes: true,
        course: { select: { id: true, code: true, title: true, instructor: { select: { username: true } } } },
      },
    });
    return res.json({ sessions });
  } catch (error) {
    console.error("List virtual classes error:", error);
    return res.status(500).json({ message: "Could not load virtual classes." });
  }
});

module.exports = router;
