import { History, Send } from "lucide-react";
import type { useChatMessages } from "../model/useChatMessages";

type Props = {
  chat: ReturnType<typeof useChatMessages>;
};

export default function ChatComposer({ chat }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chat.input.trim()) chat.handleSend(e as unknown as React.FormEvent);
    }
    // Shift+Enter는 기본 동작(줄바꿈) 그대로 둠
  }

  return (
    <form onSubmit={chat.handleSend} className="flex items-end gap-2 border-t border-zinc-200 p-3">
      {chat.isLoggedIn && (
        <button
          type="button"
          onClick={chat.toggleSessionPanel}
          aria-label="대화 목록"
          className="flex size-9 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <History className="size-4" />
        </button>
      )}
      <textarea
        value={chat.input}
        onChange={(e) => chat.setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
        rows={3}
        className="max-h-40 min-h-16 flex-1 resize-none rounded border border-zinc-300 px-3 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={!chat.input.trim()}
        aria-label="보내기"
        className="rounded bg-zinc-900 p-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
