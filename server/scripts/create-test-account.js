const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const prisma = require("../db");

async function main() {
  const username = (process.argv[2] || "testadmin02").trim();
  if (username.length < 3 || username.length > 80) {
    throw new Error("Username must be between 3 and 80 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) throw new Error(`An account named ${username} already exists. No changes were made.`);

  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  await prisma.user.create({
    data: { username, passwordHash, role: "STUDENT", isActive: true },
    select: { id: true },
  });

  console.log(`Created active student test account: ${username}`);
  console.log(`Temporary password (save this now): ${temporaryPassword}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
