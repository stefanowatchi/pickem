"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Games" },
  { href: "/groups", label: "Groups" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="mt-4 flex gap-5 text-sm font-medium">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "underline decoration-2 underline-offset-8"
                : "text-foreground/60 hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
