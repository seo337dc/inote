import type { Post } from "../model/types";

// 글에 표시할 작성·수정 시각.
// - 작성: 발행 시각. createdAt은 글쓰기 화면에 들어가 빈 draft가 생긴 시각이라 쓰지 않는다 (draft면 createdAt)
// - 수정: 발행 뒤 다시 저장한 적이 있을 때만 (lastEditedAt이 발행 시각과 다를 때)
export function getPostDates(post: Pick<Post, "createdAt" | "publishedAt" | "lastEditedAt">) {
  const writtenAt = post.publishedAt ?? post.createdAt;
  const editedAt =
    post.publishedAt && post.lastEditedAt && post.lastEditedAt !== post.publishedAt
      ? post.lastEditedAt
      : null;
  return { writtenAt, editedAt };
}
