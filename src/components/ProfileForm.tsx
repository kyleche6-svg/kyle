"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";

export function ProfileForm({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <div>
        <label htmlFor="name" className="text-xs text-muted">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={name ?? ""}
          placeholder="Not set"
          className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-xs text-muted">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="Not set"
          className="mt-1 w-full rounded-md border border-panel-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {state?.message && (
        <p className={`text-xs ${state.success ? "text-positive" : "text-red-400"}`}>
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md border border-panel-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
