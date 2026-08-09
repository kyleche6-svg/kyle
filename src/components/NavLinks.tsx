"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLink = { href: string; label: string; icon: ReactNode };

// Active-route indicator — a thin accent underline plus a brighter
// label, so the nav reflects where you actually are instead of every
// link looking equally (un)selected regardless of the current page.
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex items-center gap-1.5 py-4 transition-colors ${
              active ? "text-foreground" : "hover:text-foreground"
            }`}
          >
            {link.icon}
            {link.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </>
  );
}
