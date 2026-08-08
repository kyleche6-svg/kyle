import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const hash = await bcrypt.hash("TempPreview123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "preview-temp@dollarwatch.local" },
    update: { passwordHash: hash },
    create: { email: "preview-temp@dollarwatch.local", passwordHash: hash, emailVerified: new Date() },
  });
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { status: "active" },
    create: { userId: user.id, status: "active" },
  });
  console.log("OK", user.id);
}

main().finally(() => process.exit(0));
