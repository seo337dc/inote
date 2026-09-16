"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/ui/button";
import Markdown from "@/shared/ui/Markdown";
import type { MandalartItem } from "@/entities/mandalart";

const OWNER_USER_ID = process.env.NEXT_PUBLIC_MANDALART_OWNER_USER_ID;

type Props = {
  item: MandalartItem;
};

// 소유자 여부는 여기서 UI 노출만 판단 — 실제 권한은 서버(PATCH /mandalart/:id)가 강제함.
export default function MandalartContent({ item }: Props) {
  const { data: session } = useSession();
  const isOwner = Boolean(session && session.user.id === OWNER_USER_ID);

  const [done, setDone] = useState(item.done);
  const [savedContent, setSavedContent] = useState(item.content);
  const [draft, setDraft] = useState(item.content);
  const [editing, setEditing] = useState(false);

  const doneMutation = useMutation({
    mutationFn: (nextDone: boolean) => api.patch(`/mandalart/${item.id}`, { done: nextDone }),
    onError: (_, nextDone) => setDone(!nextDone),
  });

  const contentMutation = useMutation({
    mutationFn: (content: string) => api.patch(`/mandalart/${item.id}`, { content }),
    onSuccess: (_, content) => {
      setSavedContent(content);
      setEditing(false);
    },
  });

  function handleToggleDone() {
    const next = !done;
    setDone(next);
    doneMutation.mutate(next);
  }

  function handleStartEdit() {
    setDraft(savedContent);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(savedContent);
    setEditing(false);
  }

  function handleSave() {
    contentMutation.mutate(draft);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <label
          className={`flex items-center gap-1.5 text-sm ${
            isOwner ? "cursor-pointer text-zinc-600" : "text-zinc-400"
          }`}
        >
          <input
            type="checkbox"
            checked={done}
            disabled={!isOwner || doneMutation.isPending}
            onChange={handleToggleDone}
            className="size-4 accent-blue-600 disabled:cursor-not-allowed"
          />
          완료
        </label>
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            placeholder="마크다운으로 정리 내용을 작성하세요..."
            className="w-full resize-none rounded border border-zinc-300 p-4 font-mono text-sm outline-none"
          />
          {contentMutation.isError && (
            <p className="mt-2 text-sm text-red-500">저장에 실패했어요. 다시 시도해주세요.</p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={contentMutation.isPending}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={contentMutation.isPending}>
              {contentMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {isOwner && (
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                수정
              </Button>
            </div>
          )}
          <div className="min-h-[8rem] rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
            {savedContent.trim() ? (
              <Markdown text={savedContent} />
            ) : (
              <p className="text-zinc-400">아직 정리된 내용이 없어요.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
