"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { verifyTwoFactorLogin } from "@/app/actions/two-factor";
import { Panel } from "@/components/Panel";
import { TurnstileWidget } from "@/components/TurnstileWidget";

function TwoFactorStep() {
  const [state, action, pending] = useActionState(verifyTwoFactorLogin, undefined);

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold">Enter your code</h1>
      <p className="mt-1 text-sm text-muted">
        Open your authenticator app and enter the 6-digit code for DollarWatch.
      </p>

      <Panel className="mt-8">
        <form action={action} className="flex flex-col gap-4">
          <div>
            <label htmlFor="code" className="text-sm text-muted">
              Authentication code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-accent"
            />
          </div>
          {state?.message && <p className="text-xs text-red-400">{state.message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Verify"}
          </button>
        </form>
      </Panel>
    </div>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  if (state?.requiresTwoFactor) {
    return <TwoFactorStep />;
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold">Log in</h1>

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
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm text-muted">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-accent">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <TurnstileWidget />
          {state?.message && (
            <p className="text-xs text-red-400">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>
      </Panel>

      <p className="mt-4 text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent">
          Sign up
        </Link>
      </p>
    </div>
  );
}
