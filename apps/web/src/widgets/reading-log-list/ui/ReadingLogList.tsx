import Link from "next/link";
import type { ReadingLog } from "@/entities/reading-log";

type Props = {
  logs: ReadingLog[];
  emptyMessage?: string;
};

export default function ReadingLogList({ logs, emptyMessage = "기록이 없습니다." }: Props) {
  return (
    <ul className="divide-y divide-zinc-100">
      {logs.map((log) => (
        <li key={log.id} className="py-5">
          <Link href={`/reading/${log.id}`} className="group flex gap-4">
            {log.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지
              <img
                src={log.coverImageUrl}
                alt={log.title}
                className="h-20 w-14 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-400">
                <span className="truncate">{log.author || "작가 미상"}</span>
                <span className="shrink-0">
                  {new Date(log.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <h2 className="text-lg font-semibold group-hover:underline">{log.title}</h2>
              {log.aiSummary?.synopsis && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                  {log.aiSummary.synopsis}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
      {logs.length === 0 && (
        <li className="py-10 text-center text-sm text-zinc-400">{emptyMessage}</li>
      )}
    </ul>
  );
}
