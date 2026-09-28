"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyReadingLogDrafts } from "../api/getMyReadingLogDrafts";

// 로그인한 내 독서 기록 draft(임시저장, 아직 미발행) 목록 — 작성 페이지 진입 시
// 이어 쓸 draft가 있는지 확인하는 용도.
export function useMyReadingLogDrafts() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: ["my-reading-log-drafts"],
    queryFn: getMyReadingLogDrafts,
    enabled: !isSessionPending && Boolean(session),
  });
}
