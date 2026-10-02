import { Lock } from "lucide-react";

// 비공개 글 표시 — 글 상세 상단과 글 목록 행에서 같은 모양으로 쓴다
export default function PrivateBadge() {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">
      <Lock aria-hidden className="size-3" />
      비공개
    </span>
  );
}
