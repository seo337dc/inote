import { formatDateTime } from "@/shared/lib/date";
import { getPostDates } from "../lib/postDates";
import type { Post } from "../model/types";

// "생성일 : 2026.10.02 14:30 / 수정일 : 2026.10.03 09:12" — 수정한 적 없으면 생성일만.
// 글 목록과 글 상세가 같이 쓴다.
export default function PostDates({
  post,
}: {
  post: Pick<Post, "createdAt" | "publishedAt" | "lastEditedAt">;
}) {
  const { writtenAt, editedAt } = getPostDates(post);
  return (
    <span>
      생성일 : {formatDateTime(writtenAt)}
      {editedAt && ` / 수정일 : ${formatDateTime(editedAt)}`}
    </span>
  );
}
