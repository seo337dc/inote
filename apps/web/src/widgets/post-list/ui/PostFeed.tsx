import type { ReactNode } from "react";
import { Star } from "lucide-react";
import type { PostListPage } from "@/entities/post";
import PostList from "./PostList";
import PostListEmpty from "./PostListEmpty";
import PostPagination from "./PostPagination";

type Props = {
  data: PostListPage;
  basePath: string;
  category: string | null;
  // 검색어 — 있으면 페이지를 넘겨도 유지하고, 결과가 없을 때 "검색 결과 없음"으로 안내
  q?: string | null;
  emptyMessage?: string;
  // 조건 없이 글이 0개일 때 보여줄 화면 — 기본은 "첫 글을 써 보세요"(내 글 기준). 다른 사람의 목록은 다른 안내를 넘긴다
  emptyState?: ReactNode;
};

// 위 "고정 글"(3개씩, pinnedPage) + 아래 "전체 글"(page)을 각각 자기 페이지네이션으로 넘긴다.
// 한쪽을 넘겨도 다른 쪽 페이지는 주소에 남겨 유지한다. 홈과 나의 글이 같이 씀.
export default function PostFeed({ data, basePath, category, q = null, emptyMessage, emptyState }: Props) {
  const { pinned, pinnedPage, pinnedTotal, pinnedTotalPages, items, total, page, totalPages } = data;

  // 아무 조건 없이 글이 0개일 때만 "첫 글을 써 보세요" 화면 — 필터·검색 결과가 0개인 건 목록 안에서 안내
  if (total === 0 && !category && !q) return <>{emptyState ?? <PostListEmpty />}</>;

  const listEmptyMessage = q ? "검색 결과가 없습니다." : emptyMessage;

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
            keep={{ category, q, page }}
            label="고정 글 페이지 이동"
          />
        </section>
      )}

      <section>
        {hasPinned && <h2 className="mb-1 text-sm font-semibold text-zinc-500">전체 글</h2>}
        <PostList posts={items} emptyMessage={hasPinned ? "다른 글이 없습니다." : listEmptyMessage} />
        <PostPagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          pageParam="page"
          keep={{ category, q, pinnedPage }}
          label="전체 글 페이지 이동"
        />
      </section>
    </>
  );
}
