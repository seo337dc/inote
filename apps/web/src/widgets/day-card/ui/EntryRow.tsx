"use client";

import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { TEMP_ID_PREFIX, useCreateRoutine, useToggleEntry, type DailyEntry } from "@/entities/daily";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

type Props = {
  entry: DailyEntry;
  // 오늘 카드에서만 ⋯ 메뉴가 나온다 — [고정 리스트에 추가](이 항목의 제목을 고정 리스트에 복사). 지난 기록은 바꾸지 않는다
  isToday: boolean;
};

export default function EntryRow({ entry, isToday }: Props) {
  const toggleEntry = useToggleEntry();
  const createRoutine = useCreateRoutine();

  // 서버가 진짜 id를 주기 전(낙관적으로 먼저 보여준 항목)에는 조작할 수 없다
  const pending = entry.id.startsWith(TEMP_ID_PREFIX);

  function handleAddToRoutines() {
    createRoutine.mutate(
      { title: entry.title },
      {
        onSuccess: () => toast.success("고정 리스트에 추가했어요."),
        onError: () => toast.error("고정 리스트에 추가하지 못했어요."),
      },
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

      <span className={`min-w-0 flex-1 truncate text-sm ${entry.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
        {entry.title}
      </span>

      {isToday && !pending && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${entry.title} 메뉴`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleAddToRoutines}>고정 리스트에 추가</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
