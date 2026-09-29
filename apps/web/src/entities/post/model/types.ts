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
  aiSummary: { summary: string[] } | null;
};

// GET /blog/posts, /blog/posts/mine 공통 응답 — 고정 글(최대 3, 1페이지에서만) + 페이지네이션 목록
export type PostListPage = {
  pinned: Post[];
  items: Post[];
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
