import Link from "next/link";
import type { ChatSource } from "../model/types";

type Props = {
  sources: ChatSource[];
  // 카드를 눌러 글로 이동할 때 — 모바일에서는 채팅 시트가 글을 가리지 않게 닫는다
  onNavigate?: () => void;
};

// 글 찾기 답변의 출처 글 목록. 답변 안의 [1] [2]는 이 번호를 가리킨다.
// 주소는 모델이 쓰지 않고, 서버가 준 글 id로 여기서 만든다(없는 주소를 지어내지 못하게).
export default function SourceCards({ sources, onNavigate }: Props) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 w-full max-w-[85%]">
      <p className="mb-1 text-xs text-zinc-400">참고한 글</p>
      <ol className="space-y-1">
        {sources.map((source, i) => (
          <li key={source.id}>
            <Link
              href={`/posts/${encodeURIComponent(source.id)}`}
              onClick={onNavigate}
              className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-zinc-400">{i + 1}</span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-medium text-zinc-800">
                  {source.title.trim() || "(제목 없음)"}
                </span>
                {source.category && (
                  <span className="block truncate text-xs text-zinc-500">{source.category}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
