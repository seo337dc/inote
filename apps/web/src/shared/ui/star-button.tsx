"use client";

import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  starred: boolean;
  // 접근성 이름에 쓸 대상 — "DB 세팅" → "DB 세팅 중요 표시" / "DB 세팅 중요 표시 해제"
  label: string;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
};

// 중요(별) 토글. 켜져 있으면 항상 보이고, 꺼져 있으면 줄에 마우스를 올리거나 포커스가 있을 때만 보인다(터치는 항상).
// 부모 줄에 `group` 클래스가 있어야 hover 표시가 동작한다.
export function StarButton({ starred, label, onToggle, disabled, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={starred}
      aria-label={starred ? `${label} 중요 표시 해제` : `${label} 중요 표시`}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded transition-opacity hover:bg-zinc-100 focus-visible:opacity-100 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent [@media(hover:none)]:opacity-100",
        starred ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      <Star className={cn("size-4", starred ? "fill-amber-400 text-amber-400" : "text-zinc-300 hover:text-zinc-500")} />
    </button>
  );
}
