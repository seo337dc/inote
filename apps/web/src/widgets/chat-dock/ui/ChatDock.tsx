"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EllipsisVertical, Sparkles } from "lucide-react";
import { useSlotActions } from "@/shared/lib/slot-actions";
import ChatPanel from "./ChatPanel";
import type { useChatMessages } from "../model/useChatMessages";

type Props = {
  chat: ReturnType<typeof useChatMessages>;
};

const ROUND =
  "flex size-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-colors";
const DEFAULT_COLOR = "bg-zinc-900 text-white hover:bg-zinc-800";

// 도크의 둥근 아이콘 버튼. 색은 color(기본은 중립색), 위치·전환 같은 나머지는 className으로 더한다.
function DockButton({
  icon: Icon,
  label,
  onClick,
  color = DEFAULT_COLOR,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${color} ${ROUND} ${className}`}
    >
      <Icon className="size-5" />
    </button>
  );
}

export default function ChatDock({ chat }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);
  // 화면(예: 글쓰기)이 등록한 추가 버튼. 없으면 AI 버튼 하나만 보여준다.
  const actions = useSlotActions();

  useEffect(() => {
    if (!dialOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialOpen]);

  if (pathname === "/login") return null;

  const hidden = open ? "pointer-events-none opacity-0" : "opacity-100";

  return (
    <>
      {actions.length === 0 ? (
        <DockButton
          icon={Sparkles}
          label="AI 어시스턴트 열기"
          onClick={() => setOpen(true)}
          className={`fixed bottom-4 right-4 z-20 transition-opacity lg:hidden ${hidden}`}
        />
      ) : (
        <>
          {dialOpen && (
            <div
              className="fixed inset-0 z-[15] lg:hidden"
              onClick={() => setDialOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`fixed bottom-4 right-4 z-20 flex flex-col-reverse items-end gap-3 transition-opacity lg:hidden ${hidden}`}
          >
            {/* 펼쳐지면 이 버튼은 숨기고, AI·추가 버튼이 그 자리(오른쪽 아래)부터 쌓인다.
              접는 건 바깥 영역 클릭 또는 Esc */}
            {!dialOpen && (
              <DockButton icon={EllipsisVertical} label="메뉴 열기" onClick={() => setDialOpen(true)} />
            )}
            {dialOpen && (
              <>
                <DockButton
                  icon={Sparkles}
                  label="AI 어시스턴트 열기"
                  onClick={() => {
                    setDialOpen(false);
                    setOpen(true);
                  }}
                />
                {actions.map((a) => (
                  <DockButton
                    key={a.id}
                    icon={a.icon}
                    label={a.label}
                    color={a.className}
                    onClick={() => {
                      setDialOpen(false);
                      a.onClick();
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      <ChatPanel open={open} onClose={() => setOpen(false)} chat={chat} />
    </>
  );
}
