"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyPostOutline } from "../api/getMyPostOutline";
import { MY_POST_OUTLINE_KEY } from "./queryKeys";

// 내 글 전체(제목·카테고리만) — 카테고리 관리의 '글 이동' 탭과 이름 수정 시 캐시 갱신에 쓴다.
// 로그인 필요. 실패해도 관리 화면의 다른 기능(구조 편집)은 막지 않는다.
export function useMyPostOutline() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: [...MY_POST_OUTLINE_KEY, session?.user.id ?? null],
    queryFn: getMyPostOutline,
    enabled: !isSessionPending && Boolean(session),
    retry: false,
    staleTime: 0,
  });
}
