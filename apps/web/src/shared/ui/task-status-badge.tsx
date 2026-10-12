import { cn } from "@/shared/lib/utils";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/shared/lib/task-status";

const STYLE: Record<TaskStatus, string> = {
  TODO: "bg-zinc-100 text-zinc-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DONE: "bg-green-50 text-green-700",
};

type Props = { status: TaskStatus; className?: string };

// 작업 상태를 색상 뱃지로 — 할 일(회색) / 진행 중(파랑) / 완료(초록). 색만으로 구분하지 않도록 글자도 함께 보인다.
export function TaskStatusBadge({ status, className }: Props) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", STYLE[status], className)}>
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
