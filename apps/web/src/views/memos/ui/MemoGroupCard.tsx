"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { MemoGroup, MemoTargetType } from "@/entities/memo";

const TYPE_LABEL: Record<MemoTargetType, string> = { general: "일반", post: "글", reading: "독서" };

// 카드 뒤에 겹쳐 보이는 종이 — 여러 장이면 최대 2겹. 정확한 장 수는 '외 N개'·'1 / 3'이 알려준다. 뒤로 갈수록 한 단계 어두운 메모 색
const MAX_LAYERS = 2;
const LAYER_OFFSET_PX = 6;
const LAYER_COLORS = ["bg-memo-header", "bg-memo-border"];

// 헤더의 이동 아이콘이 가는 곳 — 일반 메모는 대상이 없다
function targetLink(group: MemoGroup): { href: string; label: string } | null {
  if (group.targetType === "post") return { href: `/posts/${group.targetId}`, label: "글로 이동" };
  if (group.targetType === "reading") return { href: `/reading/${group.targetId}`, label: "독서 기록으로 이동" };
  return null;
}

const NAV_BUTTON =
  "text-memo-muted hover:bg-memo-border/60 hover:text-memo-foreground flex size-6 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * 메모 관리의 카드 한 장 (계약: docs/todo/memo.md 4차). 메모장과 같은 색(memo 토큰)의 정사각형.
 * - 헤더: 종류 뱃지 · 대상 제목(길면 …) · 여러 장이면 "외 N개" · 대상 페이지로 가는 이동 아이콘(일반 메모는 없음)
 * - 본문: 그룹의 메모 한 장(처음에는 가장 최근 수정한 첫 메모). 날짜는 보이지 않는다.
 * - 아래: 메모가 여러 장이면 ‹ › 와 "1 / 3" 으로 이 카드 안에서 넘겨 본다(카드마다 따로). 넘길 때 옆에서 스르륵 들어온다(slide).
 * - 본문(제목·내용)을 누르면 onOpenMemo(지금 보이는 메모의 id) — 부모가 메모장을 연다. 넘기기·이동 아이콘은 열지 않는다.
 * - 여러 장이면 카드 뒤에 종이가 오른쪽·아래로 어긋나 겹쳐 보인다(최대 2겹, 장식이라 aria-hidden).
 */
export default function MemoGroupCard({ group, onOpenMemo }: { group: MemoGroup; onOpenMemo?: (memoId: string) => void }) {
  // 보고 있는 메모를 위치(index)와 id로 같이 기억한다 — 메모를 고쳐 그룹 안 순서가 바뀌어도 id로 같은 메모를 따라가고,
  // 그 메모가 사라졌을 때(삭제 등)만 위치로 돌아가 범위 안(최대 마지막)으로 보정한다
  const [view, setView] = useState<{ index: number; id: string | null }>({ index: 0, id: null });
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const count = group.memos.length;
  const byId = view.id ? group.memos.findIndex((m) => m.id === view.id) : -1;
  const current = byId >= 0 ? byId : Math.min(view.index, Math.max(count - 1, 0));
  const memo = group.memos[current];
  const link = targetLink(group);
  const layers = Math.min(count - 1, MAX_LAYERS);
  const slideClass = direction ? `memo-slide-${direction}` : "";

  function go(next: number, dir: "next" | "prev") {
    setDirection(dir);
    setView({ index: next, id: group.memos[next]?.id ?? null });
  }

  return (
    // 겹친 종이가 삐져나올 자리(오른쪽·아래 여백)를 항상 같은 크기로 잡아 두어 카드 크기가 모두 같게 보인다
    <div className="pr-3 pb-3">
      <div className="relative isolate">
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            data-stack-layer
            className={`border-memo-border absolute inset-0 rounded-lg border shadow-sm ${LAYER_COLORS[i]}`}
            style={{ transform: `translate(${(i + 1) * LAYER_OFFSET_PX}px, ${(i + 1) * LAYER_OFFSET_PX}px)`, zIndex: -(i + 1) }}
          />
        ))}
        <article className="bg-memo text-memo-foreground border-memo-border flex aspect-square flex-col overflow-hidden rounded-lg border shadow-sm">
          <header className="bg-memo-header border-memo-border flex shrink-0 items-center gap-2 border-b px-3 py-2">
            <span className="bg-memo-border/60 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium">{TYPE_LABEL[group.targetType]}</span>
            {group.targetTitle && <span className="text-memo-muted min-w-0 flex-1 truncate text-xs">{group.targetTitle}</span>}
            {count > 1 && <span className="text-memo-muted shrink-0 text-xs">외 {count - 1}개</span>}
            {link && (
              <Link
                href={link.href}
                aria-label={link.label}
                title={link.label}
                className="text-memo-muted hover:bg-memo-border/60 hover:text-memo-foreground ml-auto shrink-0 rounded p-0.5 transition-colors"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            )}
          </header>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            {/* 본문 전체를 덮는 투명 버튼이 메모장을 연다(제목·내용이 제목 태그를 품고 있어 버튼으로 감싸지 않고 겹쳐 둔다) */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {/* key가 메모마다 달라 넘길 때 새로 만들어지고, 그때 슬라이드 애니메이션이 처음부터 다시 돈다 */}
              <div key={memo?.id} className={`flex min-h-0 flex-1 flex-col ${slideClass}`}>
                <h2 className="shrink-0 truncate text-sm font-semibold">{memo?.title.trim() || "제목 없음"}</h2>
                <p className="text-memo-muted mt-1.5 line-clamp-6 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] overflow-hidden text-sm leading-relaxed whitespace-pre-line">
                  {memo?.content.trim() || "내용 없음"}
                </p>
              </div>
              <button
                type="button"
                aria-label="메모 열기"
                title="메모 열기"
                onClick={() => memo && onOpenMemo?.(memo.id)}
                className="hover:bg-memo-header/40 absolute -inset-1 cursor-pointer rounded transition-colors"
              />
            </div>
            {count > 1 && (
              <footer className="mt-2 flex shrink-0 items-center justify-between">
                <button type="button" aria-label="이전 메모" disabled={current === 0} onClick={() => go(current - 1, "prev")} className={NAV_BUTTON}>
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-memo-muted text-xs">
                  {current + 1} / {count}
                </span>
                <button type="button" aria-label="다음 메모" disabled={current === count - 1} onClick={() => go(current + 1, "next")} className={NAV_BUTTON}>
                  <ChevronRight className="size-4" />
                </button>
              </footer>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
