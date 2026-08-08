"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react/dist/ssr";

// icon is a pre-rendered element, not a component reference — a raw
// component function isn't serializable across the server/client
// boundary (this NavBar is a Server Component), confirmed live: passing
// the icon component itself threw "Functions cannot be passed directly
// to Client Components".
type NavLink = { href: string; label: string; icon: ReactNode };

export function MobileNavMenu({
  links,
  accountLink,
}: {
  links: NavLink[];
  accountLink: NavLink;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex items-center justify-center rounded-md p-2 text-muted transition-colors hover:text-foreground"
      >
        {open ? <X size={22} /> : <List size={22} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-50 border-b border-panel-border bg-background px-6 py-4 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]">
          <nav className="flex flex-col gap-1 text-sm text-muted">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors hover:bg-panel hover:text-foreground"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <Link
              href={accountLink.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors hover:bg-panel hover:text-foreground"
            >
              {accountLink.icon}
              {accountLink.label}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
