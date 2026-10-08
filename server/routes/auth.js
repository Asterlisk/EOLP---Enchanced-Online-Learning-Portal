const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../db");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/authMiddleware")

const router = express.Router();

router.post("/register", authenticateToken, async (req, res) => {
  try {
    const requester = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, isActive: true },
    });
    if (!requester?.isActive) {
      return res.status(401).json({ message: "This account is inactive." });
    }
    if (requester.role !== "ADMIN") {
      return res.status(403).json({ message: "Administrator access is required to create accounts." });
    }

    const { username, password } = req.body;
    const normalizedUsername = typeof username === "string" ? username.trim() : "";

    // Check that both fields were provided
    if (normalizedUsername.length < 3 || normalizedUsername.length > 80 || typeof password !== "string" || password.length < 8 || password.length > 200) {
      return res.status(400).json({
        message: "Enter a username between 3 and 80 characters and a password between 8 and 200 characters.",
      });
    }

    // Check whether the username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username is already taken.",
      });
    }

    // Hash the password before saving it
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check that both fields were provided
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }

    // Find the account by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Reject missing or inactive accounts
    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    // Compare the submitted password with the stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    // Create a signed authentication token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging in.",
    });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        notifyAssignments: true,
        notifyGrades: true,
        notifyAnnouncements: true,
        notifyVirtualClasses: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User account not found or inactive.",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Fetch user error:", error);

    return res.status(500).json({
      message: "Something went wrong while fetching user information.",
    });
  }
});

router.patch("/password", authenticateToken, async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 200) {
    return res.status(400).json({ message: "Enter your current password and a new password between 8 and 200 characters." });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, passwordHash: true, isActive: true } });
    if (!user?.isActive) return res.status(401).json({ message: "User account not found or inactive." });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: "Current password is incorrect." });
    if (await bcrypt.compare(newPassword, user.passwordHash)) return res.status(400).json({ message: "Choose a new password that differs from your current password." });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Could not update the password." });
  }
});

router.patch("/notification-preferences", authenticateToken, async (req, res) => {
  const preferenceFields = {
    assignments: "notifyAssignments",
    grades: "notifyGrades",
    announcements: "notifyAnnouncements",
    virtualClasses: "notifyVirtualClasses",
  };
  const entries = Object.entries(req.body || {});
  if (!entries.length || entries.some(([key, value]) => !preferenceFields[key] || typeof value !== "boolean")) {
    return res.status(400).json({ message: "Choose valid notification preferences." });
  }
  const data = Object.fromEntries(entries.map(([key, value]) => [preferenceFields[key], value]));
  try {
    const result = await prisma.user.updateMany({ where: { id: req.user.userId, isActive: true }, data });
    if (!result.count) return res.status(401).json({ message: "User account not found or inactive." });
    return res.json({ preferences: Object.fromEntries(entries) });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return res.status(500).json({ message: "Could not save notification preferences." });
  }
});

module.exports = router;
