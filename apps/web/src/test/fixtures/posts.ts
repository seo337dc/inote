import type { Post, PostListPage } from "@/entities/post";

export function makePost(id: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    title: `글 ${id}`,
    content: "",
    excerpt: null,
    category: "학습",
    userId: "u1",
    user: { name: "작성자", email: "a@a.com" },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    publishedAt: "2026-09-01T00:00:00.000Z",
    lastEditedAt: "2026-09-01T00:00:00.000Z",
    isPrivate: false,
    pinned: false,
    thumbnailUrl: null,
    aiSummary: null,
    ...overrides,
  };
}

// GET /blog/posts 응답 계약 (고정 글은 pinnedPage로 따로 페이지네이션)
export function makePostListPage(overrides: Partial<PostListPage> = {}): PostListPage {
  return {
    pinned: [],
    pinnedPage: 1,
    pinnedTotal: 0,
    pinnedTotalPages: 1,
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    ...overrides,
  };
}
