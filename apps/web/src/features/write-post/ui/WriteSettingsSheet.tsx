"use client";

import { useCallback, useMemo, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useRegisterSlotAction, type SlotAction } from "@/shared/lib/slot-actions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import WriteSettingsContent, { type WriteSettingsProps } from "./WriteSettingsContent";

// 좁은 화면(xl 미만)에서 글 설정(공개 설정·카테고리)을 바꾸는 왼쪽 시트.
// 마운트되면 모바일 헤더 왼쪽 슬롯에 버튼을 등록하고(헤더는 이 feature를 import할 수 없다), 시트 본체는 여기서 그린다.
// 카테고리를 골라도 자동으로 닫지 않는다 — 닫기 버튼·바깥 클릭·Esc로 사용자가 닫는다.
export default function WriteSettingsSheet(props: WriteSettingsProps) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  const action = useMemo<SlotAction>(
    () => ({ id: "write-settings", slot: "header-left", label: "글 설정", icon: PanelLeft, onClick: openSheet }),
    [openSheet],
  );
  useRegisterSlotAction(action);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-3/4 overflow-y-auto xl:hidden">
        <SheetHeader>
          <SheetTitle>글 설정</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <WriteSettingsContent {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
