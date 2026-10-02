"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyPosts } from "../api/getMyPosts";
import { MY_POSTS_KEY } from "./queryKeys";

// 로그인한 내 글(발행+draft) 한 페이지 — /my-posts 전용. 전체 공개 피드(findAll)와 달리
// 로그인 필요. 페이지를 넘길 때 이전 목록을 유지한 채로 로딩해서 깜빡임을 막는다.
export function useMyPosts(
  page: number,
  pinnedPage: number,
  category: string | null,
  q: string | null = null,
) {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: [...MY_POSTS_KEY, page, pinnedPage, category, q],
    queryFn: () => getMyPosts(page, pinnedPage, category, q),
    enabled: !isSessionPending && Boolean(session),
    placeholderData: keepPreviousData,
  });
}
