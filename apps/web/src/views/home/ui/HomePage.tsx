import { PostList, PostListHeader, PostListEmpty } from "@/widgets/post-list";
import type { Post } from "@/entities/post";
import { api } from "@/shared/lib/api";

type Props = {
  category: string | null;
};

export default async function HomePage({ category }: Props) {
  const allPosts = await api.get<Post[]>("/blog/posts", { cache: "no-store" });
  const posts = category ? allPosts.filter((post) => post.category === category) : allPosts;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <PostListHeader title="전체 글" count={posts.length} />
      <p className="mb-6 text-sm text-zinc-500">로그인 없이 누구나 볼 수 있는 공개 피드입니다.</p>

      {allPosts.length === 0 ? (
        <PostListEmpty />
      ) : (
        <PostList posts={posts} emptyMessage="이 카테고리엔 아직 글이 없습니다." />
      )}
    </div>
  );
}
