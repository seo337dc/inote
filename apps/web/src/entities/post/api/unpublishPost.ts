import { api } from "@/shared/lib/api";
import type { Post } from "../model/types";

// 발행한 내 글을 임시저장(draft)으로 되돌린다. 응답은 되돌린 글(PATCH와 같은 글 상세 모양).
// 보관한 글은 409, 남의 글 403, 없는 글 404 (ApiError). 이미 draft여도 성공한다. 계약: docs/todo/post-unpublish.md
export function unpublishPost(id: string) {
  return api.post<Post>(`/blog/posts/${id}/unpublish`, {});
}
