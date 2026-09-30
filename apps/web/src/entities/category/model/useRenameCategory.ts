"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import {
  MY_POSTS_KEY,
  MY_POST_OUTLINE_KEY,
  POST_OUTLINE_KEY,
  type MyPostListPage,
  type MyPostOutlineItem,
  type PostOutlineItem,
} from "@/entities/post";
import { renameCategoryInList, renameCountKey, renamePostCategory } from "../lib/rename";
import type { Category } from "./types";
import { CATEGORIES_QUERY_KEY } from "./useCategories";

const MUTATION_KEY = ["rename-category"];

type Snapshot = [QueryKey, unknown][];

// 낙관적 업데이트: 서버 응답 전에 화면의 이름을 먼저 바꾸고(로딩 표시 없음), 글 캐시의 카테고리 이름도
// 함께 옮긴다. 글이 카테고리를 이름 문자열로 가리키기 때문에, 서버가 글의 category도 같이 바꾼다.
// 실패하면 바꿨던 캐시를 모두 되돌린다.
export function useRenameCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Category>(`/categories/${id}`, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_QUERY_KEY });
      const previousCategories = queryClient.getQueryData<Category[]>(CATEGORIES_QUERY_KEY);
      const oldName = previousCategories?.find((c) => c.id === id)?.name;
      const snapshots: Snapshot = [];

      if (previousCategories) {
        queryClient.setQueryData(CATEGORIES_QUERY_KEY, renameCategoryInList(previousCategories, id, name));
      }
      if (!oldName) return { previousCategories, snapshots };

      // 나의 글 목록(카테고리별 개수 포함)
      queryClient.getQueriesData<MyPostListPage>({ queryKey: MY_POSTS_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData<MyPostListPage>(key, {
          ...data,
          pinned: renamePostCategory(data.pinned, oldName, name),
          items: renamePostCategory(data.items, oldName, name),
          categoryCounts: renameCountKey(data.categoryCounts, oldName, name),
        });
      });
      // 글 상세의 카테고리 트리용 목록, 관리 화면의 내 글 목록
      queryClient.getQueriesData<PostOutlineItem[]>({ queryKey: POST_OUTLINE_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData(key, renamePostCategory(data, oldName, name));
      });
      queryClient.getQueriesData<MyPostOutlineItem[]>({ queryKey: MY_POST_OUTLINE_KEY }).forEach(([key, data]) => {
        if (!data) return;
        snapshots.push([key, data]);
        queryClient.setQueryData(key, renamePostCategory(data, oldName, name));
      });

      return { previousCategories, snapshots };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      if (context.previousCategories) {
        queryClient.setQueryData(CATEGORIES_QUERY_KEY, context.previousCategories);
      }
      context.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      // 연달아 여러 번 바꾸는 중이면 마지막 요청이 끝날 때만 서버 값으로 다시 맞춘다
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: MY_POSTS_KEY });
        queryClient.invalidateQueries({ queryKey: POST_OUTLINE_KEY });
        queryClient.invalidateQueries({ queryKey: MY_POST_OUTLINE_KEY });
      }
    },
  });
}
