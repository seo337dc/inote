"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/features/filter-posts-by-category";
import { PostFeed, PostListHeader } from "@/widgets/post-list";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";
import { useMyPosts } from "@/entities/post";
import { useCategories, buildCategoryTree, flattenCategoryTree } from "@/entities/category";

type Props = {
  category: string | null;
  page: number;
  pinnedPage: number;
};

export default function MyPostsPage({ category, page, pinnedPage }: Props) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data, isPending: isPostsPending } = useMyPosts(page, pinnedPage, category);
  const categoriesQuery = useCategories();
  const flatCategories = flattenCategoryTree(buildCategoryTree(categoriesQuery.data ?? []));

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session || isPostsPending || !data) {
    return <PageLoading />;
  }

  const allCount = Object.values(data.categoryCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {/* lg 미만에서는 카테고리 필터가 NavMobile의 햄버거 드로어 안에 들어가 있음 */}
      <div className="hidden lg:block">
        <CategoryFilter
          posts={[]}
          counts={data.categoryCounts}
          totalCount={allCount}
          activeCategory={category}
          basePath="/my-posts"
          categories={flatCategories}
        />
      </div>

      <div className="flex-1">
        <PostListHeader title="나의 글" count={data.total} />

        <PostFeed
          data={data}
          basePath="/my-posts"
          category={category}
          emptyMessage="이 카테고리엔 아직 글이 없습니다."
        />
      </div>
    </div>
  );
}
