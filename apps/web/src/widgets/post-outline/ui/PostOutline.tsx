"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Lock, Minus, Plus } from "lucide-react";
import { CATEGORIES, useCategories, type Category } from "@/entities/category";
import { usePostOutline, useUserOutline } from "@/entities/post";
import { useSession } from "@/shared/lib/auth-client";
import { revealInContainer } from "@/shared/lib/scroll";
import { cn } from "@/shared/lib/utils";
import { buildOutline, findActiveFolderKeys, type OutlineFolder } from "../lib/buildOutline";
import { toCategories } from "../lib/publicCategories";

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

type Props = {
  currentPostId: string;
  // 지금 보는 글의 작성자. 로그인한 사용자와 다른 사람이면 내 카테고리가 아니라 **그 작성자의 공개 카테고리·글**을 보여준다(비공개 제외).
  // 없거나 내 글이면 지금처럼 내 카테고리 기준
  authorId?: string | null;
  // 헤더 줄("카테고리 · 관리")에 더할 클래스 — 바깥에서 아이콘 버튼을 같은 줄에 겹쳐 놓을 때 자리를 비우는 용도
  headerClassName?: string;
  // true면 제목 줄(아이콘 옆 "카테고리")만 남기고 폴더 목록과 "관리" 링크는 가린다. 목록은 언마운트하지 않고 숨기기만 해서
  // 직접 펼쳐 둔 폴더와 스크롤 위치가 접었다 펴도 그대로 남는다.
  collapsed?: boolean;
};

export default function PostOutline({ currentPostId, authorId = null, headerClassName, collapsed = false }: Props) {
  const { data: session, isPending: isSessionPending } = useSession();
  // 다른 사람의 글인지는 세션이 정해진 뒤에 안다 (그 전에는 아무것도 부르지 않는다)
  const viewingOthers = Boolean(authorId) && !isSessionPending && session?.user.id !== authorId;
  const ownOutlineQuery = usePostOutline({ enabled: !viewingOthers });
  const userOutlineQuery = useUserOutline(viewingOthers ? authorId : null);
  const categoriesQuery = useCategories();
  const outlineData = viewingOthers ? userOutlineQuery.data?.posts : ownOutlineQuery.data;
  const author = viewingOthers ? userOutlineQuery.data?.author : null;
  // 각 폴더 줄의 목록 링크: 다른 사람의 글이면 그 사람의 목록(/users/[id]?category=, 로그인 여부와 무관),
  // 내 글이면 로그인했을 때만 나의 글 목록(/my-posts?category=) — 카테고리별 목록은 나의 글에만 있어서
  const listHref = (name: string): string | null => {
    if (viewingOthers) return `/users/${encodeURIComponent(authorId as string)}?category=${encodeURIComponent(name)}`;
    return session ? `/my-posts?category=${encodeURIComponent(name)}` : null;
  };
  // 사용자가 직접 펼치거나 접은 폴더. 값이 없는 폴더는 "지금 글이 들어 있는지"로 정한다
  // — 다른 글로 이동해도 새 글이 있는 폴더가 자동으로 펼쳐지게 하려고 상태 대신 계산으로 둠.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const folders = useMemo(() => {
    if (viewingOthers) {
      return buildOutline(toCategories(authorId as string, userOutlineQuery.data?.categories ?? []), outlineData ?? []);
    }
    return buildOutline(categoriesQuery.data ?? DEFAULT_CATEGORIES, outlineData ?? []);
  }, [viewingOthers, authorId, userOutlineQuery.data?.categories, categoriesQuery.data, outlineData]);
  const activeKeys = useMemo(
    () => findActiveFolderKeys(folders, currentPostId),
    [folders, currentPostId],
  );

  const navRef = useRef<HTMLElement>(null);
  // 글이 많아 트리가 길면 따로 스크롤되므로, 처음 열 때(또는 다른 글로 이동했을 때) 현재 글이 보이게 맞춘다
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current]");
    // 접혀 있는 동안은 목록이 보이지 않아 스크롤 계산이 무의미하다 — 다시 펼칠 때 현재 글이 보이게 맞춘다
    if (nav && current && !collapsed) revealInContainer(nav, current);
  }, [currentPostId, outlineData, collapsed]);

  if (!outlineData || outlineData.length === 0) return null;

  const isOpen = (key: string) => overrides[key] ?? activeKeys.has(key);
  const toggle = (key: string) => setOverrides((prev) => ({ ...prev, [key]: !isOpen(key) }));

  return (
    <nav
      ref={navRef}
      aria-label="카테고리"
      className="hide-scrollbar sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
    >
      <div className={cn("mb-2 flex items-center justify-between", headerClassName)}>
        <p className="text-xs font-semibold tracking-wide text-zinc-500">
          {author ? `${author.name}의 카테고리` : "카테고리"}
        </p>
        {!collapsed && !viewingOthers && (
          <Link
            href="/categories"
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
          >
            관리
          </Link>
        )}
      </div>
      <div hidden={collapsed}>
        <FolderList
          folders={folders}
          currentPostId={currentPostId}
          isOpen={isOpen}
          onToggle={toggle}
          listHref={listHref}
          depth={0}
        />
      </div>
    </nav>
  );
}

type ListProps = {
  folders: OutlineFolder[];
  currentPostId: string;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  // 각 폴더 줄 오른쪽의 "그 카테고리 나의 글 목록" 링크를 보일지 (로그인했을 때만)
  // 폴더 이름 → 그 카테고리 글 목록 주소. null이면 링크를 보이지 않는다
  listHref: (name: string) => string | null;
  depth: number;
};

function FolderList({ folders, currentPostId, isOpen, onToggle, listHref, depth }: ListProps) {
  return (
    <ul className={cn(depth > 0 && "ml-2 border-l border-zinc-200 pl-2")}>
      {folders.map((folder) => {
        const open = isOpen(folder.key);
        return (
          <li key={folder.key}>
            {/* 한 줄: 펼치기/접기(왼쪽, 남는 폭 전부) + 그 카테고리 글 목록으로 가는 링크(맨 오른쪽, 줄에 마우스를 올렸을 때만 보임).
                누를 때마다 목록 페이지로 가서 글을 확인하는 흐름을 한 번에 가게 한다 */}
            <div className="group flex items-center rounded hover:bg-zinc-100">
              <button
                type="button"
                onClick={() => onToggle(folder.key)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-[13px] font-medium text-zinc-700"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded border border-zinc-300 text-zinc-500">
                  {open ? <Minus className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
                </span>
                <span className="truncate">{folder.name}</span>
                <span className="shrink-0 text-xs font-normal text-zinc-400">{folder.total}</span>
              </button>
              {listHref(folder.name) && (
                <Link
                  href={listHref(folder.name) as string}
                  aria-label={`${folder.name} 목록 보기`}
                  title={`${folder.name} 목록 보기`}
                  // 마우스를 쓸 수 있는 환경에선 줄에 올렸을 때(또는 키보드로 줄 안에 포커스가 있을 때)만 보이고, 터치 기기에선 항상 보인다.
                  // 투명하게만 하고 자리는 그대로 두어서, 나타나도 줄 안의 글자가 밀리지 않는다
                  className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
            {open && (
              <>
                {folder.folders.length > 0 && (
                  <FolderList
                    folders={folder.folders}
                    currentPostId={currentPostId}
                    isOpen={isOpen}
                    onToggle={onToggle}
                    listHref={listHref}
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
