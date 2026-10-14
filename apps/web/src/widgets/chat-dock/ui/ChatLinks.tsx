import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ChatLink } from "../model/types";

type Props = {
  links: ChatLink[];
  // 링크를 눌러 이동할 때 — 모바일에서는 채팅 시트가 화면을 가리지 않게 닫는다
  onNavigate?: () => void;
};

// 화면이 직접 만든 안내 답변 아래의 이동 링크 (이어 쓸 글, 새 글 쓰기 등)
export default function ChatLinks({ links, onNavigate }: Props) {
  if (links.length === 0) return null;

  return (
    <ul className="mt-2 w-full max-w-[85%] space-y-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 font-medium text-zinc-800">{link.label}</span>
              {link.hint && <span className="block truncate text-xs text-zinc-500">{link.hint}</span>}
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
