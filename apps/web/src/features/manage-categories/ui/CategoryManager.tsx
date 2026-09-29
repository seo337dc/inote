"use client";

import { useState } from "react";
import {
  useCategories,
  useCreateCategory,
  buildCategoryTree,
  MAX_CATEGORY_DEPTH,
  type CategoryNode,
} from "@/entities/category";

export default function CategoryManager() {
  const { data: categories, isPending } = useCategories();
  const createCategory = useCreateCategory();

  const [newRootName, setNewRootName] = useState("");
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");

  const tree = buildCategoryTree(categories ?? []);

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

  function renderNode(node: CategoryNode) {
    const canAddChild = node.depth < MAX_CATEGORY_DEPTH;
    const isAddingHere = addingChildOf === node.id;

    return (
      <li key={node.id}>
        <div className="flex items-center justify-between px-4 py-3">
          <span>{node.name}</span>
          {canAddChild && (
            <button
              type="button"
              onClick={() => {
                setAddingChildOf(isAddingHere ? null : node.id);
                setNewChildName("");
              }}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              {isAddingHere ? "취소" : "+ 하위 카테고리"}
            </button>
          )}
        </div>

        {isAddingHere && (
          <form onSubmit={(e) => handleAddChild(e, node.id)} className="flex gap-2 px-4 pb-3">
            <input
              autoFocus
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="하위 카테고리 이름"
              className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={!newChildName.trim() || createCategory.isPending}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              추가
            </button>
          </form>
        )}

        {node.children.length > 0 && (
          <ul className="ml-4 divide-y divide-zinc-100 border-l border-zinc-100 pl-2">
            {node.children.map(renderNode)}
          </ul>
        )}
      </li>
    );
  }

  if (isPending) {
    return <p className="text-sm text-zinc-400">불러오는 중...</p>;
  }

  return (
    <>
      <ul className="mb-6 divide-y divide-zinc-100 rounded border border-zinc-200">
        {tree.map(renderNode)}
      </ul>

      <form onSubmit={handleAddRoot} className="flex gap-2">
        <input
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
          disabled={!newRootName.trim() || createCategory.isPending}
        >
          추가
        </button>
      </form>
    </>
  );
}
