import { PostFeed, PostListHeader } from "@/widgets/post-list";
import type { PostListPage } from "@/entities/post";
import { api } from "@/shared/lib/api";

// 전체 글은 카테고리로 거르지 않고 검색(q)만 지원한다 — 카테고리별 보기는 나의 글(/my-posts)에서
type Props = {
  page: number;
  pinnedPage: number;
  q: string | null;
};

export default async function HomePage({ page, pinnedPage, q }: Props) {
  const params = new URLSearchParams({ page: String(page), pinnedPage: String(pinnedPage) });
  if (q) params.set("q", q);
  const data = await api.get<PostListPage>(`/blog/posts?${params}`, { cache: "no-store" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <PostListHeader title="전체 글" count={data.total} basePath="/" category={null} q={q} />
      <p className="mb-6 text-sm text-zinc-500">로그인 없이 누구나 볼 수 있는 공개 피드입니다.</p>

      <PostFeed
        data={data}
        basePath="/"
        category={null}
        q={q}
      />
    </div>
  );
}
