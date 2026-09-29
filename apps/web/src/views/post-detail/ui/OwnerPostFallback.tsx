"use client";

import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Post } from "@/entities/post";
import { PageLoading } from "@/shared/ui/page-loading";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import PostArticle from "./PostArticle";

// 서버가 익명으로 봐서 404가 나온 글(비공개·draft)을, 브라우저가 로그인 쿠키를 실어 다시 조회.
// 작성자 본인이면 글을 보여주고, 그 외(비로그인·남의 글·진짜 없는 글)는 기존 404 화면.
export default function OwnerPostFallback({ id }: { id: string }) {
  const { data: session, isPending: isSessionPending } = useSession();
  const postQuery = useQuery({
    // 글쓰기 폼의 ["post", id] 캐시와 분리하고 캐시도 남기지 않는다 — 수정·저장 직후에
    // 들어와도 옛 본문/AI 요약이 아니라 항상 서버의 최신 글을 보여주기 위함.
    queryKey: ["post-detail", id],
    queryFn: () => api.get<Post>(`/blog/posts/${id}`),
    enabled: !isSessionPending && Boolean(session),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (isSessionPending) return <PageLoading />;
  if (!session || postQuery.isError) notFound();
  if (!postQuery.data) return <PageLoading />;

  return <PostArticle post={postQuery.data} />;
}
