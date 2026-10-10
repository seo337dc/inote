"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Globe,
  Lock,
  PanelLeft,
  PanelRightClose,
} from "lucide-react";
import type { CategoryNode } from "@/entities/category";
import { cn } from "@/shared/lib/utils";

const PANEL_ID = "write-side-panel";

type Props = {
  // 카테고리 트리 (buildCategoryTree 결과)
  categories: CategoryNode[];
  // 글의 카테고리는 이름 문자열로 저장된다
  category: string;
  onCategoryChange: (name: string) => void;
  isPrivate: boolean;
  onPrivateChange: (value: boolean) => void;
};

// 글쓰기 화면 왼쪽의 글 설정 영역. 아이콘 버튼으로 접고 펼친다(접힌 상태는 저장하지 않는다).
// 접으면 목록은 가리고 아이콘만 남는다 — 언마운트하지 않아 접어 둔 폴더 같은 상태가 유지된다.
export default function WriteSidePanel({
  categories,
  category,
  onCategoryChange,
  isPrivate,
  onPrivateChange,
}: Props) {
  const [open, setOpen] = useState(true);
  const toggleLabel = open ? "글 설정 접기" : "글 설정 펼치기";
  const ToggleIcon = open ? PanelLeft : PanelRightClose;

  return (
    <aside aria-label="글 설정" className={cn("hidden shrink-0 lg:block", open ? "w-52" : "w-6")}>
      <div className="sticky top-6">
        <div className="flex min-h-[22px] items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            className={cn(
              "size-[22px] shrink-0 rounded p-1 hover:bg-zinc-100",
              open ? "text-zinc-600" : "text-zinc-400 hover:text-zinc-600",
            )}
          >
            <ToggleIcon className="size-3.5" aria-hidden="true" />
          </button>
          {open && <h2 className="text-sm font-semibold text-zinc-700">글 설정</h2>}
        </div>

        <div id={PANEL_ID} hidden={!open} className="mt-4">
          <h3 className="mb-1.5 px-1 text-xs font-medium text-zinc-500">공개 설정</h3>
          <div className="mb-5 grid grid-cols-2 gap-1.5">
            <VisibilityButton
              active={!isPrivate}
              onClick={() => onPrivateChange(false)}
              icon={<Globe className="size-3.5" aria-hidden="true" />}
              label="전체 공개"
            />
            <VisibilityButton
              active={isPrivate}
              onClick={() => onPrivateChange(true)}
              icon={<Lock className="size-3.5" aria-hidden="true" />}
              label="비공개"
            />
          </div>

          <h3 className="mb-1.5 px-1 text-xs font-medium text-zinc-500">카테고리</h3>
          {categories.length === 0 ? (
            <p className="px-1 text-xs text-zinc-400">카테고리가 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {categories.map((node) => (
                <CategoryItem
                  key={node.id}
                  node={node}
                  selected={category}
                  onSelect={onCategoryChange}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function CategoryItem({
  node,
  selected,
  onSelect,
}: {
  node: CategoryNode;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.name === selected;

  return (
    <li>
      <div
        className={cn(
          "flex items-center rounded text-sm",
          isSelected ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50",
        )}
      >
        {/* 하위가 없어도 같은 자리를 비워 줄이 맞게 한다 */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={`${node.name} ${expanded ? "접기" : "펼치기"}`}
            aria-expanded={expanded}
            className="flex size-6 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-600"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.name)}
          aria-pressed={isSelected}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left"
        >
          <Folder className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-zinc-200 pl-1">
          {node.children.map((child) => (
            <CategoryItem key={child.id} node={child} selected={selected} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function VisibilityButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-1 rounded border px-1 py-1.5 text-xs",
        active
          ? "border-zinc-900 bg-white font-medium text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
