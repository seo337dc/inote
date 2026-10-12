"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateGroup } from "@/entities/task";

// 카드 목록 맨 아래의 점선 카드 — 누르면 이름 입력줄이 펼쳐진다(모달 없음). 만들어진 묶음은 바로 펼쳐서 작업을 넣을 수 있게 한다.
export default function NewGroupCard({ onCreated }: { onCreated?: (id: string) => void }) {
  const createGroup = useCreateGroup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function close() {
    setOpen(false);
    setName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createGroup.mutate(
      { name: trimmed },
      { onSuccess: (group) => onCreated?.(group.id), onError: () => toast.error("묶음을 만들지 못했어요.") },
    );
    close();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-sm text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
      >
        <Plus className="size-4" />새 묶음
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        placeholder="묶음 이름"
        aria-label="새 묶음 이름"
        maxLength={50}
        className="min-w-0 flex-1 rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
      />
      <button type="submit" className="shrink-0 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">
        만들기
      </button>
      <button
        type="button"
        onClick={close}
        className="shrink-0 rounded px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      >
        취소
      </button>
    </form>
  );
}
