import type { ReactNode } from "react";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { ChatWidget } from "@/components/ChatWidget";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireActiveSubscription();

  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
