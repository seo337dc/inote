import { describe, expect, it } from "vitest";
import { initialPanelRect } from "./floating-rect";

const min = { width: 240, height: 160 };

describe("initialPanelRect", () => {
  it("화면 오른쪽 아래에 여백을 두고 붙인다", () => {
    expect(
      initialPanelRect({ width: 1200, height: 800 }, { width: 320, height: 360 }, { min }),
    ).toEqual({ x: 1200 - 320 - 16, y: 800 - 360 - 16, width: 320, height: 360 });
  });

  it("bottomInset을 주면 아래쪽만 그만큼 더 띄운다", () => {
    const r = initialPanelRect(
      { width: 1200, height: 800 },
      { width: 320, height: 360 },
      { min, bottomInset: 64 },
    );
    expect(r.y).toBe(800 - 360 - 64);
    expect(r.x).toBe(1200 - 320 - 16);
  });

  it("anchor를 주면 그 요소의 오른쪽 끝에 맞춰 바로 위에 띄운다", () => {
    const r = initialPanelRect(
      { width: 1600, height: 900 },
      { width: 320, height: 360 },
      { min, anchor: { right: 1000, top: 850 } },
    );
    expect(r.x).toBe(1000 - 320);
    expect(r.y).toBe(850 - 360 - 8);
  });

  it("anchor가 화면 오른쪽 가장자리에 붙어 있으면 패널이 화면 밖으로 나가지 않는다", () => {
    const r = initialPanelRect(
      { width: 1000, height: 900 },
      { width: 320, height: 360 },
      { min, anchor: { right: 1000, top: 850 } },
    );
    expect(r.x).toBe(1000 - 320 - 16);
  });

  it("anchor 위쪽 공간이 부족하면 y를 0으로 보정한다", () => {
    const r = initialPanelRect(
      { width: 1200, height: 800 },
      { width: 320, height: 360 },
      { min, anchor: { right: 800, top: 100 } },
    );
    expect(r.y).toBe(0);
  });

  it("요청 크기가 화면보다 크면 화면 - 여백으로 줄인다", () => {
    const r = initialPanelRect({ width: 300, height: 400 }, { width: 500, height: 900 }, { min });
    expect(r.width).toBe(300 - 32);
    expect(r.height).toBe(400 - 32);
  });

  it("화면이 min보다 작아도 min 아래로 줄이지 않고 y는 음수가 되지 않는다", () => {
    const r = initialPanelRect({ width: 200, height: 100 }, { width: 320, height: 360 }, { min });
    expect(r.width).toBe(240);
    expect(r.height).toBe(160);
    expect(r.y).toBe(0);
    expect(r.x).toBe(0);
  });
});

describe("initialPanelRect — centered", () => {
  const min = { width: 240, height: 160 };

  it("centered면 화면 가운데에 놓는다 (큰 메모장)", () => {
    expect(initialPanelRect({ width: 1200, height: 800 }, { width: 640, height: 520 }, { min, centered: true })).toEqual({
      x: (1200 - 640) / 2,
      y: (800 - 520) / 2,
      width: 640,
      height: 520,
    });
  });

  it("요청 크기가 화면보다 크면 (화면 - 여백)으로 줄이고 가운데에 맞춘다", () => {
    const r = initialPanelRect({ width: 500, height: 400 }, { width: 640, height: 520 }, { min, centered: true });
    expect(r.width).toBe(500 - 32);
    expect(r.height).toBe(400 - 32);
    expect(r.x).toBe(16);
    expect(r.y).toBe(16);
  });

  it("centered가 anchor보다 우선한다", () => {
    const r = initialPanelRect({ width: 1200, height: 800 }, { width: 640, height: 520 }, { min, centered: true, anchor: { right: 1000, top: 700 } });
    expect(r.x).toBe((1200 - 640) / 2);
  });
});
