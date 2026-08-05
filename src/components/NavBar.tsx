import Link from "next/link";
import { auth } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/politicians", label: "Politicians" },
  { href: "/tweets", label: "Tweets" },
  { href: "/pricing", label: "Pricing" },
];

export async function NavBar() {
  const session = await auth();

  return (
    <header className="border-b border-panel-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Dollar<span className="text-accent">Watch</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {session?.user ? (
            <Link
              href="/account"
              className="transition-colors hover:text-foreground"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
