"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getMemoGroups } from "../api/memos";
import type { MemoTargetType } from "./types";

export const MEMO_GROUPS_KEY = ["memos", "groups"] as const;

/**
 * 메모 관리용 — 대상별로 묶은 메모 그룹을 무한 스크롤로 불러온다 (계약: docs/todo/memo.md 4차 GET /memos/groups).
 * targetType을 주면 그 종류만, 생략하면 전체. 종류가 바뀌면 키가 달라져 처음부터 다시 불러온다.
 * groups는 불러온 페이지를 이어 붙인 목록이고, 다음 페이지는 fetchNextPage()로 받는다(hasNextPage로 남았는지 확인).
 * 화면을 열 때마다 최신으로 가져온다(메모장에서 방금 쓴 내용이 보이도록 캐시를 재사용하지 않는다).
 * NEXT_PUBLIC_MEMOS_MOCK=true면 api 계층이 목 저장소를 쓴다.
 */
export function useMemoGroups(targetType?: MemoTargetType) {
  const query = useInfiniteQuery({
    queryKey: [...MEMO_GROUPS_KEY, targetType ?? "all"],
    queryFn: ({ pageParam }) => getMemoGroups({ targetType, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 0,
    gcTime: 0,
  });
  const groups = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  return { ...query, groups };
}
