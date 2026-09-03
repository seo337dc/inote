"use client";

import { useState } from "react";
import { CATEGORIES } from "@/entities/category";
import { PostEditor } from "@/shared/ui/editor";

const EMPTY_CONTENT = ["", "<p></p>"];

export default function WritePostForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState("");
  const isContentEmpty = EMPTY_CONTENT.includes(content);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: inote-server의 blog 모듈(POST /blog/posts)이 준비되면 연동.
    // 지금은 BE가 없어서 UI만 확인 — docs/devlog/fe.md에 기록.
    console.log("[발행]", { title, category, content });
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          LLM 챗으로 초안 작성 기능은 Phase 2(inote-ai 연동)에서 추가 예정
        </p>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-5 py-2 text-white disabled:opacity-50"
          disabled={!title.trim() || isContentEmpty}
        >
          발행
        </button>
      </div>
    </form>
  );
}
