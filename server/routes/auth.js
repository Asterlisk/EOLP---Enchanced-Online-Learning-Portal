const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../db");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/authMiddleware")
const crypto = require("node:crypto");
const { sendLoginCode } = require("../services/email");

const router = express.Router();
const hashOtp = (code) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(code).digest("hex");

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

    const { username, password, email, role } = req.body;
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Check that both fields were provided
    if (normalizedUsername.length < 3 || normalizedUsername.length > 80 || typeof password !== "string" || password.length < 8 || password.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254 || !["STUDENT", "PROFESSOR", "ADMIN"].includes(role)) {
      return res.status(400).json({
        message: "Enter a valid username, email, password, and account role.",
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
        email: normalizedEmail,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "The username or email address is already in use." });
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the account.",
    });
  }
});

function createSession(user) {
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

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

    const adminOtpEmail = process.env.ADMIN_OTP_EMAIL?.trim().toLowerCase();
    const otpEmail = user.role === "ADMIN" ? adminOtpEmail : user.email;
    if (!otpEmail) {
      const message = user.role === "ADMIN"
        ? "Admin OTP email delivery is not configured. Contact the server administrator."
        : "This account needs an email address for OTP sign-in. Ask an administrator to add one.";
      return res.status(400).json({ message });
    }

    const previousOtp = await prisma.loginOtp.findUnique({ where: { userId: user.id } });
    if (previousOtp && Date.now() - previousOtp.createdAt.getTime() < 60_000) {
      return res.status(429).json({ message: "A sign-in code was sent recently. Please wait a minute before requesting another." });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = hashOtp(code);
    await prisma.loginOtp.upsert({
      where: { userId: user.id },
      create: { userId: user.id, codeHash, expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0 },
      update: { codeHash, expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0, createdAt: new Date() },
    });
    try {
      await sendLoginCode({ to: otpEmail, code });
    } catch (emailError) {
      await prisma.loginOtp.deleteMany({ where: { userId: user.id } });
      console.error("OTP email delivery error:", emailError);
      return res.status(503).json({ message: "Could not send your sign-in code. Please contact an administrator." });
    }

    return res.status(200).json({ message: "A sign-in code was sent to your email.", requiresOtp: true });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging in.",
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username : "";
  const code = typeof req.body.code === "string" ? req.body.code : "";
  if (!username || !/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter your username and six-digit sign-in code." });
  try {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, role: true, isActive: true } });
    if (!user?.isActive) return res.status(401).json({ message: "The sign-in code is invalid or expired." });
    const challenge = await prisma.loginOtp.findUnique({ where: { userId: user.id } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
      if (challenge) await prisma.loginOtp.deleteMany({ where: { userId: user.id } });
      return res.status(401).json({ message: "The sign-in code is invalid or expired. Sign in again to request a new code." });
    }
    const submittedHash = Buffer.from(hashOtp(code), "hex");
    const storedHash = Buffer.from(challenge.codeHash, "hex");
    const valid = submittedHash.length === storedHash.length && crypto.timingSafeEqual(submittedHash, storedHash);
    if (!valid) {
      const attempts = challenge.attempts + 1;
      if (attempts >= 5) await prisma.loginOtp.deleteMany({ where: { userId: user.id } });
      else await prisma.loginOtp.update({ where: { userId: user.id }, data: { attempts } });
      return res.status(401).json({ message: attempts >= 5 ? "Too many incorrect codes. Sign in again to request a new one." : "The sign-in code is incorrect." });
    }
    await prisma.loginOtp.deleteMany({ where: { userId: user.id } });
    return res.json({ message: "Login successful.", ...createSession(user) });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Something went wrong while verifying the sign-in code." });
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

