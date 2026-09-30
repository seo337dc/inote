"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Minus, Plus } from "lucide-react";
import { CATEGORIES, useCategories, type Category } from "@/entities/category";
import { usePostOutline } from "@/entities/post";
import { revealInContainer } from "@/shared/lib/scroll";
import { cn } from "@/shared/lib/utils";
import { buildOutline, findActiveFolderKeys, type OutlineFolder } from "../lib/buildOutline";

// 로그인 전이거나 카테고리를 아직 못 불러왔을 때 쓰는 기본 카테고리(최상위 5개)
const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((name, position) => ({
  id: `default:${name}`,
  userId: "",
  name,
  parentId: null,
  depth: 1,
  position,
  createdAt: "",
  updatedAt: "",
}));

type Props = { currentPostId: string };

export default function PostOutline({ currentPostId }: Props) {
  const outlineQuery = usePostOutline();
  const categoriesQuery = useCategories();
  // 사용자가 직접 펼치거나 접은 폴더. 값이 없는 폴더는 "지금 글이 들어 있는지"로 정한다
  // — 다른 글로 이동해도 새 글이 있는 폴더가 자동으로 펼쳐지게 하려고 상태 대신 계산으로 둠.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const folders = useMemo(
    () => buildOutline(categoriesQuery.data ?? DEFAULT_CATEGORIES, outlineQuery.data ?? []),
    [categoriesQuery.data, outlineQuery.data],
  );
  const activeKeys = useMemo(
    () => findActiveFolderKeys(folders, currentPostId),
    [folders, currentPostId],
  );

  const navRef = useRef<HTMLElement>(null);
  // 글이 많아 트리가 길면 따로 스크롤되므로, 처음 열 때(또는 다른 글로 이동했을 때) 현재 글이 보이게 맞춘다
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current]");
    if (nav && current) revealInContainer(nav, current);
  }, [currentPostId, outlineQuery.data]);

  if (!outlineQuery.data || outlineQuery.data.length === 0) return null;

  const isOpen = (key: string) => overrides[key] ?? activeKeys.has(key);
  const toggle = (key: string) => setOverrides((prev) => ({ ...prev, [key]: !isOpen(key) }));

  return (
    <nav
      ref={navRef}
      aria-label="카테고리"
      className="hide-scrollbar sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
    >
      <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500">카테고리</p>
      <FolderList
        folders={folders}
        currentPostId={currentPostId}
        isOpen={isOpen}
        onToggle={toggle}
        depth={0}
      />
    </nav>
  );
}

type ListProps = {
  folders: OutlineFolder[];
  currentPostId: string;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  depth: number;
};

function FolderList({ folders, currentPostId, isOpen, onToggle, depth }: ListProps) {
  return (
    <ul className={cn(depth > 0 && "ml-2 border-l border-zinc-200 pl-2")}>
      {folders.map((folder) => {
        const open = isOpen(folder.key);
        return (
          <li key={folder.key}>
            <button
              type="button"
              onClick={() => onToggle(folder.key)}
              aria-expanded={open}
              className="flex w-full items-center gap-1.5 rounded py-1 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded border border-zinc-300 text-zinc-500">
                {open ? <Minus className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
              </span>
              <span className="truncate">{folder.name}</span>
              <span className="shrink-0 text-xs font-normal text-zinc-400">{folder.total}</span>
            </button>
            {open && (
              <>
                {folder.folders.length > 0 && (
                  <FolderList
                    folders={folder.folders}
                    currentPostId={currentPostId}
                    isOpen={isOpen}
                    onToggle={onToggle}
                    depth={depth + 1}
                  />
                )}
                {folder.posts.length > 0 && (
                  <ul className="ml-2 border-l border-zinc-200 pl-2">
                    {folder.posts.map((post) => {
                      const current = post.id === currentPostId;
                      return (
                        <li key={post.id}>
                          <Link
                            href={`/posts/${post.id}`}
                            aria-current={current ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-1 rounded px-1 py-1 text-[13px] leading-snug",
                              current
                                ? "bg-zinc-100 font-semibold text-zinc-900"
                                : "text-zinc-500 hover:text-zinc-800",
                            )}
                          >
                            <span className="line-clamp-2">{post.title || "제목 없음"}</span>
                            {post.isPrivate && (
                              <Lock className="size-3 shrink-0 text-zinc-400" aria-label="비공개" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {folder.total === 0 && (
                  <p className="ml-2 border-l border-zinc-200 py-1 pl-2 text-xs text-zinc-400">
                    글이 없어요
                  </p>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
