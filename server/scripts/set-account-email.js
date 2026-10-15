const prisma = require("../db");

async function main() {
  const username = process.argv[2]?.trim();
  const email = process.argv[3]?.trim().toLowerCase();
  if (!username || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Usage: npm run admin:set-email -- <username> <email>");
  }
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!user) throw new Error(`No account exists for username: ${username}`);
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  await prisma.loginOtp.deleteMany({ where: { userId: user.id } });
  console.log(`OTP email updated for ${user.username}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
