"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/password-reset";
import { Panel } from "@/components/Panel";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <Panel className="mt-8">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="password" className="text-sm text-muted">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
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
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </Panel>
  );
}
