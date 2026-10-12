"use client";

import { useState } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  countTasksDone,
  moveId,
  useDeleteGroup,
  useReorderTasks,
  useUpdateGroup,
  type TaskGroup,
} from "@/entities/task";
import { isTempId } from "@/shared/lib/temp-id";
import { Button } from "@/shared/ui/button";
import { StarButton } from "@/shared/ui/star-button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import AddTaskForm from "./AddTaskForm";
import SortableTaskRow from "./SortableTaskRow";

type Props = {
  group: TaskGroup;
  // 처음엔 접힌 묶음 목록으로 보이고, 이름 줄을 누르면 펼쳐지고 다시 누르면 접힌다(상태는 화면이 들고 있다)
  open: boolean;
  onToggle: () => void;
};

// 묶음 하나 = 카드 한 장. 접혀 있으면 이름 줄(펼침 표시·이름·별·완료/전체·⋯ 메뉴)만 보이고,
// 펼치면 작업 목록(상태 뱃지, 끌어서 순서 변경) / 작업 입력줄 / 합계 줄이 나온다.
// 상태별로 나눠 보여주지 않고 사용자가 정한 순서 그대로 한 목록으로 보여준다.
export default function TaskGroupCard({ group, open, onToggle }: Props) {
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const reorderTasks = useReorderTasks();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const pending = isTempId(group.id);
  const { done, total } = countTasksDone(group.tasks);

  // 살짝 움직인 건 클릭으로 보고(distance), 손잡이를 끌었을 때만 드래그로 본다
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    // 서버 응답 전(임시 id) 작업이 섞여 있으면 순서를 저장할 수 없다
    if (!over || group.tasks.some((t) => isTempId(t.id))) return;
    const taskIds = moveId(group.tasks.map((t) => t.id), String(active.id), String(over.id));
    if (taskIds) {
      reorderTasks.mutate({ groupId: group.id, taskIds }, { onError: () => toast.error("순서를 바꾸지 못했어요.") });
    }
  }

  function commitRename() {
    const name = draft.trim();
    setRenaming(false);
    if (!name || name === group.name) {
      setDraft(group.name);
      return;
    }
    updateGroup.mutate({ id: group.id, name }, { onError: () => toast.error("묶음 이름을 바꾸지 못했어요.") });
  }

  function confirmDelete() {
    setConfirmingDelete(false);
    deleteGroup.mutate({ id: group.id }, { onError: () => toast.error("묶음을 삭제하지 못했어요.") });
  }

  return (
    <section
      id={`task-group-${group.id}`}
      aria-label={group.name}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      <div className={`group flex items-center gap-1 px-2 py-1.5 ${open ? "border-b border-zinc-100" : ""}`}>
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setDraft(group.name);
              }
            }}
            maxLength={50}
            aria-label="묶음 이름"
            className="ml-2 min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm font-semibold outline-none focus:border-zinc-500"
          />
        ) : (
          <>
            <h2 className="min-w-0 shrink">
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex min-w-0 items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-zinc-50"
              >
                <ChevronRight className={`size-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`} />
                <span className="truncate">{group.name}</span>
              </button>
            </h2>
            <StarButton
              starred={group.starred}
              label={`${group.name} 묶음`}
              disabled={pending}
              onToggle={() =>
                updateGroup.mutate(
                  { id: group.id, starred: !group.starred },
                  { onError: () => toast.error("중요 표시를 바꾸지 못했어요.") },
                )
              }
            />
            {/* 빈 곳을 눌러도 펼치고 접을 수 있게 하는 영역(키보드·스크린리더는 위의 이름 버튼을 쓴다) */}
            <button type="button" tabIndex={-1} aria-hidden onClick={onToggle} className="h-8 min-w-4 flex-1 self-stretch" />
            <span className="shrink-0 text-xs text-zinc-400">
              {done}/{total}
            </span>
          </>
        )}

        {!pending && !renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`${group.name} 묶음 메뉴`}
              className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setDraft(group.name);
                  setRenaming(true);
                }}
              >
                이름 변경
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmingDelete(true)}>삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {open && (
        <>
        {group.tasks.length > 0 && (
          <DndContext id={`tasks-${group.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul>
                {group.tasks.map((task) => (
                  <SortableTaskRow key={task.id} task={task} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <AddTaskForm groupId={group.id} groupName={group.name} disabled={pending} />

        <p className="border-t border-zinc-100 bg-zinc-50/70 px-4 py-2 text-xs text-zinc-500">
          {total === 0 ? "아직 작업이 없어요" : `${total}개 중 ${done}개 완료`}
        </p>
        </>
      )}

      {confirmingDelete && (
        <Dialog open onOpenChange={(next) => !next && setConfirmingDelete(false)}>
          <DialogContent>
            <DialogTitle>묶음을 삭제할까요?</DialogTitle>
            <DialogDescription>
              {total > 0
                ? `'${group.name}' 묶음과 작업 ${total}개가 함께 삭제돼요. 되돌릴 수 없어요.`
                : `'${group.name}' 묶음이 삭제돼요. 되돌릴 수 없어요.`}
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                취소
              </Button>
              <Button type="button" onClick={confirmDelete}>
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
