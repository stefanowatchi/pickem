"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ userId }: { userId: string }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Games", active: pathname === "/" },
    { href: "/groups", label: "Groups", active: pathname.startsWith("/groups") },
    {
      href: `/players/${userId}`,
      label: "My picks",
      active: pathname === `/players/${userId}`,
    },
  ];

  return (
    <nav aria-label="Main" className="mt-5 flex border-b border-line">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
            link.active
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
