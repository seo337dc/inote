import Link from "next/link";
import type { Post } from "@/entities/post";
import { cn } from "@/shared/lib/utils";

// 같은 이름이 다른 부모 아래에 또 있을 수 있어서 선택·개수·링크는 전부 id로 한다
type CategoryOption = { id: string; name: string; depth: number };

type Props = {
  posts: Post[];
  activeCategoryId: string | null;
  className?: string;
  onNavigate?: () => void;
  basePath?: string;
  // 카테고리 트리(평탄화됨) — 내 카테고리 또는 다른 사람의 공개 카테고리
  categories?: CategoryOption[];
  // 페이지네이션으로 posts에 전체 글이 없을 때 서버가 준 카테고리별(키 = 카테고리 id)/전체 개수를 쓴다.
  counts?: Record<string, number>;
  totalCount?: number;
  // 걸려 있는 검색어 — 카테고리를 바꿔도 검색은 유지한다 (카테고리 안에서 검색)
  q?: string | null;
  // 내 카테고리를 관리하는 화면으로 가는 '관리' 링크 — 다른 사람의 카테고리를 볼 때는 숨긴다
  showManage?: boolean;
};

function hrefFor(basePath: string, categoryId: string | null, q: string | null) {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function CategoryFilter({
  posts,
  activeCategoryId,
  className,
  onNavigate,
  basePath = "/",
  categories = [],
  counts,
  totalCount,
  q = null,
  showManage = true,
}: Props) {
  return (
    <aside className={cn("w-40 shrink-0", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">카테고리</p>
        {showManage && (
          <Link
            href="/categories"
            onClick={onNavigate}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
          >
            관리
          </Link>
        )}
      </div>
      <ul className="space-y-1 text-sm">
        <li>
          <Link
            href={hrefFor(basePath, null, q)}
            onClick={onNavigate}
            className={`block rounded px-2 py-1 ${
              !activeCategoryId
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            전체 ({totalCount ?? posts.length})
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={hrefFor(basePath, c.id, q)}
              onClick={onNavigate}
              className={`block rounded px-2 py-1 ${
                activeCategoryId === c.id
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {"　".repeat(c.depth - 1)}
              {c.name} ({counts ? (counts[c.id] ?? 0) : posts.filter((post) => post.categoryId === c.id).length})
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
