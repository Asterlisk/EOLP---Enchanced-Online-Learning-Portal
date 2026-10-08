const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  if (req.user.role !== "STUDENT") return res.status(403).json({ message: "Student access is required." });
  try {
    const announcements = await prisma.announcement.findMany({
      where: { course: { isActive: true, enrollments: { some: { studentId: req.user.userId } } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, body: true, createdAt: true,
        course: { select: { id: true, code: true, title: true } },
        author: { select: { username: true } },
      },
    });
    return res.json({ announcements });
  } catch (error) {
    console.error("List announcements error:", error);
    return res.status(500).json({ message: "Could not load announcements." });
  }
});

module.exports = router;
