const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const prisma = require("../db");

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) throw new Error("Usage: npm run admin:reset-password -- <admin-username>");

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true, isActive: true },
  });
  if (!user || user.role !== "ADMIN") throw new Error(`No administrator account exists for username: ${username}`);
  if (!user.isActive) throw new Error("This administrator account is inactive. Activate it before resetting its password.");

  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(temporaryPassword, 10) },
  });

  console.log(`Password reset for administrator: ${user.username}`);
  console.log(`Temporary password (save it now): ${temporaryPassword}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
