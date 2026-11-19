import { afterEach, describe, expect, it } from "vitest";
import { hasOpenModalLayer } from "./modal-layer";

function add(html: string) {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe("hasOpenModalLayer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("아무 것도 열려 있지 않으면 false", () => {
    expect(hasOpenModalLayer()).toBe(false);
  });

  it("열려 있는 시트(왼쪽 메뉴·글 설정 등)가 있으면 true", () => {
    add('<div data-slot="sheet-content"></div>');
    expect(hasOpenModalLayer()).toBe(true);
  });

  it("열려 있는 대화상자(Dialog)가 있으면 true", () => {
    add('<div data-slot="dialog-content"></div>');
    expect(hasOpenModalLayer()).toBe(true);
  });

  it("닫히는 애니메이션 중인 시트·대화상자는 이미 닫힌 것으로 본다", () => {
    add('<div data-slot="sheet-content" data-ending-style=""></div>');
    add('<div data-slot="dialog-content" data-ending-style=""></div>');
    expect(hasOpenModalLayer()).toBe(false);
  });

  it("aria-modal 화면(출간 설정 화면 등)은 열려 있을 때만 true — aria-hidden이면 닫힌 것", () => {
    const el = add('<div role="dialog" aria-modal="true" aria-hidden="true"></div>');
    expect(hasOpenModalLayer()).toBe(false);

    el.firstElementChild!.setAttribute("aria-hidden", "false");
    expect(hasOpenModalLayer()).toBe(true);
  });

  it("aria-modal이 없는 일반 dialog(메모 패널 같은 떠 있는 창)는 모달로 보지 않는다", () => {
    add('<div role="dialog" aria-label="메모"></div>');
    expect(hasOpenModalLayer()).toBe(false);
  });
});
