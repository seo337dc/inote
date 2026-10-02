import Link from "next/link";
import { CATEGORIES } from "@/entities/category";
import type { Post } from "@/entities/post";
import { cn } from "@/shared/lib/utils";

type CategoryOption = { name: string; depth: number };

const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = CATEGORIES.map((name) => ({
  name,
  depth: 1,
}));

type Props = {
  posts: Post[];
  activeCategory: string | null;
  className?: string;
  onNavigate?: () => void;
  basePath?: string;
  // 실제 로그인한 유저의 카테고리 트리(평탄화됨). 안 넘기면 기본 5개로 대체
  // (로그인 없이도 렌더링돼야 하는 곳이 있어 fallback을 남겨둠).
  categories?: CategoryOption[];
  // 페이지네이션으로 posts에 전체 글이 없을 때 서버가 준 카테고리별/전체 개수를 쓴다.
  counts?: Record<string, number>;
  totalCount?: number;
  // 걸려 있는 검색어 — 카테고리를 바꿔도 검색은 유지한다 (카테고리 안에서 검색)
  q?: string | null;
};

function hrefFor(basePath: string, category: string | null, q: string | null) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function CategoryFilter({
  posts,
  activeCategory,
  className,
  onNavigate,
  basePath = "/",
  categories = DEFAULT_CATEGORY_OPTIONS,
  counts,
  totalCount,
  q = null,
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
            href={hrefFor(basePath, null, q)}
            onClick={onNavigate}
            className={`block rounded px-2 py-1 ${
              !activeCategory
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            전체 ({totalCount ?? posts.length})
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.name}>
            <Link
              href={hrefFor(basePath, c.name, q)}
              onClick={onNavigate}
              className={`block rounded px-2 py-1 ${
                activeCategory === c.name
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {"　".repeat(c.depth - 1)}
              {c.name} ({counts ? (counts[c.name] ?? 0) : posts.filter((post) => post.category === c.name).length})
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
