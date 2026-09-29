export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  userId: string | null;
  user: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isPrivate: boolean;
  pinned: boolean;
  // 출간 화면에서 올린 썸네일 (R2 URL), 없으면 null
  thumbnailUrl: string | null;
  aiSummary: { summary: string[] } | null;
};

// GET /blog/posts, /blog/posts/mine 공통 응답.
// 고정 글은 한 페이지 3개씩 pinnedPage로, 나머지(고정 글 제외) 일반 글은 page로 따로 페이지네이션한다.
export type PostListPage = {
  // pinnedPage 페이지의 고정 글 (최대 3개)
  pinned: Post[];
  pinnedPage: number;
  pinnedTotal: number;
  pinnedTotalPages: number;
  // 고정 글을 모두 뺀 일반 글 (page 기준)
  items: Post[];
  // 고정 + 일반 전체 개수
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MyPostListPage = PostListPage & {
  categoryCounts: Record<string, number>;
};

// GET /blog/posts/outline — 카테고리 트리용 (본문 없이 제목·카테고리만)
export type PostOutlineItem = {
  id: string;
  title: string;
  category: string;
  isPrivate: boolean;
  pinned: boolean;
};
