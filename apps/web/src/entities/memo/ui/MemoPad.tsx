"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookText } from "lucide-react";
import { FloatingPanel } from "@/shared/ui/floating-panel";
import { useRegisterSlotAction, type SlotAction } from "@/shared/lib/slot-actions";
import { useMediaQuery } from "@/shared/lib/useMediaQuery";
import { MEMO_MAX_LENGTH } from "../model/constants";
import { useMemoDraft } from "../model/useMemoDraft";
import type { MemoTarget } from "../model/types";
import { MemoBottomSheet } from "./MemoBottomSheet";
import { MemoTabs } from "./MemoTabs";

// ChatDock이 모바일 AI 버튼을 보여주는 기준(lg)과 같다 — 이 폭 이상이면 떠다니는 패널, 미만이면 하단 패널.
const DESKTOP_QUERY = "(min-width: 1024px)";
const MOVE_BUTTON =
  "text-memo-muted hover:bg-memo-border hover:text-memo-foreground flex size-6 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * 메모 버튼 + 메모장.
 * - 데스크톱: 버튼은 놓인 자리에 렌더되고(어디에 둘지는 부모가 정함), 누르면 그 버튼 바로 위에
 *   떠다니는 패널이 열린다(열려 있는 동안 버튼은 숨김).
 * - 좁은 화면: 모바일 도크의 + 메뉴에 메모 버튼을 등록하고, 누르면 하단 패널이 열린다.
 *   (이 안의 버튼은 부모가 좁은 화면에서 숨기도록 CSS로 가려야 한다)
 * 닫아도 이 컴포넌트가 상태를 들고 있어 입력 내용은 유지된다.
 * openMemoId가 있으면 열린 채로 시작해 그 메모 탭을 보여준다(메모 관리 화면에서 카드를 눌러 들어올 때).
 * 내용은 target(글·독서 기록)에 붙은 내 메모 한 장으로 서버에 자동저장된다(useMemoDraft) — 패널을 닫으면 바로 저장한다.
 */
export function MemoPad({ target, openMemoId }: { target: MemoTarget; openMemoId?: string }) {
  const [open, setOpen] = useState(false);
  const memo = useMemoDraft(target, { initialMemoId: openMemoId });
  const { text, setText, ready, flush } = memo;
  const [anchor, setAnchor] = useState<{ right: number; top: number }>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const openFromDock = useCallback(() => {
    setAnchor(undefined);
    setOpen(true);
  }, []);
  // 참조가 고정돼야 하단 패널의 닫힘 타이머가 부모 리렌더로 리셋되지 않는다.
  const close = useCallback(() => {
    setOpen(false);
    flush();
  }, [flush]);
  const dockAction = useMemo<SlotAction>(
    () => ({
      id: "memo",
      label: "메모",
      icon: NotebookText,
      onClick: openFromDock,
      className:
        "bg-memo-header text-memo-foreground border border-memo-border hover:bg-memo-border",
    }),
    [openFromDock],
  );
  useRegisterSlotAction(dockAction);

  function openFromButton() {
    // 열기 직전의 버튼 위치를 기억해 둔다 — 열린 동안 버튼은 숨겨지지만 패널은 그 자리 위에 뜬다.
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setAnchor({ right: rect.right, top: rect.top });
    }
    setOpen(true);
  }

  // 처음부터 열어야 하면(메모 관리에서 들어옴) 버튼 위치를 잰 뒤 한 번만 연다 — 버튼 바로 위에 패널이 뜨도록
  useEffect(() => {
    if (!openMemoId) return;
    openFromButton();
    // 마운트 때 한 번만 — 이후 prop이 바뀌어도 사용자가 닫은 패널을 다시 열지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 탭 줄이 곧 패널 헤더다(크롬 탭처럼)
  const header = (
    <MemoTabs
      tabs={memo.items}
      activeIndex={memo.activeIndex}
      canAdd={memo.canAdd}
      disabled={!ready}
      error={memo.actionError}
      onSelect={memo.setActiveIndex}
      onAdd={memo.addMemo}
      onTitleChange={memo.setTitle}
      onRemove={memo.removeMemo}
      onMove={memo.moveMemo}
    />
  );

  const body = (
    <div className="flex h-full flex-col">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MEMO_MAX_LENGTH}
        disabled={!ready}
        placeholder="모르는 부분이나 나중에 확인할 내용을 적어두세요"
        aria-label="메모 내용"
        className="text-memo-foreground placeholder:text-memo-muted min-h-0 flex-1 resize-none bg-transparent p-3 text-sm leading-relaxed outline-none"
      />
      <div className="flex shrink-0 items-center justify-between px-2 pb-2">
        {/* 순서는 화면에서만 바뀐다(저장하지 않음) — 터치에서도 쓸 수 있게 버튼으로도 둔다 */}
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label="메모를 앞으로 옮기기"
            title="앞으로 옮기기"
            disabled={!ready || memo.activeIndex === 0}
            onClick={() => memo.moveMemo(memo.activeIndex, memo.activeIndex - 1)}
            className={MOVE_BUTTON}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="메모를 뒤로 옮기기"
            title="뒤로 옮기기"
            disabled={!ready || memo.activeIndex === memo.items.length - 1}
            onClick={() => memo.moveMemo(memo.activeIndex, memo.activeIndex + 1)}
            className={MOVE_BUTTON}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <p className="text-memo-muted px-1 text-xs">
          {text.length.toLocaleString()} / {MEMO_MAX_LENGTH.toLocaleString()}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={openFromButton}
          className="bg-memo-header text-memo-foreground border-memo-border hover:bg-memo-border flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium shadow-md transition-colors"
        >
          <NotebookText className="size-4" />
          메모
        </button>
      )}
      <FloatingPanel open={open && isDesktop} onClose={close} title="메모" header={header} anchor={anchor}>
        {body}
      </FloatingPanel>
      <MemoBottomSheet open={open && !isDesktop} onClose={close} title="메모" header={header}>
        {body}
      </MemoBottomSheet>
    </>
  );
}
