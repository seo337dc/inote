import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";

type Ed = {
  getHTML: () => string;
  state: { doc: { descendants: (f: (n: { isText: boolean; text?: string }, p: number) => boolean | void) => void } };
  commands: { setTextSelection: (p: number | { from: number; to: number }) => void };
};
type El = HTMLElement & { editor: Ed };

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
});

async function setup(initial: string) {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content={initial} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  // 텍스트가 들어 있는 위치(문서 좌표)를 찾아 그 안쪽에 커서를 둔다
  const cursorIn = (text: string) => {
    let found = -1;
    el.editor.state.doc.descendants((node, pos) => {
      if (found < 0 && node.isText && node.text?.includes(text)) found = pos + 1;
    });
    act(() => el.editor.commands.setTextSelection(found));
  };
  const html = () => el.editor.getHTML().replace(/<p><\/p>$/, "");
  const click = (name: string) => user.click(screen.getByRole("button", { name }));
  return { el, cursorIn, click, html };
}

describe("제목 버튼은 누른 줄에만 적용된다 (줄바꿈으로 이어진 문단)", () => {
  const paragraph = "<p>계획<br>각 회사 채용 정보<br>다음 줄</p>";

  it("첫 줄에서 H2를 누르면 첫 줄만 제목이 되고 나머지 줄은 문단으로 남는다", async () => {
    const { cursorIn, click, html } = await setup(paragraph);
    cursorIn("계획");

    await click("H2");

    expect(html()).toBe("<h2>계획</h2><p>각 회사 채용 정보<br>다음 줄</p>");
  });

  it("가운데 줄에서 누르면 그 줄만 제목이 되고 앞뒤 줄은 각자 문단이 된다", async () => {
    const { cursorIn, click, html } = await setup(paragraph);
    cursorIn("각 회사");

    await click("H3");

    expect(html()).toBe("<p>계획</p><h3>각 회사 채용 정보</h3><p>다음 줄</p>");
  });

  it("마지막 줄에서 누르면 마지막 줄만 제목이 된다", async () => {
    const { cursorIn, click, html } = await setup(paragraph);
    cursorIn("다음 줄");

    await click("H1");

    expect(html()).toBe("<p>계획<br>각 회사 채용 정보</p><h1>다음 줄</h1>");
  });

  it("이미 여러 줄이 통째로 제목이 된 블록에서 같은 제목 버튼을 누르면 그 줄만 문단으로 돌아간다", async () => {
    const { cursorIn, click, html } = await setup("<h2>계획<br>각 회사 채용 정보</h2>");
    cursorIn("각 회사");

    await click("H2");

    expect(html()).toBe("<h2>계획</h2><p>각 회사 채용 정보</p>");
  });

  it("줄바꿈이 연속된(빈 줄) 경우에도 경계의 빈 줄바꿈은 정리하고 블록으로 나눈다", async () => {
    const { cursorIn, click, html } = await setup("<p>기업리스트<br><br>보살핌 링크</p>");
    cursorIn("기업리스트");

    await click("H3");

    expect(html()).toBe("<h3>기업리스트</h3><p>보살핌 링크</p>");
  });

  it("줄바꿈이 없는 문단은 기존처럼 블록 전체가 제목이 되고, 다시 누르면 문단으로 돌아간다", async () => {
    const { cursorIn, click, html } = await setup("<p>한 줄짜리</p>");
    cursorIn("한 줄짜리");

    await click("H2");
    expect(html()).toBe("<h2>한 줄짜리</h2>");

    await click("H2");
    expect(html()).toBe("<p>한 줄짜리</p>");
  });

  it("여러 줄을 모두 걸쳐 선택하면 블록 전체가 제목이 된다", async () => {
    const { el, click, html } = await setup("<p>가<br>나</p>");
    act(() => el.editor.commands.setTextSelection({ from: 1, to: 4 }));

    await click("H2");

    expect(html()).toBe("<h2>가<br>나</h2>");
  });

  it("제목으로 바꾼 뒤에도 커서는 그 줄 안에 있고 H2 버튼이 켜진다", async () => {
    const { cursorIn, click, html } = await setup(paragraph);
    cursorIn("각 회사");

    await click("H2");

    expect(screen.getByRole("button", { name: "H2" })).toHaveAttribute("aria-pressed", "true");
    expect(html()).toContain("<h2>각 회사 채용 정보</h2>");
  });
});

describe("인용 버튼", () => {
  it("문단에서 누르면 인용구가 되고, 다시 누르면 풀린다", async () => {
    const { cursorIn, click, html } = await setup("<p>본문 글</p>");
    cursorIn("본문 글");

    await click("인용");
    expect(html()).toBe("<blockquote><p>본문 글</p></blockquote>");
    expect(screen.getByRole("button", { name: "인용" })).toHaveAttribute("aria-pressed", "true");

    await click("인용");
    expect(html()).toBe("<p>본문 글</p>");
  });

  it("두 겹 인용구에서는 누를 때마다 한 겹씩 풀린다", async () => {
    const { cursorIn, click, html } = await setup(
      "<blockquote><blockquote><p>겹친 글</p></blockquote></blockquote>",
    );
    cursorIn("겹친 글");

    await click("인용");

    expect(html()).toBe("<blockquote><p>겹친 글</p></blockquote>");
  });
});
