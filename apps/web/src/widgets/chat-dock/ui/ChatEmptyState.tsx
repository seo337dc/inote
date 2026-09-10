"use client";

import { useSession } from "@/shared/lib/auth-client";

const SUGGESTIONS = ["글을 쓰고 싶어", "과제를 도와줘", "어떤 글을 쓸까?"];

type Props = {
  onSelect: (text: string) => void;
};

export default function ChatEmptyState({ onSelect }: Props) {
  const { data: session } = useSession();
  const name = session?.user.name ?? "게스트";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 text-center">
      <div>
        <p className="text-lg font-semibold text-primary">{name}님, 안녕하세요</p>
        <p className="text-xl font-bold text-zinc-900">무엇을 도와드릴까요?</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
