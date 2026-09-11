import Link from "next/link";
import { CATEGORIES } from "@/entities/category";
import type { Post } from "@/entities/post";
import { cn } from "@/shared/lib/utils";

type Props = {
  posts: Post[];
  activeCategory: string | null;
  className?: string;
  onNavigate?: () => void;
  basePath?: string;
};

export default function CategoryFilter({
  posts,
  activeCategory,
  className,
  onNavigate,
  basePath = "/",
}: Props) {
  return (
    <aside className={cn("w-40 shrink-0", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">카테고리</p>
        <Link
          href="/categories"
          onClick={onNavigate}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
        >
          관리
        </Link>
      </div>
      <ul className="space-y-1 text-sm">
        <li>
          <Link
            href={basePath}
            onClick={onNavigate}
            className={`block rounded px-2 py-1 ${
              !activeCategory
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            전체 ({posts.length})
          </Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <Link
              href={`${basePath}?category=${encodeURIComponent(c)}`}
              onClick={onNavigate}
              className={`block rounded px-2 py-1 ${
                activeCategory === c
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {c} ({posts.filter((post) => post.category === c).length})
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
