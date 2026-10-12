"use client";

import { useState, type CSSProperties } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { pickDate, type PickState } from "@/entities/task";
import { fromDateString, toDateString } from "@/shared/lib/date";

type Props = {
  startDate: string | null;
  endDate: string | null;
  // 날짜를 누를 때마다 바로 저장한다(시작일만 눌러도 하루 일정으로 저장되고, 이어서 종료일을 누르면 기간이 된다)
  onChange: (schedule: { startDate: string | null; endDate: string | null }) => void;
  onClose: () => void;
};

// 일정을 고르는 범위 선택 달력. 시작일을 누르고, 기간이면 종료일을 이어서 누른다(종료일만은 고를 수 없다).
// 기간이 정해지거나 같은 날을 한 번 더 누르면(하루 일정) 닫힌다.
export default function ScheduleCalendar({ startDate, endDate, onChange, onClose }: Props) {
  const [state, setState] = useState<PickState>({ startDate, endDate, picking: false });

  function handleDayClick(day: Date) {
    const next = pickDate(state, toDateString(day));
    setState({ startDate: next.startDate, endDate: next.endDate, picking: next.picking });
    onChange({ startDate: next.startDate, endDate: next.endDate });
    if (next.done) onClose();
  }

  function clear() {
    setState({ startDate: null, endDate: null, picking: false });
    onChange({ startDate: null, endDate: null });
    onClose();
  }

  const hasSchedule = state.startDate !== null;

  return (
    <div className="flex flex-col gap-2">
      <DayPicker
        mode="range"
        locale={ko}
        showOutsideDays
        selected={
          state.startDate
            ? { from: fromDateString(state.startDate), to: fromDateString(state.endDate ?? state.startDate) }
            : undefined
        }
        defaultMonth={state.startDate ? fromDateString(state.startDate) : undefined}
        // 고르는 순서(시작일 → 종료일)는 우리 규칙대로 직접 처리한다 — 라이브러리의 범위 확장 동작은 쓰지 않는다
        onDayClick={handleDayClick}
        onSelect={() => {}}
        style={{ "--rdp-accent-color": "#18181b", "--rdp-accent-background-color": "#f4f4f5" } as CSSProperties}
      />

      <div className="flex justify-between border-t border-zinc-100 pt-2">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSchedule}
          className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          일정 지우기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
