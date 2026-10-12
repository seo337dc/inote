import { CircleCheck, Circle, Contrast } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/shared/lib/task-status";

type Props = { status: TaskStatus; className?: string };

// ○ 할 일 / ◐ 진행 중 / ● 완료 — 색만으로 구분하지 않도록 모양도 다르다.
export function TaskStatusIcon({ status, className }: Props) {
  const label = TASK_STATUS_LABEL[status];
  if (status === "DONE") {
    return <CircleCheck role="img" aria-label={label} className={cn("size-4 text-zinc-900", className)} />;
  }
  if (status === "IN_PROGRESS") {
    return <Contrast role="img" aria-label={label} className={cn("size-4 text-blue-600", className)} />;
  }
  return <Circle role="img" aria-label={label} className={cn("size-4 text-zinc-400", className)} />;
}
