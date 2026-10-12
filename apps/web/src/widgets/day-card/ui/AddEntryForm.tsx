"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAddEntry } from "@/entities/daily";

type Props = { date: string };

// 오늘 카드 맨 아래 입력줄. Enter(또는 추가 버튼)로 그날 항목을 더한다. 루틴은 항목의 ⋯ 메뉴에서 만든다.
export default function AddEntryForm({ date }: Props) {
  const addEntry = useAddEntry();
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addEntry.mutate(
      { date, title: trimmed },
      { onError: () => toast.error("할 일을 추가하지 못했어요.") },
    );
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-zinc-100 px-4 py-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할 일 입력..."
        aria-label="할 일 입력"
        maxLength={200}
        className="min-w-0 flex-1 rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
      />
      <button
        type="submit"
        className="shrink-0 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
      >
        추가
      </button>
    </form>
  );
}
