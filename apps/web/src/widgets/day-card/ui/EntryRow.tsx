"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  TEMP_ID_PREFIX,
  useDeleteRoutine,
  useMakeRoutine,
  useRenameRoutine,
  useToggleEntry,
  type DailyEntry,
} from "@/entities/daily";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

type Props = {
  entry: DailyEntry;
  // 오늘 카드에서만 ⋯ 메뉴가 나온다 — 그날 항목은 "매일 반복으로 만들기", 루틴은 이름 수정·삭제 (지난 기록은 바꾸지 않는다)
  isToday: boolean;
};

export default function EntryRow({ entry, isToday }: Props) {
  const toggleEntry = useToggleEntry();
  const makeRoutine = useMakeRoutine();
  const renameRoutine = useRenameRoutine();
  const deleteRoutine = useDeleteRoutine();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.title);

  // 서버가 진짜 id를 주기 전(낙관적으로 먼저 보여준 항목)에는 조작할 수 없다
  const pending = entry.id.startsWith(TEMP_ID_PREFIX);
  // 루틴으로 만드는 중(서버가 진짜 루틴 id를 주기 전)에는 이름 수정·삭제를 막는다
  const routinePending = entry.routineId?.startsWith(TEMP_ID_PREFIX) ?? false;
  const showMenu = isToday && !pending && !routinePending;

  function commitRename() {
    const title = draft.trim();
    setEditing(false);
    if (!title || title === entry.title || !entry.routineId) {
      setDraft(entry.title);
      return;
    }
    renameRoutine.mutate(
      { routineId: entry.routineId, title, today: entry.date },
      { onError: () => toast.error("이름을 바꾸지 못했어요.") },
    );
  }

  function handleMakeRoutine() {
    makeRoutine.mutate(
      { entryId: entry.id, date: entry.date },
      { onError: () => toast.error("매일 반복으로 만들지 못했어요.") },
    );
  }

  function handleDelete() {
    if (!entry.routineId) return;
    deleteRoutine.mutate(
      { routineId: entry.routineId, today: entry.date },
      { onError: () => toast.error("루틴을 삭제하지 못했어요.") },
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <input
        type="checkbox"
        checked={entry.done}
        disabled={pending}
        onChange={(e) =>
          toggleEntry.mutate(
            { id: entry.id, date: entry.date, done: e.target.checked },
            { onError: () => toast.error("체크하지 못했어요.") },
          )
        }
        aria-label={`${entry.title} 완료`}
        className="size-4 shrink-0 cursor-pointer accent-zinc-900"
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(entry.title);
            }
          }}
          maxLength={200}
          aria-label="루틴 이름"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
        />
      ) : (
        <span className={`min-w-0 flex-1 truncate text-sm ${entry.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
          {entry.title}
        </span>
      )}

      {entry.routineId && (
        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">매일</span>
      )}

      {showMenu && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${entry.title} 메뉴`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {entry.routineId === null ? (
              <DropdownMenuItem onClick={handleMakeRoutine}>매일 반복으로 만들기</DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setDraft(entry.title);
                    setEditing(true);
                  }}
                >
                  이름 수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>루틴 삭제</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
