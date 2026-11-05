"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, Globe, Lock } from "lucide-react";
import type { CategoryNode } from "@/entities/category";
import { cn } from "@/shared/lib/utils";

export type WriteSettingsProps = {
  // 카테고리 트리 (buildCategoryTree 결과)
  categories: CategoryNode[];
  // 글의 카테고리는 이름 문자열로 저장된다
  // 고른 카테고리 id (아직 안 골랐으면 빈 문자열)
  categoryId: string;
  onCategoryChange: (id: string) => void;
  isPrivate: boolean;
  onPrivateChange: (value: boolean) => void;
};

// 글 설정(공개 설정 + 카테고리 선택) 내용. 데스크톱 왼쪽 패널(WriteSidePanel)과 모바일 왼쪽 시트(WriteSettingsSheet)가 같이 쓴다.
export default function WriteSettingsContent({
  categories,
  categoryId,
  onCategoryChange,
  isPrivate,
  onPrivateChange,
}: WriteSettingsProps) {
  return (
    <>
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
              selected={categoryId}
              onSelect={onCategoryChange}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function CategoryItem({
  node,
  selected,
  onSelect,
}: {
  node: CategoryNode;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selected;

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
          onClick={() => onSelect(node.id)}
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
