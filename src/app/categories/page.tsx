"use client";

import { useState } from "react";
import { CATEGORIES, MOCK_POSTS } from "@/lib/mock-posts";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([...CATEGORIES]);
  const [newCategory, setNewCategory] = useState("");

  function countFor(category: string) {
    return MOCK_POSTS.filter((post) => post.mine && post.category === category).length;
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    // TODO: inote-server의 blog 모듈에 Category CRUD API가 생기면 연동 (docs/devlog/fe.md 참고)
    setCategories((prev) => [...prev, name]);
    setNewCategory("");
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">카테고리 수정</h1>
      <p className="mb-6 text-sm text-zinc-500">
        내 글의 카테고리를 조회·추가합니다. (목업 데이터 · 저장 API 연동 전)
      </p>

      <ul className="mb-6 divide-y divide-zinc-100 rounded border border-zinc-200">
        {categories.map((c) => (
          <li key={c} className="flex items-center justify-between px-4 py-3">
            <span>{c}</span>
            <span className="text-xs text-zinc-400">내 글 {countFor(c)}개</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="새 카테고리 이름"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={!newCategory.trim()}
        >
          추가
        </button>
      </form>
    </div>
  );
}
