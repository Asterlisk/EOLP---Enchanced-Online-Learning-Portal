const express = require("express");
const prisma = require("./db");
const authRoutes = require("./routes/auth");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/admin", require("./routes/admin"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/professor", require("./routes/professor"));
app.use("/api/assignments", require("./routes/assignments"));
app.use("/api/quizzes", require("./routes/quizzes"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/virtual-classes", require("./routes/virtualClasses"));
app.use("/api/notifications", require("./routes/notifications"));


app.get("/", (req, res) => {
  res.send("EOLP backend is running!");
});

app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "success",
      message: "Connected to the EOLP database!",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
server.on("error", (error) => {
  console.error(`EOLP server listener error on port ${PORT}:`, error);
  process.exitCode = 1;
});
