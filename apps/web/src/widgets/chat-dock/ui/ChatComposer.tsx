import { Send } from "lucide-react";

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function ChatComposer({ input, onInputChange, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-zinc-200 p-3">
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="메시지를 입력하세요..."
        className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={!input.trim()}
        aria-label="보내기"
        className="rounded bg-zinc-900 p-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
