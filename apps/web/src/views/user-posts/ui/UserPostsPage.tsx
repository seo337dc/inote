import { notFound } from "next/navigation";
import { PostFeed, PostListHeader } from "@/widgets/post-list";
import type { PostListPage } from "@/entities/post";
import { api } from "@/shared/lib/api";

type Props = {
  userId: string;
  page: number;
  pinnedPage: number;
  q: string | null;
};

// 한 사람의 공개 글 목록 — 글 목록에서 작성자를 누르면 오는 화면. 전체 글(홈)과 같은 목록에 작성자 필터(userId)만 더한다.
// 검색도 그 사람의 글 안에서만 한다. 없는 사용자(author가 null)는 404.
export default async function UserPostsPage({ userId, page, pinnedPage, q }: Props) {
  const params = new URLSearchParams({ userId, page: String(page), pinnedPage: String(pinnedPage) });
  if (q) params.set("q", q);
  const data = await api.get<PostListPage>(`/blog/posts?${params}`, { cache: "no-store" });

  if (!data.author) notFound();

  const basePath = `/users/${userId}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <PostListHeader
        title={`${data.author.name}의 글`}
        count={data.total}
        basePath={basePath}
        category={null}
        q={q}
        showWrite={false}
      />

      <PostFeed
        data={data}
        basePath={basePath}
        category={null}
        q={q}
        emptyState={
          <p className="py-24 text-center text-sm text-zinc-500">아직 공개된 글이 없어요.</p>
        }
      />
    </div>
  );
}
