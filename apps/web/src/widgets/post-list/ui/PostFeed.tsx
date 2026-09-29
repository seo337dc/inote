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

// 위 "고정 글"(3개씩, pinnedPage) + 아래 "전체 글"(page)을 각각 자기 페이지네이션으로 넘긴다.
// 한쪽을 넘겨도 다른 쪽 페이지는 주소에 남겨 유지한다. 홈과 나의 글이 같이 씀.
export default function PostFeed({ data, basePath, category, emptyMessage }: Props) {
  const { pinned, pinnedPage, pinnedTotal, pinnedTotalPages, items, total, page, totalPages } = data;

  if (total === 0 && !category) return <PostListEmpty />;

  const hasPinned = pinnedTotal > 0;

  return (
    <>
      {hasPinned && (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-500">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            고정 글
          </h2>
          <PostList
            posts={pinned}
            showPinIcon={false}
            emptyMessage="이 페이지에는 고정 글이 없습니다."
          />
          <PostPagination
            page={pinnedPage}
            totalPages={pinnedTotalPages}
            basePath={basePath}
            pageParam="pinnedPage"
            keep={{ category, page }}
            label="고정 글 페이지 이동"
          />
        </section>
      )}

      <section>
        {hasPinned && <h2 className="mb-1 text-sm font-semibold text-zinc-500">전체 글</h2>}
        <PostList posts={items} emptyMessage={hasPinned ? "다른 글이 없습니다." : emptyMessage} />
        <PostPagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          pageParam="page"
          keep={{ category, pinnedPage }}
          label="전체 글 페이지 이동"
        />
      </section>
    </>
  );
}
