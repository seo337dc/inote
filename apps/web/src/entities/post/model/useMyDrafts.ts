"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyDrafts } from "../api/getMyDrafts";
import { MY_DRAFTS_KEY } from "./queryKeys";

// 로그인한 내 draft(임시저장, 아직 미발행) 목록 — 글쓰기 진입 모달과 알림 벨이 함께 씀.
export function useMyDrafts() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: MY_DRAFTS_KEY,
    queryFn: getMyDrafts,
    enabled: !isSessionPending && Boolean(session),
  });
}
