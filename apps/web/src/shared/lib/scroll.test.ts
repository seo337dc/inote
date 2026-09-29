import { describe, expect, it } from "vitest";
import { revealInContainer } from "./scroll";

function box(top: number, bottom: number) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
  return el;
}

describe("revealInContainer", () => {
  it("이미 보이는 요소면 스크롤하지 않는다", () => {
    const container = box(100, 400);
    container.scrollTop = 50;

    revealInContainer(container, box(200, 220));

    expect(container.scrollTop).toBe(50);
  });

  it("아래로 벗어난 요소는 아래쪽 여백을 두고 보이는 만큼만 내려간다", () => {
    const container = box(100, 400);
    container.scrollTop = 0;

    revealInContainer(container, box(390, 420), 8);

    expect(container.scrollTop).toBe(28); // 420 - (400 - 8)
  });

  it("위로 벗어난 요소는 위쪽 여백을 두고 보이는 만큼만 올라간다", () => {
    const container = box(100, 400);
    container.scrollTop = 100;

    revealInContainer(container, box(60, 80), 8);

    expect(container.scrollTop).toBe(52); // 100 - (100 + 8 - 60)
  });
});
