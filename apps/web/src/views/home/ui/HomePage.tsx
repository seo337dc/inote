import { PostFeed, PostListHeader } from "@/widgets/post-list";
import type { PostListPage } from "@/entities/post";
import { api } from "@/shared/lib/api";

type Props = {
  category: string | null;
  page: number;
};

export default async function HomePage({ category, page }: Props) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  const data = await api.get<PostListPage>(`/blog/posts?${params}`, { cache: "no-store" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <PostListHeader title="전체 글" count={data.total} />
      <p className="mb-6 text-sm text-zinc-500">로그인 없이 누구나 볼 수 있는 공개 피드입니다.</p>

      <PostFeed
        data={data}
        basePath="/"
        category={category}
        emptyMessage="이 카테고리엔 아직 글이 없습니다."
      />
    </div>
  );
}
