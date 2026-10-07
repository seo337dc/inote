import { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import SlashCommandMenu, { type SlashCommandMenuRef } from "./SlashCommandMenu";
import type { SlashCommandItem } from "./slash-command";

// 실제 메뉴(항목 10개)처럼 6개를 넘겨서 스크롤이 필요한 길이로 만든다
const ITEMS: SlashCommandItem[] = Array.from({ length: 10 }, (_, i) => ({
  title: `항목 ${i + 1}`,
  description: `설명 ${i + 1}`,
  command: vi.fn(),
}));

// jsdom에는 scrollIntoView가 없어서 어느 요소로 스크롤하려 했는지 기록한다
let scrolled: { el: Element; options: ScrollIntoViewOptions | undefined }[];
const original = Element.prototype.scrollIntoView;

beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
    scrolled.push({ el: this, options: typeof options === "object" ? options : undefined });
  };
  ITEMS.forEach((item) => (item.command as ReturnType<typeof vi.fn>).mockClear());
});

afterEach(() => {
  Element.prototype.scrollIntoView = original;
});

function setup(items: SlashCommandItem[] = ITEMS) {
  const ref = createRef<SlashCommandMenuRef>();
  const command = vi.fn();
  render(<SlashCommandMenu ref={ref} items={items} command={command} />);
  const press = (key: string) =>
    act(() => {
      ref.current!.onKeyDown({ event: new KeyboardEvent("keydown", { key }) } as unknown as SuggestionKeyDownProps);
    });
  const button = (title: string) => screen.getByText(title).closest("button")!;
  return { command, press, button };
}

describe("슬래시 메뉴 목록 크기", () => {
  it("높이를 제한하고 넘치면 스크롤한다 — 항목이 많아도 하단 고정 바·화면 아래로 넘치지 않게", () => {
    const { button } = setup();

    const list = button("항목 1").parentElement!;

    expect(list).toHaveClass("max-h-80", "overflow-y-auto");
  });
});

describe("방향키로 항목을 고를 때", () => {
  it("아래 화살표를 누르면 다음 항목이 선택되고, 그 항목이 보이는 곳까지 스크롤한다", () => {
    const { press, button } = setup();
    scrolled.length = 0;

    press("ArrowDown");

    expect(button("항목 2")).toHaveClass("bg-zinc-100");
    expect(scrolled.at(-1)?.el).toBe(button("항목 2"));
    // 이미 보이는 항목을 괜히 가운데로 끌어오지 않고 필요한 만큼만 움직인다
    expect(scrolled.at(-1)?.options).toEqual({ block: "nearest" });
  });

  it("첫 항목에서 위 화살표를 누르면 맨 마지막 항목으로 돌아가고, 그 항목이 보이게 스크롤한다", () => {
    const { press, button } = setup();
    scrolled.length = 0;

    press("ArrowUp");

    expect(button("항목 10")).toHaveClass("bg-zinc-100");
    expect(scrolled.at(-1)?.el).toBe(button("항목 10"));
  });

  it("마지막 항목에서 아래 화살표를 누르면 첫 항목으로 돌아간다", () => {
    const { press, button } = setup();
    press("ArrowUp"); // 마지막으로 이동

    press("ArrowDown");

    expect(button("항목 1")).toHaveClass("bg-zinc-100");
    expect(scrolled.at(-1)?.el).toBe(button("항목 1"));
  });

  it("Enter를 누르면 선택된 항목으로 명령을 실행한다", () => {
    const { press, command } = setup();
    press("ArrowDown");
    press("ArrowDown");

    press("Enter");

    expect(command).toHaveBeenCalledWith(ITEMS[2]);
  });

  it("처리하지 않는 키는 그대로 에디터에 넘긴다 (false를 돌려준다)", () => {
    const ref = createRef<SlashCommandMenuRef>();
    render(<SlashCommandMenu ref={ref} items={ITEMS} command={vi.fn()} />);

    const handled = ref.current!.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "a" }),
    } as unknown as SuggestionKeyDownProps);

    expect(handled).toBe(false);
  });
});

describe("검색 결과가 없을 때", () => {
  it("안내 문구를 보여주고, 방향키를 눌러도 에러가 나지 않는다", () => {
    const { press } = setup([]);

    expect(screen.getByText("일치하는 명령어가 없습니다")).toBeInTheDocument();
    expect(() => press("ArrowDown")).not.toThrow();
  });
});
