"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { startTwoFactorSetup, confirmTwoFactorSetup, disableTwoFactor } from "@/app/actions/two-factor";
import { Panel } from "@/components/Panel";

function EnableFlow({ onEnabled }: { onEnabled: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [starting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(confirmTwoFactorSetup, undefined);

  useEffect(() => {
    if (state?.success) onEnabled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  if (!setup) {
    return (
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await startTwoFactorSetup();
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setSetup(result);
          })
        }
        disabled={starting}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {starting ? "Generating…" : "Enable two-factor authentication"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy, etc.),
        then enter the 6-digit code it generates.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={setup.qrCodeDataUrl}
        alt="Two-factor authentication QR code"
        width={180}
        height={180}
        className="rounded-md border border-panel-border bg-white p-2"
      />
      <p className="text-xs text-muted">
        Can&apos;t scan? Enter this key manually: <span className="font-mono text-foreground">{setup.secret}</span>
      </p>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="secret" value={setup.secret} />
        <input
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="6-digit code"
          required
          className="w-full max-w-[10rem] rounded-md border border-panel-border bg-background px-3 py-2 text-center font-mono text-sm outline-none focus:border-accent"
        />
        {state?.message && !state.success && <p className="text-xs text-red-400">{state.message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Confirming…" : "Confirm and enable"}
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function DisableFlow({ onDisabled }: { onDisabled: () => void }) {
  const [state, action, pending] = useActionState(disableTwoFactor, undefined);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.message === "Two-factor authentication has been disabled.") onDisabled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.message]);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-panel-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
      >
        Disable two-factor authentication
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="disable-password" className="text-sm text-muted">
        Confirm your password to disable 2FA
      </label>
      <input
        id="disable-password"
        name="password"
        type="password"
        required
        className="w-full max-w-xs rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {state?.message && <p className="text-xs text-red-400">{state.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-negative px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Disabling…" : "Confirm disable"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-panel-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TwoFactorSetup({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);

  return (
    <Panel title="Two-factor authentication" className="mt-4">
      <p className="text-sm text-muted">
        {enabled
          ? "Two-factor authentication is on. You'll need a code from your authenticator app to log in."
          : "Add an authenticator-app code requirement on top of your password for extra login security."}
      </p>
      <div className="mt-4">
        {enabled ? (
          <DisableFlow onDisabled={() => setEnabled(false)} />
        ) : (
          <EnableFlow onEnabled={() => setEnabled(true)} />
        )}
      </div>
    </Panel>
  );
}
