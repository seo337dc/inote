import Link from "next/link";
import { CATEGORIES } from "@/entities/category";
import type { Post } from "@/entities/post";
import { cn } from "@/shared/lib/utils";

type Props = {
  posts: Post[];
  activeCategory: string | null;
  className?: string;
  onNavigate?: () => void;
};

export default function CategoryFilter({
  posts,
  activeCategory,
  className,
  onNavigate,
}: Props) {
  return (
    <aside className={cn("w-40 shrink-0", className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        카테고리
      </p>
      <ul className="space-y-1 text-sm">
        <li>
          <Link
            href="/"
            onClick={onNavigate}
            className={`block rounded px-2 py-1 ${
              !activeCategory ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            전체 ({posts.length})
          </Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <Link
              href={`/?category=${encodeURIComponent(c)}`}
              onClick={onNavigate}
              className={`block rounded px-2 py-1 ${
                activeCategory === c
                  ? "bg-zinc-900 text-white"
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
