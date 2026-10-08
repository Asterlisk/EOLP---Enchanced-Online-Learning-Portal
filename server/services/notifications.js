const prisma = require("../db");

async function notifyUsers(userIds, notification) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  try {
    const preferenceField = {
      ASSIGNMENT: "notifyAssignments",
      GRADE: "notifyGrades",
      QUIZ_RESULT: "notifyGrades",
      ANNOUNCEMENT: "notifyAnnouncements",
      VIRTUAL_CLASS: "notifyVirtualClasses",
    }[notification.type];
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true, notifyAssignments: true, notifyGrades: true, notifyAnnouncements: true, notifyVirtualClasses: true },
    });
    const recipients = preferenceField ? users.filter((user) => user[preferenceField]) : users;
    if (!recipients.length) return;
    await prisma.notification.createMany({ data: recipients.map((user) => ({ userId: user.id, ...notification })) });
  } catch (error) {
    console.error("Create notifications error:", error);
  }
}

async function notifyCourseStudents(courseId, notification) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, course: { isActive: true }, student: { isActive: true } },
      select: { studentId: true },
    });
    await notifyUsers(enrollments.map((enrollment) => enrollment.studentId), notification);
  } catch (error) {
    console.error("Find notification recipients error:", error);
  }
}

async function notifyUser(userId, notification) {
  await notifyUsers([userId], notification);
}

module.exports = { notifyCourseStudents, notifyUser, notifyUsers };
