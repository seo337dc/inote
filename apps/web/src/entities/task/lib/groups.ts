import type { Task, TaskGroup, UpdateGroupInput, UpdateTaskInput } from "../model/types";

// ── 낙관적 업데이트용 순수 함수 — 캐시의 묶음 목록을 새 배열로 돌려준다 ──

export function addGroup(groups: TaskGroup[], group: TaskGroup): TaskGroup[] {
  return [...groups, group];
}

export function updateGroup(groups: TaskGroup[], patch: UpdateGroupInput): TaskGroup[] {
  const { id, ...fields } = patch;
  return groups.map((g) => (g.id === id ? { ...g, ...fields } : g));
}

export function removeGroup(groups: TaskGroup[], id: string): TaskGroup[] {
  return groups.filter((g) => g.id !== id);
}

export function addTask(groups: TaskGroup[], task: Task): TaskGroup[] {
  return groups.map((g) => (g.id === task.groupId ? { ...g, tasks: [...g.tasks, task] } : g));
}

export function updateTask(groups: TaskGroup[], patch: UpdateTaskInput): TaskGroup[] {
  const { id, ...fields } = patch;
  return groups.map((g) => ({
    ...g,
    tasks: g.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t)),
  }));
}

export function removeTask(groups: TaskGroup[], id: string): TaskGroup[] {
  return groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== id) }));
}

// 한 묶음 안의 작업을 주어진 id 순서로 다시 나열한다. id가 그 묶음의 작업과 정확히 같은 집합이 아니면 그대로 둔다.
export function reorderTasks(groups: TaskGroup[], groupId: string, taskIds: string[]): TaskGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    const byId = new Map(g.tasks.map((t) => [t.id, t]));
    const sameSet = taskIds.length === g.tasks.length && taskIds.every((id) => byId.has(id)) && byId.size === new Set(taskIds).size;
    return sameSet ? { ...g, tasks: taskIds.map((id) => byId.get(id)!) } : g;
  });
}

// 드래그가 끝났을 때 새 id 순서 — activeId를 overId 자리로 옮긴다. 같은 자리이거나 모르는 id면 null.
export function moveId(ids: string[], activeId: string, overId: string): string[] | null {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return next;
}

// ── 화면용 계산 ──

export type TaskWithGroup = Task & { groupName: string };

// 그날이 작업의 일정에 드는지 — 시작일만 있으면 그날 하루, 시작~종료면 그 기간의 매일. 일정이 없으면 아니다.
export function isScheduledOn(task: Task, date: string): boolean {
  if (task.startDate === null) return false;
  return task.endDate === null ? task.startDate === date : task.startDate <= date && date <= task.endDate;
}

// 일정이 그날에 드는 작업을 묶음과 상관없이 모은다("오늘 일정" 영역). 묶음 순서·작업 순서를 그대로 따른다.
export function tasksDueOn(groups: TaskGroup[], date: string): TaskWithGroup[] {
  return groups.flatMap((g) =>
    g.tasks.filter((t) => isScheduledOn(t, date)).map((t) => ({ ...t, groupName: g.name })),
  );
}

export function countTasksDone(tasks: Task[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.status === "DONE").length, total: tasks.length };
}

// 일정이 끝난(종료일, 없으면 시작일) 날이 오늘보다 이전인데 아직 안 끝난 작업
export function isOverdue(task: Task, today: string): boolean {
  const last = task.endDate ?? task.startDate;
  return task.status !== "DONE" && last !== null && last < today;
}
