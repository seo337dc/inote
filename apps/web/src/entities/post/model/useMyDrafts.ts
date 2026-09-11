"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import type { Post } from "./types";

// 로그인한 내 draft(임시저장, 아직 미발행) 목록 — 글쓰기 진입 모달과 알림 벨이 함께 씀.
export function useMyDrafts() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: ["my-drafts"],
    queryFn: () => api.get<Post[]>("/blog/posts/mine/drafts"),
    enabled: !isSessionPending && Boolean(session),
  });
}
