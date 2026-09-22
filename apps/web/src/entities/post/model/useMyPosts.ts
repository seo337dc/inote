"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyPosts } from "../api/getMyPosts";

// 로그인한 내 글 전체(발행+draft) — /my-posts 전용. 전체 공개 피드(findAll)와 달리
// 로그인 필요.
export function useMyPosts() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: ["my-posts"],
    queryFn: getMyPosts,
    enabled: !isSessionPending && Boolean(session),
  });
}
