"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "@/entities/task";
import { isTempId } from "@/shared/lib/temp-id";
import TaskRow from "./TaskRow";

// 묶음 카드 안의 한 줄 — 왼쪽 손잡이를 잡고 위아래로 끌어 순서를 바꾼다(키보드: 손잡이에서 Space → 방향키 → Space).
export default function SortableTaskRow({ task }: { task: Task }) {
  // 서버 응답 전(임시 id) 작업은 순서를 바꿀 수 없다
  const pending = isTempId(task.id);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: pending,
  });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      disabled={pending}
      aria-label={`${task.title} 순서 변경`}
      className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent [@media(hover:none)]:opacity-100"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <TaskRow
      task={task}
      handle={handle}
      liRef={setNodeRef}
      liStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  );
}
