"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY, USER_OUTLINE_KEY } from "./queryKeys";

// archived: true = 보관, false = 보관 해제. ids는 본인 글만 처리되고(남의 글·없는 글·발행 전 글은 서버가 조용히 건너뛴다)
// 응답은 실제로 처리된 id만 돌려준다 — 그래서 요청한 개수와 다를 수 있다.
export type ArchiveVariables = { ids: string[]; archived: boolean };

export function useArchivePosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, archived }: ArchiveVariables): Promise<string[]> => {
      if (archived) {
        const res = await api.post<{ archivedIds: string[] }>("/blog/posts/archive", { ids });
        return res.archivedIds;
      }
      const res = await api.post<{ unarchivedIds: string[] }>("/blog/posts/unarchive", { ids });
      return res.unarchivedIds;
    },
    onSuccess: () => {
      // 목록·카테고리 개수·글 이동·카테고리 트리·글 상세 모두 서버 값으로 다시 맞춘다
      queryClient.invalidateQueries({ queryKey: MY_POSTS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_POST_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: POST_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: USER_OUTLINE_KEY });
      queryClient.invalidateQueries({ queryKey: ["post-detail"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
}
