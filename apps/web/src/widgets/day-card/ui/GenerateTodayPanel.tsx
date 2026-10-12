"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useGenerateToday } from "@/entities/daily";
import { Button } from "@/shared/ui/button";

// 오늘 카드가 비어 있을 때(하루를 시작할 때) 보이는 안내 — [오늘 할일 생성]을 누르면 고정 리스트를 오늘 카드로 가져온다.
// 가져올 고정 항목이 없으면 설정으로 가는 안내를 보여준다.
export default function GenerateTodayPanel() {
  const generate = useGenerateToday();
  const [emptyList, setEmptyList] = useState(false);

  function handleClick() {
    generate.mutate(undefined, {
      onSuccess: (card) => setEmptyList(card.entries.length === 0),
      onError: () => toast.error("오늘 할일을 만들지 못했어요."),
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      <p className="text-sm text-zinc-500">오늘 할일이 아직 없어요.</p>
      <Button onClick={handleClick} disabled={generate.isPending}>
        {generate.isPending ? "만드는 중…" : "오늘 할일 생성"}
      </Button>
      {emptyList && (
        <p className="text-xs text-zinc-500">
          고정 리스트가 비어 있어요.{" "}
          <Link href="/todos/settings" className="underline underline-offset-2 hover:text-zinc-900">
            설정
          </Link>
          에서 매일 할 일을 추가해 보세요.
        </p>
      )}
    </div>
  );
}
