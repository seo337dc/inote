"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { moveCategory, type MoveTarget } from "../lib/move";
import type { Category } from "./types";
import { CATEGORIES_QUERY_KEY } from "./useCategories";

const MUTATION_KEY = ["move-category"];

// 낙관적 업데이트: 서버 응답을 기다리지 않고 캐시의 순서를 먼저 바꾼다(로딩 표시 없음).
// 실패하면 이동 전 상태로 되돌리고, 끝난 뒤에는 서버 값으로 조용히 다시 맞춘다.
export function useMoveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ id, ...target }: MoveTarget & { id: string }) =>
      api.patch<Category[]>(`/categories/${id}/move`, target),
    onMutate: async ({ id, ...target }) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_QUERY_KEY });
      const previous = queryClient.getQueryData<Category[]>(CATEGORIES_QUERY_KEY);
      if (previous) {
        const next = moveCategory(previous, id, target);
        if (next) queryClient.setQueryData(CATEGORIES_QUERY_KEY, next);
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(CATEGORIES_QUERY_KEY, context.previous);
    },
    onSettled: () => {
      // 연달아 여러 번 옮기는 중이면 마지막 요청이 끝날 때만 다시 불러온다 (중간 응답이 화면을 되돌리지 않게)
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      }
    },
  });
}
