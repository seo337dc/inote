"use client";

import type { TaskWithGroup } from "@/entities/task";
import TaskRow from "./TaskRow";

type Props = {
  tasks: TaskWithGroup[];
  // 줄의 묶음 이름을 누르면 그 묶음 카드로 이동해서 펼친다
  onOpenGroup: (groupId: string) => void;
};

// "할 일" 탭 맨 위 — 일정이 오늘인 작업을 묶음과 상관없이 모아 보여준다. 없으면 그리지 않는다.
export default function TodaySchedule({ tasks, onOpenGroup }: Props) {
  if (tasks.length === 0) return null;

  return (
    <section aria-label="오늘 일정" className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold">
        오늘 일정<span className="ml-1.5 font-normal text-zinc-400">{tasks.length}</span>
      </h2>
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} groupName={task.groupName} onGroupClick={() => onOpenGroup(task.groupId)} />
        ))}
      </ul>
    </section>
  );
}
