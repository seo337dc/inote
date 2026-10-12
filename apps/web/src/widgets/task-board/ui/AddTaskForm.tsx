"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateTask } from "@/entities/task";
import { formatDateRange } from "@/shared/lib/date";
import { Popover, PopoverContent } from "@/shared/ui/popover";
import ScheduleCalendar from "./ScheduleCalendar";

type Props = { groupId: string; groupName: string; disabled?: boolean };

type Schedule = { startDate: string | null; endDate: string | null };
const NO_SCHEDULE: Schedule = { startDate: null, endDate: null };

// 묶음 카드 안의 입력줄 — 제목 + [일정 추가] 버튼(누르면 달력 팝업) + 추가.
// 일정은 선택이라 안 골라도 되고(없음), 고르면 버튼 자리에 날짜가 보인다. "추가"를 눌러야 작업과 함께 저장된다.
export default function AddTaskForm({ groupId, groupName, disabled }: Props) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(NO_SCHEDULE);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scheduleButtonRef = useRef<HTMLButtonElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      { groupId, title: trimmed, startDate: schedule.startDate, endDate: schedule.endDate },
      { onError: () => toast.error("작업을 추가하지 못했어요.") },
    );
    setTitle("");
    setSchedule(NO_SCHEDULE);
  }

  const scheduleText = schedule.startDate ? formatDateRange(schedule.startDate, schedule.endDate) : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="작업 입력..."
        aria-label={`${groupName}에 작업 추가`}
        maxLength={200}
        disabled={disabled}
        className="min-w-0 flex-1 rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50"
      />
      <button
        type="button"
        ref={scheduleButtonRef}
        disabled={disabled}
        onClick={() => setCalendarOpen(true)}
        aria-label={scheduleText ? `${groupName} 작업 일정 변경 (${scheduleText})` : `${groupName} 작업 일정 추가`}
        className={`shrink-0 rounded px-2.5 py-1.5 text-sm disabled:opacity-50 ${
          scheduleText
            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        }`}
      >
        {scheduleText ?? "일정 추가"}
      </button>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverContent anchor={scheduleButtonRef} aria-label={`${groupName} 작업 일정 선택`}>
          <ScheduleCalendar
            startDate={schedule.startDate}
            endDate={schedule.endDate}
            onChange={setSchedule}
            onClose={() => setCalendarOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <button type="submit" className="shrink-0 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">
        추가
      </button>
    </form>
  );
}
