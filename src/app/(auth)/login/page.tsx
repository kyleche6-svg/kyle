"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Panel } from "@/components/Panel";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

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
            <label htmlFor="password" className="text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          {state?.message && (
            <p className="text-xs text-red-400">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
