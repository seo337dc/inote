"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CATEGORIES } from "@/entities/category";
import { PostEditor } from "@/shared/ui/editor";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";

const EMPTY_CONTENT = ["", "<p></p>"];

type Props = {
  post?: Post;
};

type PostBody = {
  title: string;
  category: (typeof CATEGORIES)[number];
  content: string;
};

export default function WritePostForm({ post }: Props) {
  const router = useRouter();
  const isEditing = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    post?.category ?? CATEGORIES[0],
  );
  const [content, setContent] = useState(post?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const isContentEmpty = EMPTY_CONTENT.includes(content);

  const saveMutation = useMutation({
    mutationFn: (body: PostBody) =>
      post ? api.patch(`/blog/posts/${post.id}`, body) : api.post("/blog/posts", body),
    onSuccess: () => {
      router.push(post ? `/posts/${post.id}` : "/");
    },
    onError: () => {
      setError("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/posts/${post!.id}`),
    onSuccess: () => {
      router.push("/");
    },
    onError: () => {
      setError("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate({ title, category, content });
  }

  function handleDelete() {
    if (!post) return;
    if (!window.confirm("정말 삭제하시겠어요? 되돌릴 수 없습니다.")) return;
    setError(null);
    deleteMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="border-b border-zinc-200 pb-2 text-2xl font-bold outline-none"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
        className="w-32 rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <PostEditor content={content} onChange={setContent} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 에디터가 길어져도 저장/삭제 버튼이 항상 화면 하단에 보이도록 고정.
          모바일에선 버튼이 위, 안내 문구가 아래로 (좁은 폭에서 겹치는 것 방지).
          sticky를 씀 — main이 스크롤 컨테이너라 데스크톱 AI 패널 폭만큼 자동으로 좁아짐
          (fixed였다면 뷰포트 전체 폭이라 옆 패널을 덮어버림) */}
      <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-end gap-2 sm:order-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saveMutation.isPending || deleteMutation.isPending}
                className="rounded bg-red-600 px-5 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            )}
            <button
              type="submit"
              className="rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
              disabled={
                !title.trim() ||
                isContentEmpty ||
                saveMutation.isPending ||
                deleteMutation.isPending
              }
            >
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
          <p className="text-xs text-zinc-400 sm:order-1">
            LLM 챗으로 초안 작성 기능은 Phase 2(inote-ai 연동)에서 추가 예정
          </p>
        </div>
      </div>
    </form>
  );
}
