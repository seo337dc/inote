"use client";

import type { ReactElement } from "react";
import { formatShortcut } from "@/shared/lib/shortcut";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/**
 * 버튼에 마우스를 올리면(또는 키보드로 포커스하면) 이름과 단축키를 말풍선으로 보여준다.
 * 단축키는 Tiptap 문자열("Mod-b")로 받아 맥/윈도우에 맞게 표기한다. 말풍선은 열릴 때만 그려져서 서버 렌더와 어긋나지 않는다.
 * 띄우는 지연은 부모의 TooltipProvider(delay)로 정한다.
 */
export function ShortcutTooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="bottom">
        <span>{label}</span>
        <kbd className="rounded bg-background/20 px-1.5 py-0.5 font-sans text-[11px] tracking-wide">
          {formatShortcut(shortcut)}
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}
