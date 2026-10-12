"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TaskStatusBadge } from "@/shared/ui/task-status-badge";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/shared/lib/task-status";

type Props = {
  title: string;
  status: TaskStatus;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
};

// 작업 앞의 상태 뱃지를 누르면 세 상태가 나오고 바로 고른다 — 할 일 → 완료로 바로 가도 한 번에 끝난다.
export default function TaskStatusMenu({ title, status, disabled, onChange }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`${title} 상태: ${TASK_STATUS_LABEL[status]}`}
        className="shrink-0 rounded-full hover:opacity-80 disabled:cursor-default disabled:opacity-60"
      >
        <TaskStatusBadge status={status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        {TASK_STATUSES.map((value) => (
          <DropdownMenuItem key={value} onClick={() => value !== status && onChange(value)}>
            <TaskStatusBadge status={value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
