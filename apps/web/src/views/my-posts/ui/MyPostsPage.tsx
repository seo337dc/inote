"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/features/filter-posts-by-category";
import { ArchiveActionBar } from "@/features/archive-posts";
import { PostFeed, PostListHeader } from "@/widgets/post-list";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";
import { useMyPosts } from "@/entities/post";
import { useCategories, buildCategoryTree, flattenCategoryTree, rollupCategoryCounts } from "@/entities/category";
import MyPostsTabs from "./MyPostsTabs";

type Props = {
  categoryId: string | null;
  page: number;
  pinnedPage: number;
  q: string | null;
  // true면 보관함(보관한 글만) — 같은 화면을 /my-posts/archive에서 쓴다
  archived?: boolean;
};

// 선택한 글은 "어느 화면(목록·페이지·카테고리·검색)에서 골랐는지"와 함께 들고 있다 — 화면이 바뀌면 그 선택은 저절로 무효가 되어
// 안 보이는 글이 선택된 채로 보관되는 일이 없다.
type Selection = { scope: string; ids: ReadonlySet<string> };

export default function MyPostsPage({ categoryId, page, pinnedPage, q, archived = false }: Props) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data, isPending: isPostsPending } = useMyPosts(page, pinnedPage, categoryId, q, archived);
  const categoriesQuery = useCategories();
  const categoryTree = buildCategoryTree(categoriesQuery.data ?? []);
  const flatCategories = flattenCategoryTree(categoryTree);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection>({ scope: "", ids: new Set() });

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session || isPostsPending || !data) {
    return <PageLoading />;
  }

  const basePath = archived ? "/my-posts/archive" : "/my-posts";
  const scope = `${basePath}|${page}|${pinnedPage}|${categoryId ?? ""}|${q ?? ""}`;
  const selectedIds = selection.scope === scope ? selection.ids : new Set<string>();
  const pageIds = [...data.pinned, ...data.items].map((post) => post.id);

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection({ scope, ids: next });
  }

  function closeSelecting() {
    setSelecting(false);
    setSelection({ scope: "", ids: new Set() });
  }

  // 상위 카테고리는 하위 글까지 합친 수로 보여준다 (눌렀을 때 하위 글까지 나오므로). 전체는 직속 합계 그대로
  const rolledCounts = rollupCategoryCounts(categoryTree, data.categoryCounts);
  const allCount = Object.values(data.categoryCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {/* lg 미만에서는 카테고리 필터가 NavMobile의 햄버거 드로어 안에 들어가 있음 */}
      <div className="hidden lg:block">
        <CategoryFilter
          posts={[]}
          counts={rolledCounts}
          totalCount={allCount}
          activeCategoryId={categoryId}
          basePath={basePath}
          q={q}
          categories={flatCategories}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-end justify-between">
          <MyPostsTabs archived={archived} />
          {data.total > 0 && (
            <button
              type="button"
              onClick={() => (selecting ? closeSelecting() : setSelecting(true))}
              className="pb-2 text-sm text-zinc-500 hover:text-zinc-800"
            >
              {selecting ? "선택 취소" : "선택"}
            </button>
          )}
        </div>
        <PostListHeader
          title={archived ? "보관함" : "나의 글"}
          count={data.total}
          basePath={basePath}
          categoryId={categoryId}
          q={q}
          showWrite={!archived}
        />

        <PostFeed
          data={data}
          basePath={basePath}
          categoryId={categoryId}
          q={q}
          selection={selecting ? { selectedIds, onToggle: toggle } : undefined}
          emptyState={archived ? <ArchiveEmpty /> : undefined}
        />

        {selecting && (
          <ArchiveActionBar
            archived={archived}
            selectedIds={[...selectedIds]}
            pageIds={pageIds}
            onSelectPage={(ids) => setSelection({ scope, ids: new Set(ids) })}
            onClear={() => setSelection({ scope, ids: new Set() })}
            onDone={closeSelecting}
          />
        )}
      </div>
    </div>
  );
}

function ArchiveEmpty() {
  return (
    <div className="py-20 text-center">
      <p className="text-zinc-500">보관한 글이 없어요.</p>
      <p className="mt-1 text-sm text-zinc-400">나의 글에서 [선택]을 눌러 글을 보관함으로 옮길 수 있어요.</p>
    </div>
  );
}
