"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/app/actions/email-verification";

export function EmailVerificationBanner() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await resendVerificationEmail();
            setMessage(result?.message ?? null);
          })
        }
        disabled={pending}
        className="rounded-full border border-panel-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
    </div>
  );
}
