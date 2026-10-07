"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryManager } from "@/features/manage-categories";
import { PostMover } from "@/features/move-posts";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";
import { Tabs } from "@/shared/ui/tabs";

type TabId = "structure" | "posts";

const TABS = [
  { id: "structure", label: "카테고리 구조" },
  { id: "posts", label: "글 이동" },
];

const DESCRIPTIONS: Record<TabId, string> = {
  structure:
    "글을 나눌 카테고리를 확인하고 추가해요. 하위 카테고리는 최대 3단계까지 만들 수 있고, 숫자는 그 카테고리(하위 포함)의 글 수예요.",
  posts: "글을 끌어서 다른 카테고리 폴더로 옮겨요. 옮길 폴더가 없으면 여기서 바로 추가할 수 있어요.",
};

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const [tab, setTab] = useState<TabId>("structure");

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">카테고리 관리</h1>
      <p className="mb-5 text-sm text-zinc-500">{DESCRIPTIONS[tab]}</p>
      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        ariaLabel="카테고리 관리 메뉴"
        idPrefix="categories"
      />
      <div
        role="tabpanel"
        id={`categories-panel-${tab}`}
        aria-labelledby={`categories-tab-${tab}`}
        className="pt-5"
      >
        {tab === "structure" ? <CategoryManager /> : <PostMover />}
      </div>
    </div>
  );
}
