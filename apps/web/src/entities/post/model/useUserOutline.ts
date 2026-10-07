"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserOutline } from "../api/getUserOutline";
import { USER_OUTLINE_KEY } from "./queryKeys";

// 다른 사람의 글 상세 왼쪽 카테고리 트리용 — 그 작성자의 공개 글·카테고리. userId가 없으면 부르지 않는다.
// 로그인 여부와 상관없는 공개 데이터라 세션을 기다리지 않는다.
export function useUserOutline(userId: string | null) {
  return useQuery({
    queryKey: [...USER_OUTLINE_KEY, userId],
    queryFn: () => getUserOutline(userId as string),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}
