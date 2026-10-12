import { describe, expect, it } from "vitest";
import { createTodoStore } from "./store";

// 이 가짜 서버가 지키는 규칙이 곧 BE가 지켜야 할 계약이다 (docs/TODO_FEATURE.md 결정 4·6·10).
const TODAY = "2026-10-12";

function setup(options: { seed?: boolean } = { seed: false }) {
  let today = TODAY;
  const store = createTodoStore({ today: () => today, seed: options.seed });
  // 루틴은 그날 항목을 만든 뒤 "매일 반복으로 만들기"로 등록한다 — 그 항목의 기록을 돌려준다
  const addRoutine = (title: string) => {
    const entry = store.addEntry({ title });
    const routine = store.makeRoutine(entry.id)!;
    return { entry, routineId: routine.id };
  };
  return { store, addRoutine, setToday: (d: string) => (today = d) };
}

describe("그날 항목을 매일 반복으로 만들기", () => {
  it("만든 항목이 오늘의 루틴 기록이 된다(새로 하나 더 생기지 않는다)", () => {
    const { store, addRoutine } = setup();
    addRoutine("독서");

    const card = store.getDay(TODAY);
    expect(card.entries).toHaveLength(1);
    expect(card.entries[0]).toMatchObject({ title: "독서", done: false });
    expect(card.entries[0].routineId).not.toBeNull();
  });

  it("오늘의 그날 항목만 루틴으로 만들 수 있고, 이미 루틴이거나 없는 항목은 거절한다", () => {
    const { store, addRoutine, setToday } = setup();
    const { entry } = addRoutine("독서");
    expect(store.makeRoutine(entry.id)).toBeNull(); // 이미 루틴
    expect(store.makeRoutine("nope")).toBeNull(); // 없는 항목

    const other = store.addEntry({ title: "이력서 수정" });
    setToday("2026-10-13");
    expect(store.makeRoutine(other.id)).toBeNull(); // 지난 날짜 항목
  });

  it("다음 날 카드를 열면 루틴이 새 기록(체크 해제)으로 나온다", () => {
    const { store, addRoutine, setToday } = setup();
    const { entry } = addRoutine("독서");
    store.patchEntry(entry.id, { done: true });

    setToday("2026-10-13");
    const card = store.getDay("2026-10-13");

    expect(card.entries).toHaveLength(1);
    expect(card.entries[0].done).toBe(false);
  });

  it("카드를 여러 번 열어도 같은 날 루틴 기록이 중복되지 않는다", () => {
    const { store, addRoutine } = setup();
    addRoutine("독서");

    store.getDay(TODAY);
    store.getDay(TODAY);

    expect(store.getDay(TODAY).entries).toHaveLength(1);
  });

  it("그날 추가 항목(루틴 아님)은 다음 날로 이월되지 않는다", () => {
    const { store, setToday } = setup();
    store.addEntry({ title: "이력서 수정" });

    setToday("2026-10-13");

    expect(store.getDay("2026-10-13").entries).toEqual([]);
  });
});

describe("루틴 이름 변경", () => {
  it("오늘 기록은 새 이름이 되고, 지난 기록은 그때 이름 그대로다", () => {
    const { store, addRoutine, setToday } = setup();
    const { routineId } = addRoutine("독서");
    setToday("2026-10-13");
    store.getDay("2026-10-13"); // 13일 기록 생성

    store.renameRoutine(routineId, "책 읽기");

    expect(store.getDay("2026-10-13").entries[0].title).toBe("책 읽기");
    expect(store.getDay(TODAY).entries[0].title).toBe("독서");
  });
});

describe("루틴 삭제", () => {
  it("오늘부터 안 나오고, 어제까지의 기록은 남는다", () => {
    const { store, addRoutine, setToday } = setup();
    const { routineId } = addRoutine("독서");
    setToday("2026-10-13");
    store.getDay("2026-10-13");

    store.deleteRoutine(routineId);

    expect(store.getDay("2026-10-13").entries).toEqual([]);
    expect(store.getDay(TODAY).entries).toHaveLength(1);
  });

  it("없는 루틴이면 false", () => {
    const { store } = setup();
    expect(store.deleteRoutine("nope")).toBe(false);
  });
});

describe("지난 기록 목록", () => {
  it("기록이 있는 날만 최신순으로 주고, 오늘은 뺀다", () => {
    const { store } = setup({ seed: true });
    const page = store.history(null, 10);

    expect(page.items.map((c) => c.date)).toEqual(["2026-10-11", "2026-10-10", "2026-10-09", "2026-10-07"]);
    expect(page.nextBefore).toBeNull();
  });

  it("limit보다 많으면 nextBefore로 이어서 불러온다", () => {
    const { store } = setup({ seed: true });
    const first = store.history(null, 2);
    expect(first.items.map((c) => c.date)).toEqual(["2026-10-11", "2026-10-10"]);
    expect(first.nextBefore).toBe("2026-10-10");

    const second = store.history(first.nextBefore, 2);
    expect(second.items.map((c) => c.date)).toEqual(["2026-10-09", "2026-10-07"]);
    expect(second.nextBefore).toBeNull();
  });
});

// 할 일 탭 테스트에서 작업을 쉽게 만들기 위한 도우미 (실패하면 바로 터지게 한다)
function makeTask(
  store: ReturnType<typeof createTodoStore>,
  groupId: string,
  title: string,
  dates: { startDate?: string | null; endDate?: string | null } = {},
) {
  const result = store.createTask(groupId, { title, startDate: dates.startDate ?? null, endDate: dates.endDate ?? null });
  if (!result.ok) throw new Error(`작업 만들기 실패: ${result.reason}`);
  return result.task;
}

describe("묶음", () => {
  it("묶음을 만들면 별 표시 없이 빈 작업 목록으로 목록 맨 뒤에 생긴다", () => {
    const { store } = setup();
    store.createGroup("사이드프로젝트");
    store.createGroup("이직 준비");

    expect(store.listGroups().map((g) => [g.name, g.starred, g.tasks.length])).toEqual([
      ["사이드프로젝트", false, 0],
      ["이직 준비", false, 0],
    ]);
  });

  it("이름을 바꿔도 안의 작업과 별 표시는 그대로다", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");
    store.patchGroup(group.id, { starred: true });
    makeTask(store, group.id, "DB 세팅");

    const renamed = store.patchGroup(group.id, { name: "사이드프로젝트" });

    expect(renamed).toMatchObject({ name: "사이드프로젝트", starred: true });
    expect(renamed?.tasks.map((t) => t.title)).toEqual(["DB 세팅"]);
  });

  it("별 표시를 켜고 끌 수 있고, 이름은 그대로다", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");

    expect(store.patchGroup(group.id, { starred: true })).toMatchObject({ name: "사이드", starred: true });
    expect(store.patchGroup(group.id, { starred: false })?.starred).toBe(false);
  });

  it("묶음을 지우면 안의 작업도 함께 사라진다(다른 묶음 작업은 그대로)", () => {
    const { store } = setup();
    const a = store.createGroup("A");
    const b = store.createGroup("B");
    const taskA = makeTask(store, a.id, "a1");
    makeTask(store, b.id, "b1");

    expect(store.deleteGroup(a.id)).toBe(true);

    expect(store.listGroups().map((g) => g.name)).toEqual(["B"]);
    expect(store.patchTask(taskA.id, { status: "DONE" })).toEqual({ ok: false, reason: "not-found" }); // 작업도 사라짐
  });

  it("없는 묶음은 수정·삭제·작업 추가가 모두 거절된다", () => {
    const { store } = setup();
    expect(store.patchGroup("nope", { name: "x" })).toBeNull();
    expect(store.deleteGroup("nope")).toBe(false);
    expect(store.createTask("nope", { title: "x", startDate: null, endDate: null })).toEqual({
      ok: false,
      reason: "no-group",
    });
  });
});

describe("작업", () => {
  it("새 작업은 '할 일' 상태, 별 없음으로 생기고 일정은 선택이다", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");

    const none = makeTask(store, group.id, "정리");
    const startOnly = makeTask(store, group.id, "API", { startDate: "2026-10-20" });
    const range = makeTask(store, group.id, "배포", { startDate: "2026-10-20", endDate: "2026-10-25" });

    expect(none).toMatchObject({ status: "TODO", starred: false, startDate: null, endDate: null });
    expect(startOnly).toMatchObject({ startDate: "2026-10-20", endDate: null });
    expect(range).toMatchObject({ startDate: "2026-10-20", endDate: "2026-10-25" });
  });

  it("종료일만 있거나 종료일이 시작일보다 이르면 만들 수 없다", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");

    expect(store.createTask(group.id, { title: "x", startDate: null, endDate: "2026-10-25" })).toEqual({
      ok: false,
      reason: "invalid-dates",
    });
    expect(store.createTask(group.id, { title: "x", startDate: "2026-10-25", endDate: "2026-10-20" })).toEqual({
      ok: false,
      reason: "invalid-dates",
    });
    expect(store.listGroups()[0].tasks).toEqual([]);
  });

  it("종료일이 시작일과 같은 날이면 허용한다(하루짜리 기간)", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");
    expect(store.createTask(group.id, { title: "x", startDate: "2026-10-20", endDate: "2026-10-20" }).ok).toBe(true);
  });

  it("상태는 할 일에서 완료로 바로 바꿀 수 있다", () => {
    const { store } = setup();
    const task = makeTask(store, store.createGroup("사이드").id, "DB 세팅");

    expect(store.patchTask(task.id, { status: "DONE" })).toMatchObject({ ok: true, task: { status: "DONE" } });
  });

  it("별 표시를 켜고 끌 수 있다", () => {
    const { store } = setup();
    const task = makeTask(store, store.createGroup("사이드").id, "DB 세팅");

    expect(store.patchTask(task.id, { starred: true })).toMatchObject({ ok: true, task: { starred: true } });
    expect(store.patchTask(task.id, { starred: false })).toMatchObject({ ok: true, task: { starred: false } });
  });

  it("날짜는 null로 보내면 해제되고, 키를 안 보내면 그대로다", () => {
    const { store } = setup();
    const task = makeTask(store, store.createGroup("사이드").id, "API", { startDate: "2026-10-20", endDate: "2026-10-25" });

    expect(store.patchTask(task.id, { title: "API 개발" })).toMatchObject({
      task: { startDate: "2026-10-20", endDate: "2026-10-25" },
    });
    expect(store.patchTask(task.id, { endDate: null })).toMatchObject({ task: { startDate: "2026-10-20", endDate: null } });
    expect(store.patchTask(task.id, { startDate: null })).toMatchObject({ task: { startDate: null, endDate: null } });
  });

  it("시작일만 지우고 종료일을 남기거나, 종료일을 시작일보다 앞으로 옮기면 거절하고 값은 그대로다", () => {
    const { store } = setup();
    const task = makeTask(store, store.createGroup("사이드").id, "API", { startDate: "2026-10-20", endDate: "2026-10-25" });

    expect(store.patchTask(task.id, { startDate: null })).toEqual({ ok: false, reason: "invalid-dates" });
    expect(store.patchTask(task.id, { endDate: "2026-10-19" })).toEqual({ ok: false, reason: "invalid-dates" });
    expect(store.patchTask(task.id, { startDate: "2026-10-30" })).toEqual({ ok: false, reason: "invalid-dates" }); // 종료일이 앞서게 됨
    expect(store.listGroups()[0].tasks[0]).toMatchObject({ startDate: "2026-10-20", endDate: "2026-10-25" });
  });

  it("일정 없는 작업에 종료일만 넣을 수 없다", () => {
    const { store } = setup();
    const task = makeTask(store, store.createGroup("사이드").id, "API");

    expect(store.patchTask(task.id, { endDate: "2026-10-25" })).toEqual({ ok: false, reason: "invalid-dates" });
  });

  it("지우면 목록에서 사라지고, 없는 작업은 false", () => {
    const { store } = setup();
    const group = store.createGroup("사이드");
    const task = makeTask(store, group.id, "DB");

    expect(store.deleteTask(task.id)).toBe(true);
    expect(store.listGroups()[0].tasks).toEqual([]);
    expect(store.deleteTask(task.id)).toBe(false);
  });

  it("시드에는 오늘이 일정에 드는 작업(시작일만·기간), 별 표시, 이전된 '기존 할일' 묶음이 들어 있다", () => {
    const { store } = setup({ seed: true });
    const groups = store.listGroups();

    expect(groups.map((g) => [g.name, g.starred])).toEqual([
      ["사이드프로젝트", true],
      ["이직 준비", false],
      ["기존 할일", false],
    ]);
    const side = groups[0].tasks;
    expect(side.find((t) => t.title === "할일 페이지 개발")).toMatchObject({ startDate: TODAY, endDate: "2026-10-16", starred: true });
    expect(side.find((t) => t.title === "DB 세팅")).toMatchObject({ startDate: TODAY, endDate: null });
  });
});

describe("작업 순서 변경", () => {
  function twoGroups() {
    const { store } = setup();
    const a = store.createGroup("A");
    const b = store.createGroup("B");
    const [a1, a2, a3] = ["a1", "a2", "a3"].map((title) => makeTask(store, a.id, title));
    const b1 = makeTask(store, b.id, "b1");
    return { store, a, b, a1, a2, a3, b1 };
  }

  it("묶음 안 작업을 주어진 순서로 저장하고, 새로 읽어도 그 순서다", () => {
    const { store, a, a1, a2, a3 } = twoGroups();

    expect(store.reorderTasks(a.id, [a3.id, a1.id, a2.id])).toBe("ok");

    expect(store.listGroups()[0].tasks.map((t) => t.title)).toEqual(["a3", "a1", "a2"]);
  });

  it("다른 묶음의 작업 순서는 그대로다", () => {
    const { store, a, a1, a2, a3 } = twoGroups();
    store.reorderTasks(a.id, [a3.id, a2.id, a1.id]);

    expect(store.listGroups()[1].tasks.map((t) => t.title)).toEqual(["b1"]);
  });

  it("작업이 모자라거나 겹치거나 다른 묶음 것이 섞이면 'mismatch'로 거절하고 순서는 그대로다", () => {
    const { store, a, a1, a2, a3, b1 } = twoGroups();

    for (const ids of [[a1.id, a2.id], [a1.id, a1.id, a2.id], [a1.id, a2.id, b1.id], [a1.id, a2.id, a3.id, b1.id]]) {
      expect(store.reorderTasks(a.id, ids)).toBe("mismatch");
    }
    expect(store.listGroups()[0].tasks.map((t) => t.title)).toEqual(["a1", "a2", "a3"]);
  });

  it("없는 묶음이면 'no-group'", () => {
    const { store } = twoGroups();
    expect(store.reorderTasks("nope", [])).toBe("no-group");
  });

  it("새 작업은 정해 둔 순서의 맨 뒤에 붙는다", () => {
    const { store, a, a1, a2, a3 } = twoGroups();
    store.reorderTasks(a.id, [a3.id, a1.id, a2.id]);

    makeTask(store, a.id, "a4");

    expect(store.listGroups()[0].tasks.map((t) => t.title)).toEqual(["a3", "a1", "a2", "a4"]);
  });
});
