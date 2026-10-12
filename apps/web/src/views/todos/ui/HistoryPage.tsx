"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageLoading } from "@/shared/ui/page-loading";
import { Tabs } from "@/shared/ui/tabs";
import { useSession } from "@/shared/lib/auth-client";
import HistoryAll from "./HistoryAll";
import HistoryCalendar from "./HistoryCalendar";
import HistoryMonth from "./HistoryMonth";

const VIEWS = [
  { id: "list", label: "리스트" },
  { id: "calendar", label: "달력" },
];

const TABS = [
  { id: "all", label: "전체" },
  { id: "week", label: "주차별" },
  { id: "month", label: "월별" },
];

// 지난 기록 — 전체(리스트: 최신순 + 더 보기 / 달력) / 주차별(달 이동 + N주차 묶음) / 월별(달 이동). 입력줄은 없고 체크는 바꿀 수 있다.
export default function HistoryPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const [tab, setTab] = useState("all");
  // 전체 탭에서만 — 카드 목록(리스트) 또는 달력으로 본다
  const [view, setView] = useState("list");

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-bold">지난 기록</h1>
        <Link href="/todos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" />
          오늘의 할일로
        </Link>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="지난 기록 보기" idPrefix="history" />

      <div role="tabpanel" id={`history-panel-${tab}`} aria-labelledby={`history-tab-${tab}`} className="pt-6">
        {tab === "all" && (
          <>
            <div role="group" aria-label="전체 보기 방식" className="mb-4 inline-flex rounded-lg border border-zinc-200 p-0.5">
              {VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  className={`rounded-md px-3 py-1 text-sm ${view === id ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {view === "list" ? <HistoryAll /> : <HistoryCalendar />}
          </>
        )}
        {tab === "week" && <HistoryMonth grouped />}
        {tab === "month" && <HistoryMonth grouped={false} />}
      </div>
    </div>
  );
}
