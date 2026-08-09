"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react/dist/ssr";

// icon is a pre-rendered element, not a component reference — a raw
// component function isn't serializable across the server/client
// boundary (this NavBar is a Server Component), confirmed live: passing
// the icon component itself threw "Functions cannot be passed directly
// to Client Components".
type NavLink = { href: string; label: string; icon: ReactNode };

// A fixed, viewport-positioned drawer rather than an absolutely
// positioned dropdown — the previous version was `position: absolute`
// relative to the header, which put it behind page content that
// happened to establish its own stacking context further down the
// page (confirmed live: menu items became unclickable, "behind the
// background"). Fixed positioning + a high z-index sidesteps that
// entirely, since it's no longer nested inside any ancestor's stacking
// context.
export function MobileNavMenu({
  links,
  accountLink,
}: {
  links: NavLink[];
  accountLink: NavLink;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex items-center justify-center rounded-md p-2 text-muted transition-colors hover:text-foreground"
      >
        <List size={22} />
      </button>

      <div
        className={`fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 right-0 z-[101] flex w-72 max-w-[80vw] flex-col border-l border-panel-border bg-background shadow-[-12px_0_32px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-5 py-4">
          <span className="text-sm font-semibold tracking-tight">Menu</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex items-center justify-center rounded-md p-2 text-muted transition-colors hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 text-sm text-muted">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-3 transition-colors hover:bg-panel hover:text-foreground"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <Link
            href={accountLink.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-3 transition-colors hover:bg-panel hover:text-foreground"
          >
            {accountLink.icon}
            {accountLink.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
