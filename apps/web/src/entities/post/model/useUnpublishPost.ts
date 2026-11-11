"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unpublishPost } from "../api/unpublishPost";
import { MY_DRAFTS_KEY, MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_DETAIL_KEY, POST_KEY, POST_OUTLINE_KEY, USER_OUTLINE_KEY } from "./queryKeys";

// 글 id를 넘기면 그 글을 임시저장으로 되돌리고 되돌려진 글을 돌려준다.
// 실패(보관한 글 409·남의 글 403·없는 글 404 등)는 ApiError로 던지고 캐시는 건드리지 않는다 — 안내 문구는 화면이 정한다.
export function useUnpublishPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unpublishPost,
    onSuccess: () => {
      // 글이 나의 글·공개 목록·카테고리 트리에서 빠지고 임시저장 목록에 생기며 상세도 바뀐다 — 서버 값으로 다시 맞춘다
      queryClient.invalidateQueries({ queryKey: MY_POSTS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DRAFTS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_POST_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: POST_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: USER_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: POST_DETAIL_KEY });
      queryClient.invalidateQueries({ queryKey: POST_KEY });
    },
  });
}
