"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { changePostCategory, moveCountKey } from "../lib/moveCategory";
import { MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY } from "./queryKeys";
import type { MyPostListPage, MyPostOutlineItem, PostOutlineItem } from "./types";

const MUTATION_KEY = ["move-post-category"];

type Snapshot = [QueryKey, unknown][];

// 글 하나의 카테고리를 옮긴다. 기존 글 수정 API(PATCH /blog/posts/:id)에 category만 보낸다
// (publish를 안 보내므로 발행 상태·AI 요약은 그대로).
// 낙관적 업데이트: 응답 전에 화면의 글 목록·카테고리별 글 수를 먼저 바꾸고(로딩 표시 없음),
// 실패하면 모두 되돌린다. from은 개수를 줄일 옛 카테고리 이름.
export function useMovePostCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ id, to }: { id: string; from: string; to: string }) =>
      api.patch(`/blog/posts/${id}`, { category: to }),
    onMutate: async ({ id, from, to }) => {
      await queryClient.cancelQueries({ queryKey: MY_POST_OUTLINE_KEY });
      const snapshots: Snapshot = [];

      queryClient.getQueriesData<MyPostOutlineItem[]>({ queryKey: MY_POST_OUTLINE_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData(key, changePostCategory(data, id, to));
      });
      queryClient.getQueriesData<MyPostListPage>({ queryKey: MY_POSTS_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData<MyPostListPage>(key, {
          ...data,
          pinned: changePostCategory(data.pinned, id, to),
          items: changePostCategory(data.items, id, to),
          categoryCounts: moveCountKey(data.categoryCounts, from, to),
        });
      });
      queryClient.getQueriesData<PostOutlineItem[]>({ queryKey: POST_OUTLINE_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData(key, changePostCategory(data, id, to));
      });

      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      // 연달아 여러 글을 옮기는 중이면 마지막 요청이 끝날 때만 서버 값으로 다시 맞춘다
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: MY_POST_OUTLINE_KEY });
        queryClient.invalidateQueries({ queryKey: MY_POSTS_KEY });
        queryClient.invalidateQueries({ queryKey: POST_OUTLINE_KEY });
      }
    },
  });
}
