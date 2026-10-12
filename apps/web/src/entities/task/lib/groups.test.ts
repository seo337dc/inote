import { describe, expect, it } from "vitest";
import type { Task, TaskGroup } from "../model/types";
import {
  addGroup,
  addTask,
  countTasksDone,
  isOverdue,
  isScheduledOn,
  moveId,
  removeGroup,
  removeTask,
  reorderTasks,
  tasksDueOn,
  updateGroup,
  updateTask,
} from "./groups";

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  groupId: "g1",
  title: `작업 ${id}`,
  status: "TODO",
  startDate: null,
  endDate: null,
  starred: false,
  ...overrides,
});
const group = (id: string, tasks: Task[] = [], name = `묶음 ${id}`, starred = false): TaskGroup => ({
  id,
  name,
  starred,
  tasks,
});

describe("묶음 캐시 변경", () => {
  it("addGroup: 맨 뒤에 붙이고 원본은 그대로 둔다", () => {
    const original = [group("g1")];
    expect(addGroup(original, group("g2")).map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(original).toHaveLength(1);
  });

  it("updateGroup: 이름 변경과 별 토글은 그 묶음에만 적용된다", () => {
    const next = updateGroup([group("g1"), group("g2")], { id: "g2", name: "새 이름", starred: true });
    expect(next.map((g) => [g.name, g.starred])).toEqual([
      ["묶음 g1", false],
      ["새 이름", true],
    ]);
  });

  it("updateGroup: 별만 바꾸면 이름은 그대로다", () => {
    expect(updateGroup([group("g1", [], "사이드")], { id: "g1", starred: true })[0].name).toBe("사이드");
  });

  it("removeGroup: 묶음을 지우면 안의 작업도 함께 사라진다", () => {
    const next = removeGroup([group("g1", [task("a")]), group("g2", [task("b", { groupId: "g2" })])], "g1");
    expect(next.map((g) => g.id)).toEqual(["g2"]);
    expect(next.flatMap((g) => g.tasks).map((t) => t.id)).toEqual(["b"]);
  });
});

describe("작업 캐시 변경", () => {
  it("addTask: 그 묶음 맨 뒤에 붙인다", () => {
    const next = addTask([group("g1", [task("a")]), group("g2")], task("b", { groupId: "g2" }));
    expect(next[0].tasks.map((t) => t.id)).toEqual(["a"]);
    expect(next[1].tasks.map((t) => t.id)).toEqual(["b"]);
  });

  it("updateTask: 상태·이름·일정·별을 그 작업에만 바꾼다 (묶음이 달라도 id로 찾는다)", () => {
    const groups = [group("g1", [task("a")]), group("g2", [task("b", { groupId: "g2" })])];
    const next = updateTask(groups, {
      id: "b",
      status: "DONE",
      title: "새 제목",
      startDate: "2026-10-20",
      endDate: "2026-10-25",
      starred: true,
    });

    expect(next[1].tasks[0]).toMatchObject({
      status: "DONE",
      title: "새 제목",
      startDate: "2026-10-20",
      endDate: "2026-10-25",
      starred: true,
    });
    expect(next[0].tasks[0]).toMatchObject({ status: "TODO", starred: false });
  });

  it("updateTask: 날짜를 null로 보내면 일정을 없앤다", () => {
    const next = updateTask([group("g1", [task("a", { startDate: "2026-10-20", endDate: "2026-10-25" })])], {
      id: "a",
      startDate: null,
      endDate: null,
    });
    expect(next[0].tasks[0]).toMatchObject({ startDate: null, endDate: null });
  });

  it("removeTask: 그 작업만 지운다", () => {
    const next = removeTask([group("g1", [task("a"), task("b")])], "a");
    expect(next[0].tasks.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("reorderTasks (묶음 안 순서 변경)", () => {
  const groups = [group("g1", [task("a"), task("b"), task("c")]), group("g2", [task("x", { groupId: "g2" })])];

  it("주어진 id 순서대로 그 묶음의 작업을 다시 나열하고 다른 묶음은 건드리지 않는다", () => {
    const next = reorderTasks(groups, "g1", ["c", "a", "b"]);
    expect(next[0].tasks.map((t) => t.id)).toEqual(["c", "a", "b"]);
    expect(next[1].tasks.map((t) => t.id)).toEqual(["x"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["a", "b", "c"]); // 원본은 그대로
  });

  it("id가 모자라거나 남거나 겹치거나 다른 묶음 것이면 그대로 둔다", () => {
    for (const ids of [["a", "b"], ["a", "b", "c", "x"], ["a", "a", "b"], ["a", "b", "x"]]) {
      expect(reorderTasks(groups, "g1", ids)[0].tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
    }
  });
});

describe("moveId (드래그 결과 순서)", () => {
  it("끌던 것을 놓은 자리로 옮긴다 (아래로·위로)", () => {
    expect(moveId(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveId(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("같은 자리에 놓거나 모르는 id면 null (바꿀 게 없음)", () => {
    expect(moveId(["a", "b"], "a", "a")).toBeNull();
    expect(moveId(["a", "b"], "a", "zzz")).toBeNull();
    expect(moveId(["a", "b"], "zzz", "a")).toBeNull();
  });
});

describe("isScheduledOn (그날이 일정에 드는지)", () => {
  const TODAY = "2026-10-12";

  it("일정이 없으면 어느 날도 아니다", () => {
    expect(isScheduledOn(task("a"), TODAY)).toBe(false);
  });

  it("시작일만 있으면 시작일 당일에만 든다(그 뒤로 이어지지 않는다)", () => {
    const t = task("a", { startDate: "2026-10-12" });
    expect(isScheduledOn(t, "2026-10-12")).toBe(true);
    expect(isScheduledOn(t, "2026-10-13")).toBe(false);
    expect(isScheduledOn(t, "2026-10-11")).toBe(false);
  });

  it("시작~종료 기간이면 양 끝을 포함해 그 기간의 매일 든다", () => {
    const t = task("a", { startDate: "2026-10-10", endDate: "2026-10-14" });
    expect(["2026-10-09", "2026-10-10", "2026-10-12", "2026-10-14", "2026-10-15"].map((d) => isScheduledOn(t, d))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it("시작일과 종료일이 같으면 그날 하루다", () => {
    const t = task("a", { startDate: "2026-10-12", endDate: "2026-10-12" });
    expect(isScheduledOn(t, "2026-10-12")).toBe(true);
    expect(isScheduledOn(t, "2026-10-13")).toBe(false);
  });
});

describe("tasksDueOn (오늘 일정)", () => {
  it("묶음과 상관없이 일정에 그날이 드는 작업을 모으고 묶음 이름을 붙인다 (완료된 것도 포함)", () => {
    const groups = [
      group(
        "g1",
        [
          task("a", { startDate: "2026-10-12" }),
          task("b", { startDate: "2026-10-13" }),
          task("p", { startDate: "2026-10-10", endDate: "2026-10-15" }),
        ],
        "사이드",
      ),
      group("g2", [task("c", { groupId: "g2", startDate: "2026-10-12", status: "DONE" })], "이직"),
    ];
    expect(tasksDueOn(groups, "2026-10-12").map((t) => [t.id, t.groupName])).toEqual([
      ["a", "사이드"],
      ["p", "사이드"],
      ["c", "이직"],
    ]);
  });

  it("일정이 없거나 그날이 아닌 작업만 있으면 빈 배열", () => {
    expect(tasksDueOn([group("g1", [task("a"), task("b", { startDate: "2026-10-13" })])], "2026-10-12")).toEqual([]);
  });
});

describe("countTasksDone / isOverdue", () => {
  it("완료 개수와 전체 개수를 센다", () => {
    expect(countTasksDone([task("a", { status: "DONE" }), task("b"), task("c", { status: "IN_PROGRESS" })])).toEqual({
      done: 1,
      total: 3,
    });
  });

  it("지남 판정은 종료일(없으면 시작일)이 오늘보다 이전이고 안 끝난 작업만이다", () => {
    const today = "2026-10-12";
    expect(isOverdue(task("a", { startDate: "2026-10-11" }), today)).toBe(true); // 시작일만 — 시작일이 기준
    expect(isOverdue(task("a", { startDate: "2026-10-12" }), today)).toBe(false);
    expect(isOverdue(task("a", { startDate: "2026-10-01", endDate: "2026-10-20" }), today)).toBe(false); // 기간 진행 중
    expect(isOverdue(task("a", { startDate: "2026-10-01", endDate: "2026-10-11" }), today)).toBe(true); // 종료일이 지남
    expect(isOverdue(task("a", { startDate: "2026-10-01", status: "DONE" }), today)).toBe(false);
    expect(isOverdue(task("a"), today)).toBe(false);
  });
});
