const jwt = require("jsonwebtoken");
const prisma = require("../db");

async function authenticateToken(req, res, next) {
  // Get the Authorization header
    const authHeader = req.headers.authorization;

  // Expected format: Bearer <token>
    const token = authHeader && authHeader.split(" ")[1];

if (!token) {
    return res.status(401).json({
        message: "Authentication required.",
    });
}

try {
    // Verify the token using our secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user?.isActive) {
      return res.status(401).json({ message: "User account not found or inactive." });
    }

    // Use the current database role so account changes apply to existing sessions.
    req.user = { userId: user.id, role: user.role };
    return next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError" && error.name !== "NotBeforeError") {
      console.error("Authentication lookup error:", error);
      return res.status(500).json({ message: "Could not verify your account." });
    }
    return res.status(401).json({
    message: "Invalid or expired token.",
    });
}
}

module.exports = authenticateToken;
