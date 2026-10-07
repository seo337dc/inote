"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
} from "@dnd-kit/core";
import { FileText, GripVertical, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_DEPTH,
  checkNewCategoryName,
  useCategories,
  useCreateCategory,
  type NewNameCheck,
} from "@/entities/category";
import {
  useMyPostOutline,
  useMovePostCategory,
  type MyPostOutlineItem,
} from "@/entities/post";
import { cn } from "@/shared/lib/utils";
import {
  buildPostFolders,
  expandableKeys,
  findPost,
  resolvePostDrop,
  type PostFolder,
} from "../lib/buildPostFolders";

const INDENT_PX = 24;

// 글 이동 탭 — 카테고리 폴더를 + / − 로 열면 그 안에 내 글이 보인다.
// 글 줄의 손잡이(⋮⋮)를 끌어 다른 폴더에 놓으면 그 글의 카테고리가 바뀐다.
export default function PostMover() {
  const categoriesQuery = useCategories();
  const postsQuery = useMyPostOutline();
  const movePost = useMovePostCategory();
  const createCategory = useCreateCategory();
  // 열어 둔 폴더의 key — 기본은 모두 접힘
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 끌고 있는 글의 id, 지금 그 위에 있는 폴더의 key
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [overFolderKey, setOverFolderKey] = useState<string | null>(null);
  // 폴더 추가: 최상위 입력값, 하위를 추가하는 중인 폴더(key)와 그 입력값, 이름 검사 오류(어느 입력줄의 것인지 scope로 구분)
  const [newRootName, setNewRootName] = useState("");
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [nameError, setNameError] = useState<{ scope: string; check: NewNameCheck } | null>(null);

  // 클릭(제목 링크, +/− 버튼)과 구분되도록 조금 끌어야 드래그로 본다
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const folders = useMemo(
    () => buildPostFolders(categoriesQuery.data ?? [], postsQuery.data ?? []),
    [categoriesQuery.data, postsQuery.data],
  );

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 이름 검사를 통과하면 추가하고 true. 겹치는 이름이면 추가하지 않고 그 입력줄 아래에 안내를 띄운다
  function tryCreate(scope: string, rawName: string, parentId?: string): boolean {
    const check = checkNewCategoryName(categoriesQuery.data ?? [], rawName);
    if (check !== "ok") {
      setNameError({ scope, check });
      return false;
    }
    setNameError(null);
    createCategory.mutate({ name: rawName.trim(), ...(parentId ? { parentId } : {}) });
    return true;
  }

  function handleAddRoot(e: React.FormEvent) {
    e.preventDefault();
    if (tryCreate("root", newRootName)) setNewRootName("");
  }

  function handleAddChild(e: React.FormEvent, parentKey: string) {
    e.preventDefault();
    if (!tryCreate(parentKey, newChildName, parentKey)) return;
    // 새 하위 폴더가 바로 보이도록 부모를 펼친다
    setExpanded((prev) => new Set(prev).add(parentKey));
    setNewChildName("");
    setAddingChildOf(null);
  }

  function toggleAddChild(key: string) {
    setNameError(null);
    setNewChildName("");
    setAddingChildOf((prev) => (prev === key ? null : key));
  }

  const addProps: AddChildProps = {
    addingKey: addingChildOf,
    name: newChildName,
    error: nameError,
    isCreating: createCategory.isPending,
    onToggle: toggleAddChild,
    onChangeName: (value) => {
      setNewChildName(value);
      setNameError(null);
    },
    onSubmit: handleAddChild,
  };

  const activePost = activePostId
    ? findPost(folders, activePostId)?.post
    : null;
  // 지금 놓아도 되는 폴더의 key (없으면 null) — 놓을 수 없는 자리는 강조하지 않는다
  const validDropKey =
    activePostId &&
    overFolderKey &&
    resolvePostDrop(folders, activePostId, overFolderKey)
      ? overFolderKey
      : null;

  function handleDragOver(event: DragOverEvent) {
    setOverFolderKey(
      (event.over?.data.current?.folderKey as string | undefined) ?? null,
    );
  }

  function handleDragEnd() {
    const postId = activePostId;
    const folderKey = overFolderKey;
    setActivePostId(null);
    setOverFolderKey(null);
    if (!postId || !folderKey) return;
    const drop = resolvePostDrop(folders, postId, folderKey);
    if (!drop) return;
    // 옮긴 글이 바로 보이도록 도착 폴더를 펼친다
    setExpanded((prev) => new Set(prev).add(folderKey));
    movePost.mutate(drop, {
      onError: () => toast.error("글을 옮기지 못했어요. 원래대로 되돌렸어요."),
    });
  }

  if (categoriesQuery.isPending || postsQuery.isPending) {
    return <p className="text-sm text-zinc-400">불러오는 중...</p>;
  }

  if (postsQuery.isError) {
    return (
      <div className="rounded border border-dashed border-zinc-200 py-10 text-center">
        <p className="text-sm text-zinc-500">내 글 목록을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => void postsQuery.refetch()}
          className="mt-3 rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if ((postsQuery.data ?? []).length === 0) {
    return (
      <p className="rounded border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
        아직 옮길 글이 없어요.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={handleAddRoot} className="mb-1 flex gap-2">
        <input
          value={newRootName}
          onChange={(e) => {
            setNewRootName(e.target.value);
            setNameError(null);
          }}
          placeholder="새 최상위 폴더 이름"
          aria-label="새 최상위 폴더 이름"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={!newRootName.trim() || createCategory.isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
        >
          추가
        </button>
      </form>
      {nameError?.scope === "root" && <NameErrorText check={nameError.check} />}
      {createCategory.isError && (
        <p role="alert" className="mt-1 text-sm text-red-500">
          폴더를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <div className="mb-3 mt-4 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          폴더의 + 로 글을 열고, 글 왼쪽 손잡이(⋮⋮)를 다른 폴더로 끌어 놓으면 옮겨져요.
        </p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setExpanded(new Set(expandableKeys(folders)))}
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            모두 펼치기
          </button>
          <button
            type="button"
            onClick={() => setExpanded(new Set())}
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            모두 접기
          </button>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e) => setActivePostId(String(e.active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActivePostId(null);
          setOverFolderKey(null);
        }}
      >
        <ul className="overflow-hidden rounded border border-zinc-200 [&>li:first-child>div:first-child]:border-t-0">
          {folders.map((folder) => (
            <FolderItem
              key={folder.key}
              folder={folder}
              depth={1}
              expanded={expanded}
              onToggle={toggle}
              activePostId={activePostId}
              validDropKey={validDropKey}
              add={addProps}
            />
          ))}
        </ul>
        <DragOverlay dropAnimation={null}>
          {activePost && (
            <div className="flex w-fit max-w-xs items-center gap-2 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-lg">
              <FileText
                className="size-3.5 shrink-0 text-zinc-400"
                aria-hidden
              />
              <span className="truncate">
                {activePost.title || "제목 없음"}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}

// 폴더 추가(하위) 입력줄에 필요한 상태와 핸들러 — 모든 FolderItem이 같은 값을 공유한다
type AddChildProps = {
  // 하위 추가 입력줄이 열려 있는 폴더의 key
  addingKey: string | null;
  name: string;
  error: { scope: string; check: NewNameCheck } | null;
  isCreating: boolean;
  onToggle: (key: string) => void;
  onChangeName: (value: string) => void;
  onSubmit: (e: React.FormEvent, parentKey: string) => void;
};

function NameErrorText({ check }: { check: NewNameCheck }) {
  const message =
    check === "duplicate"
      ? "이미 있는 이름이에요. 다른 이름을 써 주세요."
      : check === "too-long"
        ? `이름은 ${MAX_CATEGORY_NAME_LENGTH}자까지 쓸 수 있어요.`
        : "이름을 입력해 주세요.";
  return (
    <p role="alert" className="mt-1 text-sm text-red-500">
      {message}
    </p>
  );
}

type FolderProps = {
  folder: PostFolder;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  activePostId: string | null;
  validDropKey: string | null;
  add: AddChildProps;
};

function FolderItem({
  folder,
  depth,
  expanded,
  onToggle,
  activePostId,
  validDropKey,
  add,
}: FolderProps) {
  const { setNodeRef: setDropRef } = useDroppable({
    id: `folder:${folder.key}`,
    data: { folderKey: folder.key },
  });
  const isDropTarget = validDropKey === folder.key;
  const hasContent = folder.folders.length > 0 || folder.posts.length > 0;
  const isOpen = hasContent && expanded.has(folder.key);
  const indent = (depth - 1) * INDENT_PX;
  // 하위는 최대 3단계까지. 카테고리 트리에 없는 이름의 폴더(목록에 없는 카테고리)에는 추가할 수 없다
  const canAddChild = depth < MAX_CATEGORY_DEPTH && !folder.isOrphan;
  const isAddingHere = add.addingKey === folder.key;

  return (
    <li>
      <div
        ref={setDropRef}
        className={cn(
          "group flex items-center gap-2 border-t border-zinc-100 py-2.5 pr-3",
          isDropTarget && "bg-blue-50 ring-1 ring-inset ring-blue-300",
        )}
        style={{ paddingLeft: 12 + indent }}
      >
        {hasContent ? (
          <button
            type="button"
            onClick={() => onToggle(folder.key)}
            aria-expanded={isOpen}
            aria-label={
              isOpen ? `${folder.name} 접기` : `${folder.name} 펼치기`
            }
            className="flex size-4 shrink-0 items-center justify-center rounded border border-zinc-300 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            {isOpen ? (
              <Minus className="size-3" aria-hidden />
            ) : (
              <Plus className="size-3" aria-hidden />
            )}
          </button>
        ) : (
          <span aria-hidden className="size-4 shrink-0" />
        )}
        <span
          className={
            depth === 1 ? "font-medium text-zinc-900" : "text-zinc-700"
          }
        >
          {folder.name}
        </span>
        <span className="text-xs text-zinc-400">{folder.total}</span>
        {folder.isOrphan && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600">
            목록에 없는 카테고리
          </span>
        )}
        {canAddChild && (
          <button
            type="button"
            onClick={() => add.onToggle(folder.key)}
            aria-label={
              isAddingHere
                ? `${folder.name} 하위 폴더 추가 취소`
                : `${folder.name}의 하위 폴더 추가`
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
        <>
          <form
            onSubmit={(e) => add.onSubmit(e, folder.key)}
            className="flex gap-2 border-t border-zinc-100 bg-zinc-50 py-2.5 pr-3"
            style={{ paddingLeft: 12 + indent + INDENT_PX }}
          >
            <input
              autoFocus
              value={add.name}
              onChange={(e) => add.onChangeName(e.target.value)}
              placeholder={`${folder.name}의 하위 폴더 이름`}
              aria-label="하위 폴더 이름"
              className="flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={!add.name.trim() || add.isCreating}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
            >
              추가
            </button>
          </form>
          {add.error?.scope === folder.key && (
            <div
              className="bg-zinc-50 pb-2 pr-3"
              style={{ paddingLeft: 12 + indent + INDENT_PX }}
            >
              <NameErrorText check={add.error.check} />
            </div>
          )}
        </>
      )}

      {isOpen && (
        <>
          {folder.folders.length > 0 && (
            <ul>
              {folder.folders.map((child) => (
                <FolderItem
                  key={child.key}
                  folder={child}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  activePostId={activePostId}
                  validDropKey={validDropKey}
                  add={add}
                />
              ))}
            </ul>
          )}
          {folder.posts.length > 0 && (
            <ul>
              {folder.posts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  folderKey={folder.key}
                  indent={indent + INDENT_PX}
                  dragging={activePostId === post.id}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

function PostRow({
  post,
  folderKey,
  indent,
  dragging,
}: {
  post: MyPostOutlineItem;
  folderKey: string;
  indent: number;
  dragging: boolean;
}) {
  const isDraft = post.publishedAt === null;
  // 글 줄 위에 놓아도 그 글이 들어 있는 폴더에 놓은 것으로 본다
  const { setNodeRef: setDropRef } = useDroppable({
    id: `post-row:${post.id}`,
    data: { folderKey },
  });
  const {
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    listeners,
    attributes,
  } = useDraggable({
    id: post.id,
    attributes: { roleDescription: "이동 손잡이" },
  });

  return (
    <li
      ref={(el) => {
        setDropRef(el);
        setDragRef(el);
      }}
      className={cn(
        "group flex items-center gap-2 border-t border-zinc-100 bg-zinc-50/50 py-2 pr-3",
        dragging && "opacity-40",
      )}
      style={{ paddingLeft: 4 + indent + 24 }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`${post.title || "제목 없음"} 이동`}
        className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing [@media(hover:hover)]:opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <FileText className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
      <Link
        // 발행 전 글은 상세가 아니라 이어 쓰기 화면으로
        href={isDraft ? `/write/${post.id}` : `/posts/${post.id}`}
        className="truncate text-sm text-zinc-700 hover:text-zinc-900 hover:underline"
      >
        {post.title || "제목 없음"}
      </Link>
      {isDraft && (
        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
          임시저장
        </span>
      )}
      {post.isPrivate && (
        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
          비공개
        </span>
      )}
    </li>
  );
}
