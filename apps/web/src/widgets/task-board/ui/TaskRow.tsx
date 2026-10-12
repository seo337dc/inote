"use client";

import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { isOverdue, useDeleteTask, useUpdateTask, type Task } from "@/entities/task";
import { formatDateRange, todayKst } from "@/shared/lib/date";
import { isTempId } from "@/shared/lib/temp-id";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Popover, PopoverContent } from "@/shared/ui/popover";
import { StarButton } from "@/shared/ui/star-button";
import ScheduleCalendar from "./ScheduleCalendar";
import TaskStatusMenu from "./TaskStatusMenu";

type Props = {
  task: Task;
  // "오늘 일정" 영역에서는 제목 앞에 어느 묶음의 작업인지 칩으로 보여주고, 누르면 그 묶음으로 이동한다
  groupName?: string;
  onGroupClick?: () => void;
  // 묶음 카드 안에서만 순서를 바꿀 수 있다 — 끌기 손잡이와 드래그 상태는 SortableTaskRow가 넘겨 준다
  handle?: ReactNode;
  liRef?: Ref<HTMLLIElement>;
  liStyle?: CSSProperties;
  dragging?: boolean;
};

type Editing = "title" | null;

export default function TaskRow({ task, groupName, onGroupClick, handle, liRef, liStyle, dragging = false }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState<Editing>(null);
  // 일정을 고르는 달력 팝업 — 날짜 칩을 누르거나 ⋯ 메뉴의 '일정 변경'으로 연다(일정이 없는 작업은 메뉴로만 들어간다)
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateAnchorRef = useRef<HTMLSpanElement>(null);
  const [draft, setDraft] = useState(task.title);

  // 서버가 진짜 id를 주기 전(낙관적으로 먼저 보여준 작업)에는 조작할 수 없다
  const pending = isTempId(task.id);
  const done = task.status === "DONE";
  const overdue = isOverdue(task, todayKst());

  function commitTitle() {
    const title = draft.trim();
    setEditing(null);
    if (!title || title === task.title) {
      setDraft(task.title);
      return;
    }
    updateTask.mutate({ id: task.id, title }, { onError: () => toast.error("이름을 바꾸지 못했어요.") });
  }

  function commitDates(dates: { startDate: string | null; endDate: string | null }) {
    updateTask.mutate({ id: task.id, ...dates }, { onError: () => toast.error("일정을 바꾸지 못했어요.") });
  }

  return (
    <li
      ref={liRef}
      style={liStyle}
      className={`group flex items-center gap-3 py-2.5 pr-4 ${handle ? "pl-2" : "pl-4"} ${dragging ? "relative z-10 bg-white shadow-md" : ""}`}
    >
      {handle}
      <TaskStatusMenu
        title={task.title}
        status={task.status}
        disabled={pending}
        onChange={(status) =>
          updateTask.mutate({ id: task.id, status }, { onError: () => toast.error("상태를 바꾸지 못했어요.") })
        }
      />

      {groupName && (
        <button
          type="button"
          onClick={onGroupClick}
          aria-label={`${groupName} 묶음으로 이동`}
          className="max-w-32 shrink-0 truncate rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
        >
          {groupName}
        </button>
      )}

      {editing === "title" ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setEditing(null);
              setDraft(task.title);
            }
          }}
          maxLength={200}
          aria-label="작업 이름"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
        />
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className={`min-w-0 truncate text-sm ${done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
            {task.title}
          </span>
          <StarButton
            starred={task.starred}
            label={task.title}
            disabled={pending}
            onToggle={() =>
              updateTask.mutate({ id: task.id, starred: !task.starred }, { onError: () => toast.error("중요 표시를 바꾸지 못했어요.") })
            }
          />
        </div>
      )}

      <span ref={dateAnchorRef} className="shrink-0">
        {task.startDate && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setCalendarOpen(true)}
            aria-label={`${task.title} 일정 변경 (${formatDateRange(task.startDate, task.endDate)})`}
            className={`rounded px-1.5 py-0.5 text-xs disabled:cursor-default ${
              overdue ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            {formatDateRange(task.startDate, task.endDate)}
          </button>
        )}
      </span>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverContent anchor={dateAnchorRef} aria-label={`${task.title} 일정 선택`}>
          <ScheduleCalendar
            startDate={task.startDate}
            endDate={task.endDate}
            onChange={commitDates}
            onClose={() => setCalendarOpen(false)}
          />
        </PopoverContent>
      </Popover>

      {!pending && editing === null && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${task.title} 메뉴`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setDraft(task.title);
                setEditing("title");
              }}
            >
              이름 수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCalendarOpen(true)}>일정 변경</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteTask.mutate({ id: task.id }, { onError: () => toast.error("작업을 삭제하지 못했어요.") })}
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
