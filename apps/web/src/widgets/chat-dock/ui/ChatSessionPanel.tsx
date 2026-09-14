import Link from "next/link";
import { ArrowUpRight, Search, SquarePen, X } from "lucide-react";
import type { useChatMessages } from "../model/useChatMessages";
import type { ChatSession } from "../model/types";

type Props = {
  chat: ReturnType<typeof useChatMessages>;
};

function sessionLabel(session: ChatSession) {
  if (session.post_id) {
    return {
      kicker: `글쓰기 · ${session.post_category || "카테고리 없음"}`,
      title: session.post_title?.trim() || "제목 없음",
    };
  }
  return {
    kicker: "일반 대화",
    title: session.last_message?.trim() || "새 대화",
  };
}

export default function ChatSessionPanel({ chat }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200 p-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={chat.sessionSearch}
            onChange={(e) => chat.setSessionSearch(e.target.value)}
            placeholder="대화 검색"
            className="w-full rounded border border-zinc-300 py-1.5 pr-2 pl-8 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={chat.toggleSessionPanel}
          aria-label="닫기"
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={chat.startNewSession}
        className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <SquarePen className="size-4" />
        새 대화
      </button>

      <ul className="flex-1 overflow-y-auto">
        {chat.sessions.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-zinc-400">
            {chat.sessionSearch ? "검색 결과가 없어요." : "대화 기록이 없어요."}
          </li>
        )}
        {chat.sessions.map((session) => {
          const { kicker, title } = sessionLabel(session);
          const active = session.id === chat.activeSessionId;
          return (
            <li key={session.id} className="relative">
              <button
                type="button"
                onClick={() => chat.selectSession(session)}
                className={`block w-full border-b border-zinc-100 px-3 py-2.5 text-left ${
                  session.post_id ? "pr-9" : ""
                } ${active ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
              >
                <p className="truncate text-[11px] text-zinc-400">{kicker}</p>
                <p className="truncate text-sm text-zinc-700">{title}</p>
              </button>
              {session.post_id && (
                <Link
                  href={`/posts/${session.post_id}`}
                  aria-label="그 글로 이동"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
