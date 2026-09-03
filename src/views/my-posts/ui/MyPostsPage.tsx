import { MOCK_POSTS } from "@/entities/post";
import { PostList } from "@/widgets/post-list";

export default function MyPostsPage() {
  const myPosts = MOCK_POSTS.filter((post) => post.mine);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">나의 글</h1>
      <p className="mb-6 text-sm text-zinc-500">
        로그인한 계정으로 작성한 글만 모아봅니다. (목업 데이터 · 로그인 연동 전)
      </p>

      <PostList posts={myPosts} emptyMessage="아직 작성한 글이 없습니다." />
    </div>
  );
}
