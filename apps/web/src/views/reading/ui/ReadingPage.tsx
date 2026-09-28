import { ReadingLogList, ReadingLogListHeader, ReadingLogListEmpty } from "@/widgets/reading-log-list";
import type { ReadingLog } from "@/entities/reading-log";
import { api } from "@/shared/lib/api";

export default async function ReadingPage() {
  const logs = await api.get<ReadingLog[]>("/reading-logs", { cache: "no-store" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <ReadingLogListHeader count={logs.length} />

      {logs.length === 0 ? <ReadingLogListEmpty /> : <ReadingLogList logs={logs} />}
    </div>
  );
}
