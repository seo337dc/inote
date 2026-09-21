"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/features/filter-posts-by-category";
import { PostList, PostListHeader, PostListEmpty } from "@/widgets/post-list";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";
import { useMyPosts } from "@/entities/post";

type Props = {
  category: string | null;
};

export default function MyPostsPage({ category }: Props) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: allPosts, isPending: isPostsPending } = useMyPosts();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session || isPostsPending || !allPosts) {
    return <PageLoading />;
  }

  const posts = category ? allPosts.filter((post) => post.category === category) : allPosts;

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {/* lg 미만에서는 카테고리 필터가 NavMobile의 햄버거 드로어 안에 들어가 있음 */}
      <div className="hidden lg:block">
        <CategoryFilter posts={allPosts} activeCategory={category} basePath="/my-posts" />
      </div>

      <div className="flex-1">
        <PostListHeader title="나의 글" count={posts.length} />

        {allPosts.length === 0 ? (
          <PostListEmpty />
        ) : (
          <PostList posts={posts} emptyMessage="이 카테고리엔 아직 글이 없습니다." />
        )}
      </div>
    </div>
  );
}
