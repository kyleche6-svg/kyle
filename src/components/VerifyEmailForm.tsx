"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { verifyEmailToken } from "@/app/actions/email-verification";
import { Panel } from "@/components/Panel";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailToken, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    // Guard against firing twice — React's dev Strict Mode double-invokes
    // effects, and a second submit would reuse the (by then consumed,
    // single-use) token and clobber a real success with "invalid/expired".
    if (submittedRef.current) return;
    submittedRef.current = true;
    formRef.current?.requestSubmit();
    // Auto-submit once on mount — the token is already known from the
    // emailed link, so there's nothing for the user to fill in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel className="mt-8">
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        {pending && !state && <p className="text-sm text-muted">Verifying…</p>}
        {state?.success && <p className="text-sm text-positive">{state.message}</p>}
        {state && !state.success && (
          <>
            <p className="text-sm text-red-400">{state.message}</p>
            <Link href="/account" className="text-sm text-accent">
              Back to account
            </Link>
          </>
        )}
        {state?.success && (
          <Link
            href="/dashboard"
            className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Continue to dashboard
          </Link>
        )}
      </form>
    </Panel>
  );
}
