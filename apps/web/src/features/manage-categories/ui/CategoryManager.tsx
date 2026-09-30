"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useMoveCategory,
  buildCategoryTree,
  evaluateDrop,
  MAX_CATEGORY_DEPTH,
  type Category,
  type CategoryNode,
  type DropZone,
} from "@/entities/category";
import { useMyPosts } from "@/entities/post";
import { cn } from "@/shared/lib/utils";

// 들여쓰기 한 단계 너비(px) — 깊이 2, 3 줄이 부모보다 안쪽에서 시작하도록
const INDENT_PX = 24;

// 하위 카테고리까지 합친 글 수 (글의 카테고리는 이름 문자열이라 이름으로 센다)
function subtreeCount(node: CategoryNode, counts: Record<string, number>): number {
  return (
    (counts[node.name] ?? 0) + node.children.reduce((sum, c) => sum + subtreeCount(c, counts), 0)
  );
}

// 행의 위쪽 30%면 그 앞, 아래쪽 30%면 그 뒤, 가운데면 그 안(하위)으로 놓는 것으로 본다
function zoneAt(pointerY: number, rect: { top: number; height: number }): DropZone {
  const ratio = (pointerY - rect.top) / rect.height;
  if (ratio < 0.3) return "before";
  if (ratio > 0.7) return "after";
  return "inside";
}

type DropState = { overId: string; zone: DropZone; valid: boolean };

export default function CategoryManager() {
  const { data: categories, isPending } = useCategories();
  const myPosts = useMyPosts(1, 1, null);
  const createCategory = useCreateCategory();
  const moveCategory = useMoveCategory();

  const [newRootName, setNewRootName] = useState("");
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropState | null>(null);

  // 클릭(추가 버튼 등)과 구분되도록, 조금 끌어야 드래그로 본다
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const list: Category[] = categories ?? [];
  const tree = buildCategoryTree(list);
  const counts = myPosts.data?.categoryCounts;
  const activeName = list.find((c) => c.id === activeId)?.name;

  function handleAddRoot(e: React.FormEvent) {
    e.preventDefault();
    const name = newRootName.trim();
    if (!name) return;
    createCategory.mutate({ name });
    setNewRootName("");
  }

  function handleAddChild(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    const name = newChildName.trim();
    if (!name) return;
    createCategory.mutate({ name, parentId });
    setNewChildName("");
    setAddingChildOf(null);
  }

  function handleDragMove(event: DragMoveEvent) {
    const { over, active, activatorEvent, delta } = event;
    if (!over || !(activatorEvent instanceof PointerEvent)) {
      setDrop(null);
      return;
    }
    const zone = zoneAt(activatorEvent.clientY + delta.y, over.rect);
    const overId = String(over.id);
    const result = evaluateDrop(list, String(active.id), overId, zone);
    setDrop((prev) =>
      prev?.overId === overId && prev.zone === zone && prev.valid === result.valid
        ? prev
        : { overId, zone, valid: result.valid },
    );
  }

  function handleDragEnd() {
    const dragId = activeId;
    const state = drop;
    setActiveId(null);
    setDrop(null);
    if (!dragId || !state?.valid) return;
    const result = evaluateDrop(list, dragId, state.overId, state.zone);
    if (!result.valid) return;
    moveCategory.mutate(
      { id: dragId, ...result.target },
      { onError: () => toast.error("카테고리를 옮기지 못했어요. 원래대로 되돌렸어요.") },
    );
  }

  if (isPending) {
    return <p className="text-sm text-zinc-400">불러오는 중...</p>;
  }

  return (
    <>
      <form onSubmit={handleAddRoot} className="mb-4 flex gap-2">
        <input
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          placeholder="새 최상위 카테고리 이름"
          aria-label="새 최상위 카테고리 이름"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
          disabled={!newRootName.trim() || createCategory.isPending}
        >
          추가
        </button>
      </form>

      {createCategory.isError && (
        <p role="alert" className="mb-3 text-sm text-red-500">
          카테고리를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {tree.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
          아직 카테고리가 없어요. 위에서 첫 카테고리를 추가해 보세요.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setDrop(null);
          }}
        >
          <ul className="overflow-hidden rounded border border-zinc-200 [&>li:first-child>div:first-child]:border-t-0">
            {tree.map((node) => (
              <CategoryItem
                key={node.id}
                node={node}
                counts={counts}
                activeId={activeId}
                drop={drop}
                addingChildOf={addingChildOf}
                newChildName={newChildName}
                isCreating={createCategory.isPending}
                onNewChildName={setNewChildName}
                onToggleAddChild={(id) => {
                  setAddingChildOf(addingChildOf === id ? null : id);
                  setNewChildName("");
                }}
                onAddChild={handleAddChild}
              />
            ))}
          </ul>
          <DragOverlay dropAnimation={null}>
            {activeName && (
              <div className="w-fit rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-lg">
                {activeName}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      <p className="mt-3 text-xs text-zinc-400">
        줄 왼쪽의 손잡이를 끌어 순서를 바꾸거나 다른 카테고리 안으로 옮길 수 있어요.
      </p>
    </>
  );
}

type ItemProps = {
  node: CategoryNode;
  counts: Record<string, number> | undefined;
  activeId: string | null;
  drop: DropState | null;
  addingChildOf: string | null;
  newChildName: string;
  isCreating: boolean;
  onNewChildName: (value: string) => void;
  onToggleAddChild: (id: string) => void;
  onAddChild: (e: React.FormEvent, parentId: string) => void;
};

function CategoryItem(props: ItemProps) {
  const { node, counts, activeId, drop, addingChildOf, newChildName, isCreating } = props;
  const canAddChild = node.depth < MAX_CATEGORY_DEPTH;
  const isAddingHere = addingChildOf === node.id;
  const indent = (node.depth - 1) * INDENT_PX;

  const { setNodeRef: setDropRef } = useDroppable({ id: node.id });
  const {
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    listeners,
    attributes,
  } = useDraggable({ id: node.id, attributes: { roleDescription: "이동 손잡이" } });

  const dropHere = drop?.valid && drop.overId === node.id ? drop.zone : null;

  return (
    <li className={cn(activeId === node.id && "opacity-40")}>
      <div
        ref={(el) => {
          setDropRef(el);
          setDragRef(el);
        }}
        className={cn(
          "group relative flex items-center gap-2 border-t border-zinc-100 py-2.5 pr-3",
          dropHere === "inside" && "bg-blue-50 ring-1 ring-inset ring-blue-300",
        )}
        style={{ paddingLeft: 8 + indent }}
      >
        {dropHere === "before" && (
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
        )}
        {dropHere === "after" && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500" />
        )}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`${node.name} 이동`}
          className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing [@media(hover:hover)]:opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        {node.depth > 1 && (
          <span aria-hidden className="text-zinc-300">
            └
          </span>
        )}
        <span className={node.depth === 1 ? "font-medium text-zinc-900" : "text-zinc-700"}>
          {node.name}
        </span>
        {counts && <span className="text-xs text-zinc-400">{subtreeCount(node, counts)}</span>}
        {canAddChild && (
          <button
            type="button"
            onClick={() => props.onToggleAddChild(node.id)}
            aria-label={
              isAddingHere ? `${node.name} 하위 카테고리 추가 취소` : `${node.name}의 하위 카테고리 추가`
            }
            // 마우스를 쓸 수 있는 환경에선 줄에 올렸을 때만 보이고, 터치 기기에선 항상 보인다
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
          >
            {isAddingHere ? (
              "취소"
            ) : (
              <>
                <Plus className="size-3" aria-hidden />
                하위 추가
              </>
            )}
          </button>
        )}
      </div>

      {isAddingHere && (
        <form
          onSubmit={(e) => props.onAddChild(e, node.id)}
          className="flex gap-2 border-t border-zinc-100 bg-zinc-50 py-2.5 pr-3"
          style={{ paddingLeft: 8 + indent + INDENT_PX }}
        >
          <input
            autoFocus
            value={newChildName}
            onChange={(e) => props.onNewChildName(e.target.value)}
            placeholder={`${node.name}의 하위 카테고리 이름`}
            aria-label="하위 카테고리 이름"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={!newChildName.trim() || isCreating}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
          >
            추가
          </button>
        </form>
      )}

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CategoryItem key={child.id} {...props} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}
