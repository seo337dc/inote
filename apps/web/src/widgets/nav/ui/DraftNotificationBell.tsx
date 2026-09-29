"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useMyDrafts } from "@/entities/post";
import { useSession } from "@/shared/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const MAX_ITEMS = 5;

export default function DraftNotificationBell() {
  const { data: session } = useSession();
  const draftsQuery = useMyDrafts();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const drafts = draftsQuery.data ?? [];

  // 벨은 네비에 항상 마운트돼 있어서 페이지를 옮겨도 캐시(staleTime 1분)를 그대로 읽음 —
  // 글쓰기 중 자동저장된 draft가 이동 직후 바로 보이도록 경로가 바뀔 때마다 갱신한다.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["my-drafts"] });
  }, [pathname, queryClient]);

  if (!session) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="미완성 글 알림"
        className="relative flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
      >
        <Bell className="size-4" />
        {drafts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-medium text-white">
            {drafts.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        {drafts.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-sm text-zinc-400">작성 중인 글이 없어요.</p>
        ) : (
          drafts.slice(0, MAX_ITEMS).map((draft) => (
            <DropdownMenuItem
              key={draft.id}
              render={<Link href={`/write?id=${draft.id}`} />}
              className="flex-col items-start gap-0.5"
            >
              <span className="w-full truncate font-medium text-zinc-900">
                {draft.title.trim() || "제목 없음"}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(draft.updatedAt).toLocaleDateString("ko-KR")}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
