import { describe, expect, it } from "vitest";
import { placeTableToolbar } from "./TableToolbar";

// 툴바 높이 36 + 간격 6 = 42px가 행 위에 있어야 위쪽에 붙는다
const wrapper = { top: 100, bottom: 2000, left: 50 };
const table = { top: 300, bottom: 1500, left: 70 };

describe("placeTableToolbar", () => {
  it("긴 표에서도 툴바가 표 맨 위가 아니라 커서가 있는 행 바로 위에 붙는다", () => {
    const row = { top: 900, bottom: 940, left: 70 }; // 표 위에서 한참 아래쪽 행
    const pos = placeTableToolbar({ row, table, wrapper, contentTop: 120 });

    expect(pos.top).toBe(900 - 100 - 36 - 6);
    expect(pos.left).toBe(70 - 50);
  });

  it("행을 옮기면 툴바도 그 행을 따라 간다", () => {
    const a = placeTableToolbar({ row: { top: 500, bottom: 540, left: 70 }, table, wrapper, contentTop: 120 });
    const b = placeTableToolbar({ row: { top: 700, bottom: 740, left: 70 }, table, wrapper, contentTop: 120 });

    expect(b.top - a.top).toBe(200);
  });

  it("행 위쪽에 자리가 모자라면(본문 맨 위) 그 행 아래로 내린다", () => {
    const row = { top: 150, bottom: 190, left: 70 };
    const pos = placeTableToolbar({ row, table, wrapper, contentTop: 130 }); // 위쪽 여유 20px

    expect(pos.top).toBe(190 - 100 + 6);
  });

  it("딱 맞는 여유(42px)면 위쪽에 붙는다", () => {
    const row = { top: 172, bottom: 212, left: 70 };
    const pos = placeTableToolbar({ row, table, wrapper, contentTop: 130 });

    expect(pos.top).toBe(172 - 100 - 36 - 6);
  });

  it("표가 래퍼보다 왼쪽에 있어도 left는 0 아래로 내려가지 않는다", () => {
    const pos = placeTableToolbar({
      row: { top: 900, bottom: 940, left: 10 },
      table: { top: 300, bottom: 1500, left: 10 },
      wrapper,
      contentTop: 120,
    });

    expect(pos.left).toBe(0);
  });
});
