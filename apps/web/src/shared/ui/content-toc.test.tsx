import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentToc } from "./content-toc";
import type { TocItem } from "@/shared/lib/toc";

const items: TocItem[] = [
  { id: "intro", text: "소개", level: 1 },
  { id: "usage", text: "사용법", level: 2 },
  { id: "detail", text: "세부 옵션", level: 3 },
];

// 이 앱은 window가 아니라 <main>이 스크롤되므로, 제목들을 main 안에 넣고 각 제목의 위치(top)를 직접 지정한다
function mountArticle(tops: Record<string, number>) {
  const main = document.createElement("main");
  main.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  for (const item of items) {
    const h = document.createElement("h2");
    h.id = item.id;
    h.getBoundingClientRect = () => ({ top: tops[item.id] }) as DOMRect;
    h.scrollIntoView = vi.fn();
    main.appendChild(h);
  }
  document.body.appendChild(main);
  return main;
}

const link = (name: string) => screen.getByRole("link", { name });

describe("ContentToc", () => {
  let main: HTMLElement;
  let tops: Record<string, number>;

  beforeEach(() => {
    tops = { intro: 0, usage: 600, detail: 1200 };
    main = mountArticle(tops);
  });

  afterEach(() => {
    main.remove();
    window.history.replaceState(null, "", "/");
  });

  it("h1~h3 항목을 순서대로 보여주고 각 항목은 #id 링크다", () => {
    render(<ContentToc items={items} />);

    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["소개", "사용법", "세부 옵션"]);
    expect(link("사용법").getAttribute("href")).toBe("#usage");
  });

  it("처음에는 맨 위에 걸린 제목이 강조된다", () => {
    render(<ContentToc items={items} />);

    expect(link("소개")).toHaveAttribute("aria-current", "location");
    expect(link("사용법")).not.toHaveAttribute("aria-current");
  });

  it("항목을 누르면 그 제목으로 스크롤하고 주소에 #id가 붙고 강조가 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<ContentToc items={items} />);

    await user.click(link("세부 옵션"));

    expect(document.getElementById("detail")!.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(window.location.hash).toBe("#detail");
    expect(link("세부 옵션")).toHaveAttribute("aria-current", "location");
  });

  it("스크롤하면 화면 위쪽에 도달한 제목으로 강조가 따라간다", () => {
    render(<ContentToc items={items} />);

    tops.usage = 80; // '사용법'이 위쪽 기준선 안으로 들어옴
    act(() => {
      main.dispatchEvent(new Event("scroll"));
    });
    expect(link("사용법")).toHaveAttribute("aria-current", "location");
    expect(link("소개")).not.toHaveAttribute("aria-current");

    tops.usage = 600; // 다시 위로 돌아감
    act(() => {
      main.dispatchEvent(new Event("scroll"));
    });
    expect(link("소개")).toHaveAttribute("aria-current", "location");
  });

  describe("클릭 이동과 스크롤 계산의 충돌", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("끝쪽 제목을 눌러 이동해도(화면 맨 위까지 못 올라와도) 눌러둔 항목이 강조로 유지되고, 이동이 끝난 뒤 스크롤하면 위치 기준으로 다시 계산한다", () => {
      vi.useFakeTimers();
      // '세부 옵션'은 글 끝이라 스크롤이 바닥에서 멈춰 기준선(120px) 안으로 못 올라오는 상황
      tops = Object.assign(tops, { intro: -300, usage: -100, detail: 400 });
      render(<ContentToc items={items} />);
      expect(link("사용법")).toHaveAttribute("aria-current", "location"); // 위치 기준 계산

      fireEvent.click(link("세부 옵션"));
      expect(link("세부 옵션")).toHaveAttribute("aria-current", "location");

      // 부드러운 스크롤 중 발생하는 스크롤 이벤트가 강조를 앞 제목('사용법')으로 되돌리면 안 된다
      act(() => {
        main.dispatchEvent(new Event("scroll"));
      });
      expect(link("세부 옵션")).toHaveAttribute("aria-current", "location");
      expect(link("사용법")).not.toHaveAttribute("aria-current");

      // 스크롤이 멈추고 잠금이 풀린 뒤에는 다시 위치 기준
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        main.dispatchEvent(new Event("scroll"));
      });
      expect(link("사용법")).toHaveAttribute("aria-current", "location");
    });

    it("스크롤이 맨 아래에 닿으면 마지막 제목을 현재 위치로 본다", () => {
      tops = Object.assign(tops, { intro: -900, usage: -300, detail: 500 });
      Object.defineProperty(main, "scrollTop", { value: 800, configurable: true });
      Object.defineProperty(main, "clientHeight", { value: 400, configurable: true });
      Object.defineProperty(main, "scrollHeight", { value: 1200, configurable: true });
      render(<ContentToc items={items} />);

      expect(link("세부 옵션")).toHaveAttribute("aria-current", "location");
    });
  });
});
