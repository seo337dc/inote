// 카테고리 경로의 한 칸 — 링크는 이름이 아니라 id로 건다(같은 이름이 여러 곳에 있을 수 있다)
export type CategoryPathItem = { id: string | null; name: string };

// 카테고리별 글 수 맵의 키 — 카테고리 id. 카테고리가 아직 지정되지 않은 글(categoryId가 null)은 이 키로 센다
export const UNASSIGNED_CATEGORY_KEY = "unassigned";

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  // 카테고리 이름 사본(표시용). 같은 이름이 여러 곳에 있을 수 있어 글을 가리키는 기준은 아래 categoryId다
  category: string;
  // 이 글의 카테고리 id — 개수·필터·선택·이동은 전부 이 값 기준. 아직 지정되지 않은 글(같은 이름이 두 곳이라 자동 연결 못 한 옛 글)은 null
  categoryId: string | null;
  // 카테고리 경로 — 최상위부터 이 글의 카테고리까지 (예: [{학습}, {AI}]). 글 상세·목록 응답에서 내려온다.
  // 없으면 [{ id: categoryId, name: category }] 하나로 대신한다 (getCategoryPath)
  categoryPath?: CategoryPathItem[];
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
  // 보관함으로 옮긴 시각 — null이면 일반 글. 보관한 글은 목록·검색에서 빠지고 작성자만 주소로 열 수 있다
  archivedAt: string | null;
  // 출간 화면에서 올린 썸네일 (R2 URL), 없으면 null
  thumbnailUrl: string | null;
  aiSummary: { summary: string[] } | null;
};

// GET /blog/posts, /blog/posts/mine 공통 응답.
// 고정 글은 한 페이지 3개씩 pinnedPage로, 나머지(고정 글 제외) 일반 글은 page로 따로 페이지네이션한다.
// 다른 사람의 카테고리 한 줄 — 트리를 그리는 데 필요한 것만 (부모, 깊이, 같은 부모 안 순서용 생성 시각)
export type PublicCategory = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
};

export type PostListPage = {
  // 작성자 필터(?userId=)로 불렀을 때만 내려오는 그 작성자 — 글이 0개(검색 결과 없음 포함)여도 이름을 알 수 있다.
  // 없는 사용자면 null, 필터가 없는 요청에는 필드 자체가 없다
  author?: { id: string; name: string } | null;
  // 작성자 필터일 때만: 그 작성자의 카테고리 중 **공개 글이 있는** 것(그 아래에 있는 경우 포함)과 공개 글의 카테고리별 개수(그 카테고리 직속만).
  // 비공개 글만 있는 카테고리는 이름도 내려오지 않는다. 필터가 없는 요청에는 없다
  categories?: PublicCategory[];
  // 카테고리 id → 글 수 (그 카테고리 직속만)
  categoryCounts?: Record<string, number>;
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
  // 카테고리 id → 글 수 (그 카테고리 직속만). 아직 지정 안 된 글은 UNASSIGNED_CATEGORY_KEY
  categoryCounts: Record<string, number>;
};

// GET /blog/posts/outline — 카테고리 트리용 (본문 없이 제목·카테고리만)
export type PostOutlineItem = {
  id: string;
  title: string;
  category: string;
  categoryId: string | null;
  isPrivate: boolean;
  pinned: boolean;
};

// GET /blog/posts/outline/user/:userId — 다른 사람의 글 상세 왼쪽 카테고리 트리용: 그 작성자의 공개 글과, 공개 글이 있는 카테고리
// (비공개 글·비공개 글만 있는 카테고리는 없다). 없는 사용자면 author가 null
export type UserOutline = {
  author: { id: string; name: string } | null;
  categories: PublicCategory[];
  posts: PostOutlineItem[];
};

// GET /blog/posts/mine/outline — 카테고리 관리 화면용 (내 글 전체, 본문 없이)
export type MyPostOutlineItem = {
  id: string;
  title: string;
  category: string;
  categoryId: string | null;
  isPrivate: boolean;
  publishedAt: string | null;
};
