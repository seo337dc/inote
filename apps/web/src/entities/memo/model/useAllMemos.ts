"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllMemos } from "../api/memos";

export const ALL_MEMOS_KEY = ["memos", "all"] as const;

/**
 * 내 메모 전체(메모 관리 화면용) — 종류별 탭은 화면에서 거른다.
 * NEXT_PUBLIC_MEMOS_MOCK=true면 api 계층이 서버 대신 메모리 안의 목 저장소를 쓴다(서버 준비 전 UI 확인용, model/mock.ts).
 * 화면을 열 때마다 최신으로 가져온다(메모장에서 방금 쓴 내용이 보이도록 캐시를 재사용하지 않는다).
 */
export function useAllMemos() {
  return useQuery({
    queryKey: ALL_MEMOS_KEY,
    queryFn: getAllMemos,
    staleTime: 0,
    gcTime: 0,
  });
}
