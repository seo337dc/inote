import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import { canMove, evaluateDrop, moveCategory, resolveDrop } from "./move";

const cat = (id: string, parentId: string | null, depth: number, position: number): Category => ({
  id,
  userId: "u",
  name: id,
  parentId,
  depth,
  position,
  createdAt: `2026-01-0${position + 1}`,
  updatedAt: "",
});

// A(0) ─ A1(0) ─ A11(0)
//      └ A2(1)
// B(1)
// C(2)
const LIST: Category[] = [
  cat("A", null, 1, 0),
  cat("A1", "A", 2, 0),
  cat("A11", "A1", 3, 0),
  cat("A2", "A", 2, 1),
  cat("B", null, 1, 1),
  cat("C", null, 1, 2),
];

const info = (list: Category[], id: string) => {
  const c = list.find((x) => x.id === id)!;
  return { parentId: c.parentId, depth: c.depth, position: c.position };
};

describe("canMove", () => {
  it("자기 자신이나 자기 하위 밑으로는 옮길 수 없다", () => {
    expect(canMove(LIST, "A", "A")).toBe(false);
    expect(canMove(LIST, "A", "A1")).toBe(false);
    expect(canMove(LIST, "A", "A11")).toBe(false);
  });

  it("하위가 딸려 있으면 옮긴 뒤 3단계를 넘는 자리로는 옮길 수 없다", () => {
    // A는 A11(3단계)까지 2단계 아래가 있다 → 2단계 자리(B 밑)에 두면 A11이 4단계가 된다
    expect(canMove(LIST, "A", "B")).toBe(false);
    // B는 하위가 없어서 A1 밑(3단계)까지는 괜찮다
    expect(canMove(LIST, "B", "A1")).toBe(true);
  });

  it("3단계 카테고리 밑으로는 넣을 수 없고, 최상위(null)로는 언제나 옮길 수 있다", () => {
    expect(canMove(LIST, "B", "A11")).toBe(false);
    expect(canMove(LIST, "A11", null)).toBe(true);
    expect(canMove(LIST, "A", null)).toBe(true);
  });

  it("없는 카테고리는 옮길 수 없다", () => {
    expect(canMove(LIST, "nope", null)).toBe(false);
  });
});

describe("moveCategory", () => {
  it("같은 부모 안에서 순서를 바꾸고 형제들의 position을 0부터 다시 매긴다", () => {
    const next = moveCategory(LIST, "C", { parentId: null, index: 0 })!;

    expect(info(next, "C").position).toBe(0);
    expect(info(next, "A").position).toBe(1);
    expect(info(next, "B").position).toBe(2);
  });

  it("같은 부모 안에서 뒤로 옮길 때 index는 자기 자신을 뺀 목록 기준이다", () => {
    const next = moveCategory(LIST, "A", { parentId: null, index: 2 })!;

    expect(next.filter((c) => c.parentId === null).sort((a, b) => a.position - b.position).map((c) => c.id)).toEqual(["B", "C", "A"]);
  });

  it("다른 부모로 옮기면 새 부모·깊이가 바뀌고, 원래 자리의 빈틈이 메워진다", () => {
    const next = moveCategory(LIST, "B", { parentId: "A", index: 1 })!;

    expect(info(next, "B")).toEqual({ parentId: "A", depth: 2, position: 1 });
    expect(info(next, "A2").position).toBe(2); // B가 끼어들어 한 칸 밀림
    expect(info(next, "C").position).toBe(1); // B가 빠져 앞으로 당겨짐
  });

  it("하위가 딸린 카테고리를 옮기면 하위 깊이도 함께 바뀐다", () => {
    const next = moveCategory(LIST, "A1", { parentId: null, index: 1 })!;

    expect(info(next, "A1").depth).toBe(1);
    expect(info(next, "A11").depth).toBe(2);
  });

  it("규칙에 어긋나면 null을 돌려주고 원본은 바꾸지 않는다", () => {
    const snapshot = JSON.stringify(LIST);

    expect(moveCategory(LIST, "A", { parentId: "A1", index: 0 })).toBeNull();
    expect(JSON.stringify(LIST)).toBe(snapshot);
  });

  it("index가 범위를 벗어나면 맨 앞/맨 뒤로 맞춘다", () => {
    const next = moveCategory(LIST, "B", { parentId: null, index: 99 })!;

    expect(info(next, "B").position).toBe(2);
  });
});

describe("resolveDrop", () => {
  it("행의 앞/뒤에 놓으면 그 행의 부모 아래 해당 위치가 된다", () => {
    expect(resolveDrop(LIST, "C", "B", "before")).toEqual({ parentId: null, index: 1 });
    expect(resolveDrop(LIST, "C", "B", "after")).toEqual({ parentId: null, index: 2 });
  });

  it("행 안에 놓으면 그 카테고리의 마지막 자식이 된다", () => {
    expect(resolveDrop(LIST, "C", "A", "inside")).toEqual({ parentId: "A", index: 2 });
  });

  it("같은 부모에서 앞에 있던 것을 뒤로 끌면 자기 자신을 뺀 위치로 계산한다", () => {
    // A를 C 뒤에 → 자기 자신(A)을 뺀 [B, C]에서 C 다음 = index 2
    expect(resolveDrop(LIST, "A", "C", "after")).toEqual({ parentId: null, index: 2 });
  });

  it("자기 자신 위에 놓으면 목표가 없다", () => {
    expect(resolveDrop(LIST, "A", "A", "inside")).toBeNull();
  });
});

describe("evaluateDrop", () => {
  it("놓을 수 있는 자리면 목표를 돌려준다", () => {
    expect(evaluateDrop(LIST, "C", "A", "before")).toEqual({
      valid: true,
      target: { parentId: null, index: 0 },
    });
  });

  it("규칙에 어긋나는 자리(자기 하위 안, 3단계 초과)는 놓을 수 없다", () => {
    expect(evaluateDrop(LIST, "A", "A1", "inside")).toEqual({ valid: false });
    expect(evaluateDrop(LIST, "B", "A11", "inside")).toEqual({ valid: false });
  });

  it("제자리에 놓는 것(변화 없음)도 놓을 수 없는 자리로 본다", () => {
    // B를 바로 뒤(C 앞)로: B는 이미 A 다음, C 앞
    expect(evaluateDrop(LIST, "B", "C", "before")).toEqual({ valid: false });
  });
});
