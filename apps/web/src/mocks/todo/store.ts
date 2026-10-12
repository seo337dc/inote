import type { AddEntryInput, DailyEntry, DayCard, DayCardPage } from "@/entities/daily";
import { addDays, todayKst } from "@/shared/lib/date";

// 할일 API 계약(docs/TODO_FEATURE.md)을 메모리에서 흉내 내는 가짜 서버.
// 브라우저 개발용 MSW 워커와 테스트가 같은 로직을 쓴다. BE를 만들 때 이 동작이 기준이 된다.

type Routine = {
  id: string;
  title: string;
  // 시작한 날(그날부터 나옴)과, 삭제한 날(그날부터 안 나옴 — 어제까지의 기록은 남는다)
  startedOn: string;
  endedOn: string | null;
};

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

  function isActive(routine: Routine, date: string) {
    return routine.startedOn <= date && (routine.endedOn === null || routine.endedOn > date);
  }

  // 오늘 카드를 열면 활성 루틴의 오늘 기록이 없는 것만 만든다(여러 번 열어도 중복 안 됨).
  function ensureRoutineEntries(date: string) {
    for (const routine of routines) {
      if (!isActive(routine, date)) continue;
      const exists = entries.some((e) => e.routineId === routine.id && e.date === date);
      if (!exists) {
        entries.push({ id: nextId("e"), date, title: routine.title, done: false, routineId: routine.id });
      }
    }
  }

  function getDay(date: string): DayCard {
    if (date === today()) ensureRoutineEntries(date);
    return { date, entries: entries.filter((e) => e.date === date).map((e) => ({ ...e })) };
  }

  // 기록이 있는 날(항목이 있는 날)만, 최신순. before 이전 날짜부터.
  function history(before: string | null, limit: number): DayCardPage {
    const upper = before ?? today();
    const dates = new Set<string>();
    entries.forEach((e) => dates.add(e.date));
    const sorted = [...dates].filter((d) => d < upper).sort().reverse();
    const page = sorted.slice(0, limit);
    return {
      items: page.map(getDay),
      nextBefore: sorted.length > limit ? page[page.length - 1] : null,
    };
  }

  function addEntry({ title }: AddEntryInput): DailyEntry {
    const entry: DailyEntry = { id: nextId("e"), date: today(), title, done: false, routineId: null };
    entries.push(entry);
    return { ...entry };
  }

  // 오늘의 그날 항목을 "매일 반복"으로 만든다 — 그 항목이 오늘 기록이 되고, 내일부터 자동으로 나온다.
  function makeRoutine(entryId: string): { id: string; title: string } | null {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || entry.date !== today() || entry.routineId !== null) return null;
    const routine: Routine = { id: nextId("r"), title: entry.title, startedOn: entry.date, endedOn: null };
    routines.push(routine);
    entry.routineId = routine.id;
    return { id: routine.id, title: routine.title };
  }

  function patchEntry(id: string, patch: { done?: boolean; title?: string }): DailyEntry | null {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return null;
    if (patch.done !== undefined) entry.done = patch.done;
    if (patch.title !== undefined) entry.title = patch.title;
    return { ...entry };
  }

  function renameRoutine(id: string, title: string): { id: string; title: string } | null {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return null;
    routine.title = title;
    // "오늘부터" 적용 — 오늘 기록만 이름을 바꾸고 지난 기록은 그때 이름 그대로 둔다.
    entries.forEach((e) => {
      if (e.routineId === id && e.date === today()) e.title = title;
    });
    return { id, title };
  }

  function deleteRoutine(id: string): boolean {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return false;
    routine.endedOn = today();
    // 오늘부터 안 나온다 — 오늘 기록도 지우고, 어제까지는 남긴다.
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i].routineId === id && entries[i].date === today()) entries.splice(i, 1);
    }
    return true;
  }

  if (seed) {
    const t = today();
    const reading = nextId("r");
    const ledger = nextId("r");
    routines.push(
      { id: reading, title: "독서", startedOn: addDays(t, -20), endedOn: null },
      { id: ledger, title: "가계부 작성", startedOn: addDays(t, -20), endedOn: null },
    );
    const past = (daysAgo: number, doneFlags: [boolean, boolean], extra: [string, boolean][] = []) => {
      const date = addDays(t, -daysAgo);
      entries.push(
        { id: nextId("e"), date, title: "독서", done: doneFlags[0], routineId: reading },
        { id: nextId("e"), date, title: "가계부 작성", done: doneFlags[1], routineId: ledger },
        ...extra.map(([title, done]) => ({ id: nextId("e"), date, title, done, routineId: null })),
      );
    };
    past(1, [true, false], [["이력서 수정", false]]);
    past(2, [true, true], [["회사 지원", true]]);
    past(3, [false, true]);
    past(5, [true, true], [["운동", true]]);
  }

  return { getDay, history, addEntry, makeRoutine, patchEntry, renameRoutine, deleteRoutine };
}
