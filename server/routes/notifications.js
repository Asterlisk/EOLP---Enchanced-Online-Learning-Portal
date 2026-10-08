const express = require("express");
const prisma = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== "STUDENT") return res.status(403).json({ message: "Student access is required." });
  next();
});

router.get("/", async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({ where: { userId: req.user.userId, readAt: null } }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("List notifications error:", error);
    return res.status(500).json({ message: "Could not load notifications." });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.userId, readAt: null } });
    return res.json({ unreadCount });
  } catch (error) {
    console.error("Count unread notifications error:", error);
    return res.status(500).json({ message: "Could not load notification count." });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.json({ updated: result.count });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ message: "Could not mark notifications as read." });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.notificationId, userId: req.user.userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const exists = await prisma.notification.findFirst({ where: { id: req.params.notificationId, userId: req.user.userId }, select: { id: true } });
      if (!exists) return res.status(404).json({ message: "Notification not found." });
    }
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Could not mark the notification as read." });
  }
});

module.exports = router;
