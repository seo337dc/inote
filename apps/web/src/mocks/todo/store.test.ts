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
