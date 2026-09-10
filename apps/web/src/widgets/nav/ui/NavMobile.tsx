"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { CategoryFilter } from "@/features/filter-posts-by-category";
import { MOCK_POSTS } from "@/entities/post";
import { InoteWordmark } from "@/shared/ui/inote-wordmark";
import { NAV_LINKS } from "../model/links";
import AuthNavAction from "./AuthNavAction";

export default function NavMobile() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCategory = searchParams.get("category");

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
      <Link href="/" className="hover:opacity-80">
        <InoteWordmark />
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="outline" size="icon" aria-label="메뉴 열기" />}
        >
          <Menu className="size-5" />
        </SheetTrigger>

        <SheetContent side="right" className="flex w-3/4 flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>메뉴</SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 px-4 text-sm">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded px-3 py-2 ${
                    active
                      ? "bg-zinc-900 text-white hover:bg-zinc-800"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <AuthNavAction
              onNavigate={() => setOpen(false)}
              className="mt-2 rounded border border-zinc-300 px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
            />
          </nav>

          {pathname === "/" && (
            <div className="mt-2 border-t border-zinc-200 px-4 pt-4">
              <CategoryFilter
                posts={MOCK_POSTS}
                activeCategory={activeCategory}
                className="w-full"
                onNavigate={() => setOpen(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
