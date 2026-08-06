"use client";

import { useTransition } from "react";
import { X } from "@phosphor-icons/react";

export function RemoveButton({ action, label = "Remove" }: { action: () => Promise<void>; label?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => action())}
      disabled={pending}
      aria-label={label}
      className="text-muted transition-colors hover:text-negative disabled:opacity-50"
    >
      <X size={14} />
    </button>
  );
}
