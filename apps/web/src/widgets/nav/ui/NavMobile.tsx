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
import { useMyPosts } from "@/entities/post";
import { buildCategoryTree, flattenCategoryTree, rollupCategoryCounts, useCategories } from "@/entities/category";
import { InoteWordmark } from "@/shared/ui/inote-wordmark";
import { NAV_LINKS } from "../model/links";
import AuthNavAction from "./AuthNavAction";
import DraftNotificationBell from "./DraftNotificationBell";

export default function NavMobile() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCategoryId = searchParams.get("categoryId");

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
      <Link href="/" className="hover:opacity-80">
        <InoteWordmark />
      </Link>

      <div className="flex items-center gap-2">
        <DraftNotificationBell />

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
              variant="inline"
              onNavigate={() => setOpen(false)}
              className="mt-2 rounded border border-zinc-300 px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
            />
          </nav>

          {(pathname === "/my-posts" || pathname === "/my-posts/archive") && (
            <div className="mt-2 border-t border-zinc-200 px-4 pt-4">
              <MyCategoryFilter
                basePath={pathname}
                archived={pathname === "/my-posts/archive"}
                activeCategoryId={activeCategoryId}
                q={searchParams.get("q")}
                onNavigate={() => setOpen(false)}
              />
            </div>
          )}
        </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// 좁은 화면의 카테고리 필터 — 내 카테고리 트리와 카테고리(id)별 글 수. "나의 글"에서만 열리므로 로그인한 상태다.
// (예전에는 고정 기본 5개 이름과 예시 글 개수를 보여줘서 실제 카테고리와 달랐다)
function MyCategoryFilter({
  basePath,
  archived,
  activeCategoryId,
  q,
  onNavigate,
}: {
  basePath: string;
  archived: boolean;
  activeCategoryId: string | null;
  q: string | null;
  onNavigate: () => void;
}) {
  const categoriesQuery = useCategories();
  const myPosts = useMyPosts(1, 1, null, null, archived);
  const tree = buildCategoryTree(categoriesQuery.data ?? []);
  const directCounts = myPosts.data?.categoryCounts ?? {};

  return (
    <CategoryFilter
      posts={[]}
      counts={rollupCategoryCounts(tree, directCounts)}
      totalCount={Object.values(directCounts).reduce((sum, n) => sum + n, 0)}
      categories={flattenCategoryTree(tree)}
      activeCategoryId={activeCategoryId}
      className="w-full"
      onNavigate={onNavigate}
      basePath={basePath}
      q={q}
    />
  );
}
