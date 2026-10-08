const prisma = require("../db");

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npm run admin:promote -- <existing-username>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, role: true } });
  if (!user) throw new Error(`No account exists for username: ${username}`);
  if (user.role === "ADMIN") {
    console.log(`${username} is already an administrator.`);
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${username} now has administrator access. Sign out and sign in again to refresh the session.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
