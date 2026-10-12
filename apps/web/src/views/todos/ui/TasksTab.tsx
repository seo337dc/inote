"use client";

import { useEffect, useRef, useState } from "react";
import { tasksDueOn, useTaskGroups } from "@/entities/task";
import { todayKst } from "@/shared/lib/date";
import { LoadMoreSentinel } from "@/shared/ui/load-more-sentinel";
import { NewGroupCard, TaskGroupCard, TodaySchedule } from "@/widgets/task-board";

// 묶음이 많아도 처음엔 이만큼만 그리고, 아래로 내리면 이만큼씩 더 그린다(무한 스크롤).
// 서버 계약(`GET /task-groups`)은 전체를 한 번에 주므로 화면에서만 나눠 그린다 — "오늘 일정"은 전체 묶음에서 모은다.
const GROUP_PAGE_SIZE = 10;

// "할 일" 탭 — 맨 위 "오늘 일정" 영역, 그 아래 묶음 목록(처음엔 모두 접힘, 누르면 펼침), 맨 아래 "+ 새 묶음".
// 펼침 상태는 저장하지 않는다 — 새로고침하면 다시 접힌다.
export default function TasksTab() {
  const { data: groups, isPending, isError } = useTaskGroups();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(GROUP_PAGE_SIZE);
  // "오늘 일정"의 묶음 이름을 누르면 그 카드를 펼치고, 펼쳐진 렌더가 끝난 뒤 그 위치로 스크롤한다
  const pendingScroll = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    pendingScroll.current = null;
    document.getElementById(`task-group-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [openIds]);

  function openGroup(id: string) {
    pendingScroll.current = id;
    // 아직 안 그린 묶음이면 거기까지 그려야 펼치고 스크롤할 수 있다
    const index = groups?.findIndex((g) => g.id === id) ?? -1;
    if (index >= 0) setVisibleCount((count) => Math.max(count, index + 1));
    setOpenIds((prev) => new Set(prev).add(id)); // 이미 펼쳐져 있어도 새 Set이라 위 효과가 다시 돈다
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isPending) return <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>;
  if (isError || !groups) {
    return <p className="py-10 text-center text-sm text-zinc-500">할 일을 불러오지 못했어요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <TodaySchedule tasks={tasksDueOn(groups, todayKst())} onOpenGroup={openGroup} />
      {groups.slice(0, visibleCount).map((group) => (
        <TaskGroupCard key={group.id} group={group} open={openIds.has(group.id)} onToggle={() => toggle(group.id)} />
      ))}
      {visibleCount < groups.length && (
        <LoadMoreSentinel onLoadMore={() => setVisibleCount((count) => count + GROUP_PAGE_SIZE)} watch={visibleCount} />
      )}
      <NewGroupCard
        onCreated={(id) => {
          setOpenIds((prev) => new Set(prev).add(id));
          setVisibleCount(Number.POSITIVE_INFINITY); // 새 묶음은 목록 끝에 붙으니 전부 그려서 보이게 한다
        }}
      />
    </div>
  );
}
