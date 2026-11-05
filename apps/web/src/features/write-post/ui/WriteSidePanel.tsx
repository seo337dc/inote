"use client";

import { useState } from "react";
import { PanelLeft, PanelRightClose } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import WriteSettingsContent, { type WriteSettingsProps } from "./WriteSettingsContent";

const PANEL_ID = "write-side-panel";

type Props = WriteSettingsProps;

// 글쓰기 화면 왼쪽의 글 설정 영역. 아이콘 버튼으로 접고 펼친다(접힌 상태는 저장하지 않는다).
// 접으면 목록은 가리고 아이콘만 남는다 — 언마운트하지 않아 접어 둔 폴더 같은 상태가 유지된다.
export default function WriteSidePanel(props: Props) {
  const [open, setOpen] = useState(true);
  const toggleLabel = open ? "글 설정 접기" : "글 설정 펼치기";
  const ToggleIcon = open ? PanelLeft : PanelRightClose;

  return (
    <aside aria-label="글 설정" className={cn("hidden shrink-0 xl:block", open ? "w-52" : "w-6")}>
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
          <WriteSettingsContent {...props} />
        </div>
      </div>
    </aside>
  );
}
