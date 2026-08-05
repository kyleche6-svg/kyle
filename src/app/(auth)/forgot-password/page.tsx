"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { Panel } from "@/components/Panel";
import { TurnstileWidget } from "@/components/TurnstileWidget";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <Panel className="mt-8">
        <form action={action} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <TurnstileWidget />
          {state?.message && (
            <p className="text-xs text-muted">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </Panel>

      <p className="mt-4 text-sm text-muted">
        <Link href="/login" className="text-accent">
          Back to login
        </Link>
      </p>
    </div>
  );
}
