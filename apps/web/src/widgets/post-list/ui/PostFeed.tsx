import { Star } from "lucide-react";
import type { PostListPage } from "@/entities/post";
import PostList from "./PostList";
import PostListEmpty from "./PostListEmpty";
import PostPagination from "./PostPagination";

type Props = {
  data: PostListPage;
  basePath: string;
  category: string | null;
  emptyMessage?: string;
};

// 상단 고정 글(최대 3, 1페이지만) + 아래 전체 글 목록(페이지네이션). 홈과 나의 글이 같이 씀.
export default function PostFeed({ data, basePath, category, emptyMessage }: Props) {
  const { pinned, items, total, page, totalPages } = data;

  if (total === 0 && !category) return <PostListEmpty />;

  const hasPinned = pinned.length > 0;

  return (
    <>
      {hasPinned && (
        <section className="mb-8">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-500">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            고정 글
          </h2>
          <PostList posts={pinned} showPinIcon={false} />
        </section>
      )}

      <section>
        {hasPinned && <h2 className="mb-1 text-sm font-semibold text-zinc-500">전체 글</h2>}
        <PostList posts={items} emptyMessage={hasPinned ? "다른 글이 없습니다." : emptyMessage} />
      </section>

      <PostPagination page={page} totalPages={totalPages} basePath={basePath} category={category} />
    </>
  );
}
