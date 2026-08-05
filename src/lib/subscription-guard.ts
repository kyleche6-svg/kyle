import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireActiveSubscription() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (subscription?.status !== "active") {
    redirect("/pricing");
  }

  return { userId: session.user.id, subscription };
}
