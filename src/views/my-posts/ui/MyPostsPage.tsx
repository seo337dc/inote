import { PostList, PostListHeader, PostListEmpty } from "@/widgets/post-list";
import type { Post } from "@/entities/post";
import { api } from "@/shared/lib/api";

export default async function MyPostsPage() {
  // 로그인 전이라 "내 글" 필터가 없음 — 전체 글을 임시로 보여줌. 로그인 붙으면 userId로 필터링 예정.
  const posts = await api.get<Post[]>("/blog/posts", { cache: "no-store" });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PostListHeader title="나의 글" count={posts.length} />
      <p className="mb-6 text-sm text-zinc-500">
        로그인 연동 전까지는 전체 글을 임시로 보여줍니다.
      </p>

      {posts.length === 0 ? <PostListEmpty /> : <PostList posts={posts} />}
    </div>
  );
}
