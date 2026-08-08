import Link from "next/link";
import {
  ChartLine,
  UserFocus,
  Tag,
  UserCircle,
  TrendUp,
  Trophy,
  Newspaper,
  Star,
} from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { MobileNavMenu } from "@/components/MobileNavMenu";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: ChartLine, color: "var(--accent)" },
  { href: "/briefing", label: "Daily Brief", icon: Newspaper, color: "var(--accent-2)" },
  { href: "/stocks", label: "Stocks", icon: TrendUp, color: "var(--accent-warm)" },
  { href: "/watchlist", label: "Watchlist", icon: Star, color: "var(--accent)" },
  { href: "/top-traders", label: "Top Traders", icon: Trophy, color: "var(--accent-2)" },
  { href: "/insider-trading", label: "Insider Trading", icon: UserFocus, color: "var(--accent-warm)" },
  { href: "/pricing", label: "Pricing", icon: Tag, color: "var(--accent)" },
];

export async function NavBar() {
  const session = await auth();

  return (
    <header className="relative border-b border-panel-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo size={20} />
          DollarWatch
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Icon size={16} weight="regular" style={{ color: link.color }} />
                {link.label}
              </Link>
            );
          })}
          {session?.user ? (
            <Link
              href="/account"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <UserCircle size={16} weight="regular" />
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
        <MobileNavMenu
          links={links.map((link) => {
            const Icon = link.icon;
            return {
              href: link.href,
              label: link.label,
              icon: <Icon size={18} weight="regular" style={{ color: link.color }} />,
            };
          })}
          accountLink={
            session?.user
              ? { href: "/account", label: "Account", icon: <UserCircle size={18} weight="regular" /> }
              : { href: "/login", label: "Log in", icon: <UserCircle size={18} weight="regular" /> }
          }
        />
      </div>
    </header>
  );
}
