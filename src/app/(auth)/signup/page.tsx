"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { Panel } from "@/components/Panel";
import { TurnstileWidget } from "@/components/TurnstileWidget";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        No subscription needed yet — you can subscribe from the pricing page
        after signing up.
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
            {state?.errors?.email && (
              <p className="mt-1 text-xs text-red-400">
                {state.errors.email[0]}
              </p>
            )}
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
            {state?.errors?.password && (
              <p className="mt-1 text-xs text-red-400">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          <TurnstileWidget />
          {state?.message && (
            <p className="text-xs text-red-400">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
      </Panel>

      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}
