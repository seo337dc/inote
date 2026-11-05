"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { NotebookText } from "lucide-react";
import { FloatingPanel } from "@/shared/ui/floating-panel";
import { useRegisterSlotAction, type SlotAction } from "@/shared/lib/slot-actions";
import { useMediaQuery } from "@/shared/lib/useMediaQuery";
import { MEMO_MAX_LENGTH } from "../model/constants";
import { MemoBottomSheet } from "./MemoBottomSheet";

// ChatDock이 모바일 AI 버튼을 보여주는 기준(lg)과 같다 — 이 폭 이상이면 떠다니는 패널, 미만이면 하단 패널.
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * 메모 버튼 + 메모장.
 * - 데스크톱: 버튼은 놓인 자리에 렌더되고(어디에 둘지는 부모가 정함), 누르면 그 버튼 바로 위에
 *   떠다니는 패널이 열린다(열려 있는 동안 버튼은 숨김).
 * - 좁은 화면: 모바일 도크의 + 메뉴에 메모 버튼을 등록하고, 누르면 하단 패널이 열린다.
 *   (이 안의 버튼은 부모가 좁은 화면에서 숨기도록 CSS로 가려야 한다)
 * 닫아도 이 컴포넌트가 상태를 들고 있어 입력 내용은 유지된다.
 * (지금은 화면 확인용 — 서버 저장은 이후 단계에서 연결한다)
 */
export function MemoPad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [anchor, setAnchor] = useState<{ right: number; top: number }>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const openFromDock = useCallback(() => {
    setAnchor(undefined);
    setOpen(true);
  }, []);
  // 참조가 고정돼야 하단 패널의 닫힘 타이머가 부모 리렌더로 리셋되지 않는다.
  const close = useCallback(() => setOpen(false), []);
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

  const body = (
    <div className="flex h-full flex-col">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MEMO_MAX_LENGTH}
        placeholder="모르는 부분이나 나중에 확인할 내용을 적어두세요"
        aria-label="메모 내용"
        className="text-memo-foreground placeholder:text-memo-muted min-h-0 flex-1 resize-none bg-transparent p-3 text-sm leading-relaxed outline-none"
      />
      <p className="text-memo-muted shrink-0 px-3 pb-2 text-right text-xs">
        {text.length.toLocaleString()} / {MEMO_MAX_LENGTH.toLocaleString()}
      </p>
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
      <FloatingPanel open={open && isDesktop} onClose={close} title="메모" anchor={anchor}>
        {body}
      </FloatingPanel>
      <MemoBottomSheet open={open && !isDesktop} onClose={close} title="메모">
        {body}
      </MemoBottomSheet>
    </>
  );
}
