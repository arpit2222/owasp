"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Projects" },
  { href: "/chapters", label: "Chapters" },
  { href: "/committees", label: "Committees" },
  { href: "/events", label: "Events" },
  { href: "/community", label: "Community" },
  { href: "/sponsors", label: "Sponsors" },
];

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Navbar() {
  const pathname = usePathname() || "/";

  return (
    <header className="border-b border-gray-200 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
        >
          OWASP Nest Monitor
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/projects")
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(
                  "inline-flex items-center rounded-full px-3 py-1 transition-colors",
                  "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                  "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800",
                  isActive &&
                    "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
