import type { AddEntryInput, DailyEntry, DayCard, DayCardPage } from "@/entities/daily";
import type { Task, TaskGroup } from "@/entities/task";
import { addDays, todayKst } from "@/shared/lib/date";
import type { TaskStatus } from "@/shared/lib/task-status";

// 할일 API 계약(docs/TODO_FEATURE.md)을 메모리에서 흉내 내는 가짜 서버.
// 브라우저 개발용 MSW 워커와 테스트가 같은 로직을 쓴다. BE를 만들 때 이 동작이 기준이 된다.

// 고정 리스트의 한 항목 — 오늘 카드로 "복사"해 올 때 쓰는 원본일 뿐, 가져온 기록과는 이어져 있지 않다.
type Routine = {
  id: string;
  title: string;
};

type Group = { id: string; name: string; starred: boolean };

type StoreOptions = {
  // 테스트는 날짜를 고정하려고 넘긴다. 기본은 한국 시간 오늘.
  today?: () => string;
  seed?: boolean;
};

export type TodoStore = ReturnType<typeof createTodoStore>;

export function createTodoStore({ today = todayKst, seed = true }: StoreOptions = {}) {
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}${(seq += 1)}`;

  const routines: Routine[] = [];
  const entries: DailyEntry[] = [];
  const groups: Group[] = [];
  const tasks: Task[] = [];

  // 카드를 여는 것만으로는 아무것도 만들지 않는다 — 고정 리스트는 importRoutines(설정 화면의 가져오기)로만 들어온다.
  function getDay(date: string): DayCard {
    return { date, entries: entries.filter((e) => e.date === date).map((e) => ({ ...e })) };
  }

  // 기록이 있는 날(항목이 있는 날)만, 최신순. before(미포함) 이전 날짜부터, from(포함)이 있으면 그 날짜 이후만.
  // 오늘 이후는 항상 뺀다 — 오늘은 getDay로 본다.
  function history(before: string | null, limit: number, from: string | null = null): DayCardPage {
    const upper = before && before < today() ? before : today();
    const dates = new Set<string>();
    entries.forEach((e) => dates.add(e.date));
    const sorted = [...dates].filter((d) => d < upper && (from === null || d >= from)).sort().reverse();
    const page = sorted.slice(0, limit);
    return {
      items: page.map(getDay),
      nextBefore: sorted.length > limit ? page[page.length - 1] : null,
    };
  }

  // 고정 리스트 — 만든 순서대로
  function listRoutines(): Routine[] {
    return routines.map((r) => ({ ...r }));
  }

  function createRoutine(title: string): Routine {
    const routine: Routine = { id: nextId("r"), title };
    routines.push(routine);
    return { ...routine };
  }

  function addEntry({ title }: AddEntryInput): DailyEntry {
    const entry: DailyEntry = { id: nextId("e"), date: today(), title, done: false };
    entries.push(entry);
    return { ...entry };
  }

  // 고정 리스트를 오늘 카드로 복사한다 — 제목만 베껴 새 그날 항목(체크 해제)을 만들고, 그 뒤로는 서로 상관없다.
  // 오늘 카드에 이미 같은 제목이 있으면 건너뛴다(여러 번 눌러도 중복 안 됨). 오늘 카드를 돌려준다.
  function importRoutines(): DayCard {
    const date = today();
    for (const routine of routines) {
      if (entries.some((e) => e.date === date && e.title === routine.title)) continue;
      entries.push({ id: nextId("e"), date, title: routine.title, done: false });
    }
    return getDay(date);
  }

  function patchEntry(id: string, patch: { done?: boolean; title?: string }): DailyEntry | null {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return null;
    if (patch.done !== undefined) entry.done = patch.done;
    if (patch.title !== undefined) entry.title = patch.title;
    return { ...entry };
  }

  // 이름을 바꾸거나 지워도 이미 가져온 기록(오늘·지난 카드)은 그대로다.
  function renameRoutine(id: string, title: string): Routine | null {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return null;
    routine.title = title;
    return { ...routine };
  }

  function deleteRoutine(id: string): boolean {
    const index = routines.findIndex((r) => r.id === id);
    if (index < 0) return false;
    routines.splice(index, 1);
    return true;
  }

  // ── 할 일 탭: 묶음 > 작업 ──

  function listGroups(): TaskGroup[] {
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      starred: g.starred,
      tasks: tasks.filter((t) => t.groupId === g.id).map((t) => ({ ...t })),
    }));
  }

  function createGroup(name: string): TaskGroup {
    const group: Group = { id: nextId("g"), name, starred: false };
    groups.push(group);
    return { ...group, tasks: [] };
  }

  // 이름 변경과 별(중요) 토글이 같은 PATCH다. 키를 안 보내면 그대로 둔다.
  function patchGroup(id: string, patch: { name?: string; starred?: boolean }): TaskGroup | null {
    const group = groups.find((g) => g.id === id);
    if (!group) return null;
    if (patch.name !== undefined) group.name = patch.name;
    if (patch.starred !== undefined) group.starred = patch.starred;
    return listGroups().find((g) => g.id === id) ?? null;
  }

  // 묶음을 지우면 안의 작업도 함께 사라진다.
  function deleteGroup(id: string): boolean {
    const index = groups.findIndex((g) => g.id === id);
    if (index === -1) return false;
    groups.splice(index, 1);
    for (let i = tasks.length - 1; i >= 0; i -= 1) {
      if (tasks[i].groupId === id) tasks.splice(i, 1);
    }
    return true;
  }

  // 일정 규칙: 없음 / 시작일만 / 시작일~종료일. 종료일만 있는 작업은 없고, 종료일은 시작일과 같거나 이후여야 한다.
  function isValidSchedule(startDate: string | null, endDate: string | null): boolean {
    if (endDate === null) return true;
    return startDate !== null && endDate >= startDate;
  }

  type TaskInput = { title: string; startDate: string | null; endDate: string | null };

  function createTask(
    groupId: string,
    { title, startDate, endDate }: TaskInput,
  ): { ok: true; task: Task } | { ok: false; reason: "no-group" | "invalid-dates" } {
    if (!groups.some((g) => g.id === groupId)) return { ok: false, reason: "no-group" };
    if (!isValidSchedule(startDate, endDate)) return { ok: false, reason: "invalid-dates" };
    const task: Task = { id: nextId("t"), groupId, title, status: "TODO", startDate, endDate, starred: false };
    tasks.push(task);
    return { ok: true, task: { ...task } };
  }

  // 키를 안 보내면 그대로 두고, 날짜는 null로 보내면 해제한다. 합쳐진 일정이 규칙에 어긋나면 거절한다
  // (예: 시작일만 지우고 종료일을 남기는 것 — 시작일을 지울 때는 종료일도 함께 null로 보내야 한다).
  function patchTask(
    id: string,
    patch: {
      title?: string;
      startDate?: string | null;
      endDate?: string | null;
      status?: TaskStatus;
      starred?: boolean;
    },
  ): { ok: true; task: Task } | { ok: false; reason: "not-found" | "invalid-dates" } {
    const task = tasks.find((t) => t.id === id);
    if (!task) return { ok: false, reason: "not-found" };
    const startDate = patch.startDate !== undefined ? patch.startDate : task.startDate;
    const endDate = patch.endDate !== undefined ? patch.endDate : task.endDate;
    if (!isValidSchedule(startDate, endDate)) return { ok: false, reason: "invalid-dates" };
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.status !== undefined) task.status = patch.status;
    if (patch.starred !== undefined) task.starred = patch.starred;
    task.startDate = startDate;
    task.endDate = endDate;
    return { ok: true, task: { ...task } };
  }

  // 묶음 안 작업의 전체 순서를 저장한다. id가 그 묶음의 작업과 정확히 같은 집합이 아니면 "mismatch".
  function reorderTasks(groupId: string, taskIds: string[]): "ok" | "no-group" | "mismatch" {
    if (!groups.some((g) => g.id === groupId)) return "no-group";
    const own = tasks.filter((t) => t.groupId === groupId);
    const ids = new Set(taskIds);
    if (taskIds.length !== own.length || ids.size !== taskIds.length || !own.every((t) => ids.has(t.id))) {
      return "mismatch";
    }
    // 묶음별 순서는 배열 안의 상대 순서로 정해진다 — 이 묶음 작업을 빼고 새 순서대로 뒤에 다시 넣는다.
    const byId = new Map(own.map((t) => [t.id, t]));
    const others = tasks.filter((t) => t.groupId !== groupId);
    tasks.splice(0, tasks.length, ...others, ...taskIds.map((id) => byId.get(id)!));
    return "ok";
  }

  function deleteTask(id: string): boolean {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    return true;
  }

  if (seed) {
    const t = today();
    routines.push({ id: nextId("r"), title: "독서" }, { id: nextId("r"), title: "가계부 작성" });
    const past = (daysAgo: number, doneFlags: [boolean, boolean], extra: [string, boolean][] = []) => {
      const date = addDays(t, -daysAgo);
      entries.push(
        { id: nextId("e"), date, title: "독서", done: doneFlags[0] },
        { id: nextId("e"), date, title: "가계부 작성", done: doneFlags[1] },
        ...extra.map(([title, done]) => ({ id: nextId("e"), date, title, done })),
      );
    };
    past(1, [true, false], [["이력서 수정", false]]);
    past(2, [true, true], [["회사 지원", true]]);
    past(3, [false, true]);
    past(5, [true, true], [["운동", true]]);

    const side = nextId("g");
    const job = nextId("g");
    const legacy = nextId("g");
    groups.push(
      { id: side, name: "사이드프로젝트", starred: true },
      { id: job, name: "이직 준비", starred: false },
      { id: legacy, name: "기존 할일", starred: false },
    );
    const add = (
      groupId: string,
      title: string,
      status: TaskStatus,
      startDate: string | null,
      endDate: string | null = null,
      starred = false,
    ) => tasks.push({ id: nextId("t"), groupId, title, status, startDate, endDate, starred });
    add(side, "할일 페이지 개발", "IN_PROGRESS", t, addDays(t, 4), true); // 오늘이 낀 기간
    add(side, "DB 세팅", "TODO", t); // 시작일만 — 오늘 하루
    add(side, "API 개발", "TODO", addDays(t, 3), addDays(t, 7));
    add(job, "포트폴리오 정리", "TODO", addDays(t, -1)); // 시작일이 지남
    add(job, "이력서 제출", "DONE", null);
    // 기존 할일(제목·마감일·완료 여부) 이전 결과를 흉내 낸 묶음 — 마감일은 시작일로 옮긴다
    add(legacy, "세금 납부", "TODO", addDays(t, -2));
    add(legacy, "책 반납", "DONE", addDays(t, -6));
  }

  return {
    getDay,
    history,
    importRoutines,
    listRoutines,
    createRoutine,
    addEntry,
    patchEntry,
    renameRoutine,
    deleteRoutine,
    listGroups,
    createGroup,
    patchGroup,
    deleteGroup,
    createTask,
    patchTask,
    reorderTasks,
    deleteTask,
  };
}
