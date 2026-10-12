"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/shared/ui/page-loading";
import { Tabs } from "@/shared/ui/tabs";
import { useSession } from "@/shared/lib/auth-client";
import DailyTab from "./DailyTab";

const TABS = [
  { id: "daily", label: "오늘의 할일" },
  { id: "tasks", label: "할 일" },
];

export default function TodosPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const [tab, setTab] = useState("daily");

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
        <h1 className="text-xl font-bold">할 일</h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">나만 보는 개인 할 일 목록입니다.</p>

      <Tabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="할 일 보기" idPrefix="todos" />

      <div
        role="tabpanel"
        id={`todos-panel-${tab}`}
        aria-labelledby={`todos-tab-${tab}`}
        className="pt-6"
      >
        {tab === "daily" ? (
          <DailyTab />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-400">묶음과 작업 화면은 다음 단계에서 만들어요.</p>
        )}
      </div>
    </div>
  );
}
