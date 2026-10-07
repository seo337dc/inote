export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  // 글 상세(GET /blog/posts/:id)에서만 내려오는 카테고리 경로 — 최상위부터 이 글의 카테고리까지의 이름 (예: ["학습", "AI"]).
  // 목록 응답과 아직 이 필드를 안 보내는 BE에서는 없다 → 없으면 [category] 하나로 대신한다 (CategoryBreadcrumb)
  categoryPath?: string[];
  userId: string | null;
  user: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  // 마지막으로 "저장(발행)"한 시각 — 첫 발행 땐 publishedAt과 같고, 다시 저장할 때만 바뀐다.
  // 핀·비공개 전환·자동 임시저장으로는 안 바뀜 (그래서 updatedAt 대신 이 값을 정렬·표시에 쓴다)
  lastEditedAt: string | null;
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

// GET /blog/posts/mine/outline — 카테고리 관리 화면용 (내 글 전체, 본문 없이)
export type MyPostOutlineItem = {
  id: string;
  title: string;
  category: string;
  isPrivate: boolean;
  publishedAt: string | null;
};
