import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "preview-temp@dollarwatch.local" },
    include: { subscription: true },
  });
  console.log(JSON.stringify(user, null, 2));
}

main().finally(() => process.exit(0));
