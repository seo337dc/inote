import { CategoryFilter } from "@/features/filter-posts-by-category";
import { PostList, PostListHeader, PostListEmpty } from "@/widgets/post-list";
import type { Post } from "@/entities/post";
import { api } from "@/shared/lib/api";

type Props = {
  category: string | null;
};

export default async function MyPostsPage({ category }: Props) {
  // 로그인 전이라 "내 글" 필터가 없음 — 전체 글을 임시로 보여줌. 로그인 붙으면 userId로 필터링 예정.
  const allPosts = await api.get<Post[]>("/blog/posts", { cache: "no-store" });
  const posts = category ? allPosts.filter((post) => post.category === category) : allPosts;

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {/* lg 미만에서는 카테고리 필터가 NavMobile의 햄버거 드로어 안에 들어가 있음 */}
      <div className="hidden lg:block">
        <CategoryFilter posts={allPosts} activeCategory={category} basePath="/my-posts" />
      </div>

      <div className="flex-1">
        <PostListHeader title="나의 글" count={posts.length} />
        <p className="mb-6 text-sm text-zinc-500">
          로그인 연동 전까지는 전체 글을 임시로 보여줍니다.
        </p>

        {allPosts.length === 0 ? (
          <PostListEmpty />
        ) : (
          <PostList posts={posts} emptyMessage="이 카테고리엔 아직 글이 없습니다." />
        )}
      </div>
    </div>
  );
}
