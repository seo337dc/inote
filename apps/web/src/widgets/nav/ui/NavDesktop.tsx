"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InoteWordmark } from "@/shared/ui/inote-wordmark";
import { NAV_LINKS } from "../model/links";
import AuthNavAction from "./AuthNavAction";
import DraftNotificationBell from "./DraftNotificationBell";

export default function NavDesktop() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="hover:opacity-80">
          <InoteWordmark />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 pb-1 ${
                  active
                    ? "border-zinc-900 font-medium text-zinc-900"
                    : "border-transparent text-zinc-600 hover:border-primary hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <DraftNotificationBell />
          <AuthNavAction className="ml-2 rounded px-2 py-1.5 text-zinc-700 hover:bg-zinc-100" />
        </nav>
      </div>
    </header>
  );
}
