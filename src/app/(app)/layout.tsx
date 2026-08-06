import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatWidget } from "@/components/ChatWidget";

// Each page under this group still guards itself (dashboard, stocks,
// politicians call requireActiveSubscription; account only requires a
// session so inactive users can still view/manage billing).
// This layout must not add its own blanket subscription redirect on top —
// that would bounce inactive-subscription users away from /account before
// they can ever reach the "subscribe" prompt or delete their account.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  let showChat = false;

  if (session?.user?.id) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    showChat = subscription?.status === "active";
  }

  return (
    <>
      {children}
      {showChat && <ChatWidget />}
    </>
  );
}
