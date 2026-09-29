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
    queryKey: ["post", id],
    queryFn: () => api.get<Post>(`/blog/posts/${id}`),
    enabled: !isSessionPending && Boolean(session),
    retry: false,
  });

  if (isSessionPending) return <PageLoading />;
  if (!session || postQuery.isError) notFound();
  if (!postQuery.data) return <PageLoading />;

  return <PostArticle post={postQuery.data} />;
}
