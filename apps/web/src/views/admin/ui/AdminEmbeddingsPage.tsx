"use client";

import { useState } from "react";
import {
  useAdminEmbeddings,
  type AdminEmbeddingItem,
  type AdminEmbeddingsPage,
  type EmbeddingFilter,
} from "../model/useAdminEmbeddings";
import { Button } from "@/shared/ui/button";
import { PageLoading } from "@/shared/ui/page-loading";
import { Tabs, type TabItem } from "@/shared/ui/tabs";
import EmbeddingStatusBadge from "./EmbeddingStatusBadge";

const FILTER_TABS: (TabItem & { id: EmbeddingFilter })[] = [
  { id: "all", label: "전체" },
  { id: "incomplete", label: "미완료" },
  { id: "failed", label: "실패" },
  { id: "done", label: "완료" },
  { id: "excluded", label: "대상 아님" },
];

const TABS_ID_PREFIX = "admin-embeddings";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "공개" 칸 — 임베딩 대상이 아닌 이유(임시저장·보관·비공개)가 여기서 보이게 한다.
function visibilityLabel(item: AdminEmbeddingItem) {
  if (!item.isPublished) return "임시저장";
  if (item.isArchived) return "보관";
  return item.isPrivate ? "비공개" : "공개";
}

type SummaryCard = { label: string; value: number | null; tone?: "danger" };

// 위쪽 요약 카드 — 값은 페이지가 아니라 전체 글 기준이다. 상태를 알 수 없으면(counts가 null) 숫자 대신 "-".
function summaryCards(summary: AdminEmbeddingsPage["summary"]): SummaryCard[] {
  const { counts } = summary;
  // "미완료"는 상태 탭의 "미완료"와 같은 범위(아직 끝나지 않은 것 전부)다
  const unfinished = counts ? counts.incomplete + counts.outdated + counts.pending + counts.processing : null;
  return [
    { label: "대상 글", value: summary.eligible },
    { label: "완료", value: counts ? counts.done : null },
    { label: "미완료", value: unfinished },
    { label: "실패", value: counts ? counts.failed : null, tone: "danger" },
    { label: "대상 아님", value: summary.excluded },
  ];
}

function SummaryCards({ summary }: { summary: AdminEmbeddingsPage["summary"] }) {
  return (
    <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      {summaryCards(summary).map((card) => (
        <div key={card.label} className="rounded border border-zinc-200 px-4 py-3">
          <dt className="text-xs text-zinc-500">{card.label}</dt>
          <dd
            className={`mt-1 text-2xl font-bold ${
              card.tone === "danger" && card.value ? "text-red-600" : "text-zinc-900"
            }`}
          >
            {card.value ?? "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminEmbeddingsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<EmbeddingFilter>("all");
  const { data, isPending, isPlaceholderData, isError } = useAdminEmbeddings(page, filter);

  if (isPending && !data) {
    return <PageLoading />;
  }

  function changeFilter(next: string) {
    setFilter(next as EmbeddingFilter);
    setPage(1); // 탭을 바꾸면 항상 첫 페이지부터
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">임베딩</h1>
        {data && data.aiAvailable && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${
                data.embedder.reachable ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {data.embedder.reachable ? "임베딩 서버 연결됨" : "임베딩 서버 연결 안 됨"}
          </span>
        )}
      </div>
      {data && <SummaryCards summary={data.summary} />}

      {data && !data.aiAvailable && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          임베딩 상태를 가져오지 못했습니다. 글 목록만 표시합니다.
        </p>
      )}

      {isError && (
        <p className="mb-4 text-sm text-red-500">
          임베딩 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <div className="mb-4">
        <Tabs
          tabs={FILTER_TABS}
          value={filter}
          onChange={changeFilter}
          ariaLabel="임베딩 상태 필터"
          idPrefix={TABS_ID_PREFIX}
        />
      </div>

      <div
        role="tabpanel"
        id={`${TABS_ID_PREFIX}-panel-${filter}`}
        aria-labelledby={`${TABS_ID_PREFIX}-tab-${filter}`}
      >
        {data && data.items.length === 0 && (
          <p className="text-sm text-zinc-400">
            {data.aiAvailable ? "해당하는 글이 없습니다." : "상태를 확인할 수 없어 이 탭은 볼 수 없습니다."}
          </p>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded border border-zinc-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
                    <th className="px-4 py-2 font-medium">제목</th>
                    <th className="px-4 py-2 font-medium">카테고리</th>
                    <th className="px-4 py-2 font-medium">공개</th>
                    <th className="px-4 py-2 font-medium">상태</th>
                    <th className="px-4 py-2 font-medium">조각</th>
                    <th className="px-4 py-2 font-medium">임베딩 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.postId} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 font-medium">{item.title}</td>
                      <td className="px-4 py-2 text-zinc-600">{item.category}</td>
                      <td className="px-4 py-2 text-zinc-500">{visibilityLabel(item)}</td>
                      <td className="px-4 py-2">
                        <EmbeddingStatusBadge status={item.status} detail={item.job?.lastError} />
                        {item.status === "failed" && item.job && (
                          <div className="mt-1 text-xs text-zinc-400">시도 {item.job.attempts}회</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">{item.chunkCount > 0 ? item.chunkCount : "-"}</td>
                      <td className="px-4 py-2 text-zinc-500">
                        {item.embeddedAt ? formatDateTime(item.embeddedAt) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </Button>
              <span className="text-sm text-zinc-500">
                {data.page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages || isPlaceholderData}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              >
                다음
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
