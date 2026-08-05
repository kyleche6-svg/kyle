import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { createPortalSession } from "@/app/actions/billing";
import { Panel } from "@/components/Panel";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const isActive = subscription?.status === "active";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Account</h1>

      <Panel title="Profile" className="mt-8">
        <p className="text-sm">{session.user.email}</p>
      </Panel>

      <Panel title="Subscription" className="mt-4">
        <p className="text-sm">
          Status:{" "}
          <span className={isActive ? "text-accent" : "text-muted"}>
            {subscription?.status ?? "none"}
          </span>
        </p>
        {subscription?.currentPeriodEnd && (
          <p className="mt-1 text-xs text-muted">
            Renews {subscription.currentPeriodEnd.toLocaleDateString()}
          </p>
        )}
        <div className="mt-4">
          {isActive ? (
            <form action={createPortalSession}>
              <button
                type="submit"
                className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
              >
                Manage billing
              </button>
            </form>
          ) : (
            <Link
              href="/pricing"
              className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              View plans
            </Link>
          )}
        </div>
      </Panel>

      <div className="mt-8 flex items-center gap-6">
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Log out
          </button>
        </form>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
