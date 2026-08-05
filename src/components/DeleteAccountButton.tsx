"use client";

import { deleteAccount } from "@/app/actions/auth";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          "Delete your account? This cancels any active subscription and permanently deletes your data. This cannot be undone.",
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="text-sm text-red-400 transition-colors hover:text-red-300"
      >
        Delete account
      </button>
    </form>
  );
}
