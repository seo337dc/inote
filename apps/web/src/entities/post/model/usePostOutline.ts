"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getPostOutline } from "../api/getPostOutline";

// 글 상세 왼쪽 카테고리 트리용 목록. 로그인 여부에 따라 내 비공개 글이 섞이므로
// 세션이 정해진 뒤에 조회하고, 유저별로 캐시를 분리한다. 글을 쓰거나 지운 직후에도
// 상세로 들어오면 바로 최신이 보이도록 매번 다시 확인(staleTime 0)한다.
export function usePostOutline() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: ["post-outline", session?.user.id ?? null],
    queryFn: getPostOutline,
    enabled: !isSessionPending,
    staleTime: 0,
  });
}
