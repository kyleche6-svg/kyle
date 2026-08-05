import Link from "next/link";

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/disclaimer", label: "Financial Disclaimer" },
  { href: "/legal/refund", label: "Refund Policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-panel-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} DollarWatch. Not financial advice.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
