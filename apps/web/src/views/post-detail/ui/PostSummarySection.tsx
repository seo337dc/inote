"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostAiSummary } from "@/entities/post";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";

type Props = {
  postId: string;
  authorId: string | null;
  initialSummary: string[];
};

// 글 상세의 AI 개요. 작성자에게는 설정(⚙) 메뉴에서 "AI 다시 요약하기"를 열어 준다.
// 요약이 아직 없는 글도 작성자는 여기서 바로 만들 수 있도록 카드를 보여준다.
export default function PostSummarySection({ postId, authorId, initialSummary }: Props) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState(initialSummary);
  const isAuthor = Boolean(authorId) && session?.user.id === authorId;

  const mutation = useMutation({
    mutationFn: () => api.post<{ summary: string[] }>(`/blog/posts/${postId}/summarize`, {}),
    onSuccess: (data) => {
      setSummary(data.summary);
      // 수정 화면이 들고 있는 이전 요약 캐시가 남지 않도록 비운다
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("AI 개요를 다시 만들었어요.");
    },
    onError: () => toast.error("AI 요약에 실패했어요. 잠시 후 다시 시도해 주세요."),
  });

  if (summary.length === 0 && !isAuthor) return null;

  return (
    <PostAiSummary
      summary={summary}
      onResummarize={isAuthor ? () => mutation.mutate() : undefined}
      resummarizing={mutation.isPending}
    />
  );
}
