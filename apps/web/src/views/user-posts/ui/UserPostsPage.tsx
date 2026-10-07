import { notFound } from "next/navigation";
import { CategoryFilter } from "@/features/filter-posts-by-category";
import { PostFeed, PostListHeader } from "@/widgets/post-list";
import type { PostListPage } from "@/entities/post";
import { api } from "@/shared/lib/api";
import { buildUserCategoryFilter } from "../lib/userCategories";

type Props = {
  userId: string;
  category: string | null;
  page: number;
  pinnedPage: number;
  q: string | null;
};

// 한 사람의 공개 글 목록 — 글 목록에서 작성자를 누르면 오는 화면. 전체 글(홈)과 같은 목록에 작성자 필터(userId)를 더하고,
// 그 사람의 카테고리(공개 글이 있는 것만)를 왼쪽에 보여줘서 카테고리별로 볼 수 있다. 검색도 그 사람의 글 안에서만 한다.
// 없는 사용자(author가 null)는 404.
export default async function UserPostsPage({ userId, category, page, pinnedPage, q }: Props) {
  const params = new URLSearchParams({ userId, page: String(page), pinnedPage: String(pinnedPage) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const data = await api.get<PostListPage>(`/blog/posts?${params}`, { cache: "no-store" });

  if (!data.author) notFound();

  const basePath = `/users/${userId}`;
  const filter = data.categories?.length
    ? buildUserCategoryFilter(data.author.id, data.categories, data.categoryCounts ?? {})
    : null;

  const sidebar = filter && (
    <CategoryFilter
      posts={[]}
      counts={filter.counts}
      totalCount={filter.total}
      categories={filter.options}
      activeCategory={category}
      basePath={basePath}
      q={q}
      showManage={false}
    />
  );

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {sidebar && <div className="hidden lg:block">{sidebar}</div>}

      <div className="min-w-0 flex-1">
        {filter && (
          // 좁은 화면에는 왼쪽 열이 없어서 목록 위에 접어 두고 펼치게 한다
          <details className="mb-4 rounded border border-zinc-200 px-3 py-2 lg:hidden">
            <summary className="cursor-pointer text-sm text-zinc-600">
              카테고리{category ? ` · ${category}` : ""}
            </summary>
            <div className="mt-2">
              <CategoryFilter
                posts={[]}
                counts={filter.counts}
                totalCount={filter.total}
                categories={filter.options}
                activeCategory={category}
                basePath={basePath}
                q={q}
                showManage={false}
                className="w-full"
              />
            </div>
          </details>
        )}

        <PostListHeader
          title={`${data.author.name}의 글`}
          count={data.total}
          basePath={basePath}
          category={category}
          q={q}
          showWrite={false}
        />

        <PostFeed
          data={data}
          basePath={basePath}
          category={category}
          q={q}
          emptyMessage="이 카테고리에는 공개된 글이 없어요."
          emptyState={
            <p className="py-24 text-center text-sm text-zinc-500">아직 공개된 글이 없어요.</p>
          }
        />
      </div>
    </div>
  );
}
