"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/entities/category";
import { PostEditor } from "@/shared/ui/editor";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";

const EMPTY_CONTENT = ["", "<p></p>"];

type Props = {
  post?: Post;
};

export default function WritePostForm({ post }: Props) {
  const router = useRouter();
  const isEditing = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    post?.category ?? CATEGORIES[0],
  );
  const [content, setContent] = useState(post?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isContentEmpty = EMPTY_CONTENT.includes(content);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (post) {
        await api.patch(`/blog/posts/${post.id}`, { title, category, content });
        router.push(`/posts/${post.id}`);
      } else {
        await api.post("/blog/posts", { title, category, content });
        router.push("/");
      }
    } catch {
      setError("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm("정말 삭제하시겠어요? 되돌릴 수 없습니다.")) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/blog/posts/${post.id}`);
      router.push("/");
    } catch {
      setError("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-24">
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

      {/* 에디터가 길어져도 저장/삭제 버튼이 항상 화면 하단에 보이도록 고정 */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <p className="text-xs text-zinc-400">
            LLM 챗으로 초안 작성 기능은 Phase 2(inote-ai 연동)에서 추가 예정
          </p>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting || deleting}
                className="rounded bg-red-600 px-5 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
            <button
              type="submit"
              className="rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
              disabled={!title.trim() || isContentEmpty || submitting || deleting}
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
