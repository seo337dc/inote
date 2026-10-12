import { describe, expect, it } from "vitest";
import { addRoutine, removeRoutineFromList, renameRoutineInList } from "./routines";

const list = [
  { id: "r1", title: "독서" },
  { id: "r2", title: "운동" },
];

describe("고정 리스트 순수 함수", () => {
  it("추가하면 맨 뒤에 붙고 원본은 그대로다", () => {
    const next = addRoutine(list, { id: "r3", title: "일기" });
    expect(next.map((r) => r.title)).toEqual(["독서", "운동", "일기"]);
    expect(list).toHaveLength(2);
  });

  it("이름을 바꾸면 그 항목만 바뀐다", () => {
    expect(renameRoutineInList(list, "r2", "달리기")).toEqual([
      { id: "r1", title: "독서" },
      { id: "r2", title: "달리기" },
    ]);
  });

  it("삭제하면 그 항목만 빠진다", () => {
    expect(removeRoutineFromList(list, "r1")).toEqual([{ id: "r2", title: "운동" }]);
  });
});
