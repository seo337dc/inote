import { notFound } from "next/navigation";
import type { ReadingLog } from "@/entities/reading-log";
import { api, ApiError } from "@/shared/lib/api";
import DeleteReadingLogButton from "./DeleteReadingLogButton";
import EditReadingLogLink from "./EditReadingLogLink";
import ReadingLogAiInfo from "./ReadingLogAiInfo";

type Props = {
  id: string;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("ko-KR") : null;
}

export default async function ReadingLogDetailPage({ id }: Props) {
  let readingLog: ReadingLog;
  try {
    readingLog = await api.get<ReadingLog>(`/reading-logs/${id}`, { cache: "no-store" });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const started = formatDate(readingLog.startedAt);
  const finished = formatDate(readingLog.finishedAt);

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">독서 기록</span>
        <div className="flex items-center gap-3">
          <EditReadingLogLink readingLogId={readingLog.id} authorId={readingLog.userId} />
          <DeleteReadingLogButton readingLogId={readingLog.id} authorId={readingLog.userId} />
        </div>
      </div>

      <div className="mb-6 flex gap-5">
        {readingLog.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시
          <img
            src={readingLog.coverImageUrl}
            alt={readingLog.title}
            className="h-40 w-28 shrink-0 rounded object-cover shadow-sm"
          />
        )}
        <div>
          <h1 className="mb-1 text-3xl font-bold">{readingLog.title}</h1>
          {readingLog.author && <p className="mb-1 text-zinc-500">{readingLog.author}</p>}
          {(started || finished) && (
            <p className="text-sm text-zinc-400">
              {started ?? "?"} ~ {finished ?? "읽는 중"}
            </p>
          )}
        </div>
      </div>

      {readingLog.aiSummary && <ReadingLogAiInfo summary={readingLog.aiSummary} />}

      {readingLog.content.trim() ? (
        // 본인만 쓰는 개인 블로그와 동일한 신뢰 경계 — 별도 sanitize 없이 그대로 렌더.
        <div
          className="prose prose-zinc max-w-none rounded-2xl border border-zinc-200 bg-white p-8 break-words shadow-sm"
          dangerouslySetInnerHTML={{ __html: readingLog.content }}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-zinc-400">
          아직 독후감이 없어요.
        </p>
      )}
    </article>
  );
}
