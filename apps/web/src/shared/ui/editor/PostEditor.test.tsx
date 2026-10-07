import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";

type ProseMirrorEl = HTMLElement & {
  editor: {
    commands: { insertContent: (c: string) => void; setTextSelection: (p: number | { from: number; to: number }) => void };
    view: { someProp: (name: string, f: (handler: unknown) => unknown) => unknown };
  };
};

async function findEditorEl(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  return container.querySelector(".ProseMirror") as ProseMirrorEl;
}

beforeAll(() => {
  // jsdom엔 레이아웃이 없어서, focus()가 부르는 ProseMirror의 scrollIntoView(커서 좌표 계산)가 터진다
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
});

describe("PostEditor", () => {
  it("바깥에서 내려준 content를 불러올 때는 호출되지 않는다", async () => {
    const onUserEdit = vi.fn();
    const { container, rerender } = render(
      <PostEditor content="" onChange={vi.fn()} onUserEdit={onUserEdit} />,
    );
    await findEditorEl(container);

    rerender(<PostEditor content="<p>불러온 글</p>" onChange={vi.fn()} onUserEdit={onUserEdit} />);
    await waitFor(() => expect(container.textContent).toContain("불러온 글"));

    expect(onUserEdit).not.toHaveBeenCalled();
  });

  it("사용자가 직접 내용을 입력하면 호출된다 (포커스 여부와 무관)", async () => {
    const onUserEdit = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <PostEditor content="<p>기존</p>" onChange={onChange} onUserEdit={onUserEdit} />,
    );
    const el = await findEditorEl(container);

    act(() => {
      el.editor.commands.insertContent("추가 입력");
    });

    expect(onChange).toHaveBeenCalled();
    expect(onUserEdit).toHaveBeenCalled();
  });

  it("URL을 붙여넣으면 링크(a 태그)로 들어간다", async () => {
    const { container } = render(<PostEditor content="" onChange={vi.fn()} />);
    const el = await findEditorEl(container);

    const url = "https://example.com/docs";
    const event = { clipboardData: { getData: (t: string) => (t === "text/plain" ? url : "") } };
    act(() => {
      el.editor.view.someProp("handlePaste", (handler) =>
        (handler as (v: unknown, e: unknown) => boolean)(el.editor.view, event),
      );
    });

    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(url);
    expect(link?.textContent).toBe(url);
  });

  it("# / ## / - 마크다운은 제목·목록 요소로 변환된다", async () => {
    const { container } = render(<PostEditor content="" onChange={vi.fn()} />);
    const el = await findEditorEl(container);

    act(() => {
      el.editor.commands.insertContent("<h1>큰 제목</h1><h2>작은 제목</h2><ul><li>항목</li></ul>");
    });

    expect(el.querySelector("h1")?.textContent).toBe("큰 제목");
    expect(el.querySelector("h2")?.textContent).toBe("작은 제목");
    expect(el.querySelector("ul li")?.textContent).toBe("항목");
  });

  describe("툴바: 커서 위치의 서식 표시", () => {
    // 문서 위치: h1 "제목"(1~3) / p "굵게 보통"(5~...) / ul li "항목" / pre code "코드" / p 링크
    const html =
      "<h1>제목</h1><h2>중제목</h2><h3>소제목</h3><p><strong>굵게</strong> <em>기울임</em> 보통</p>" +
      "<ul><li><p>항목</p></li></ul><pre><code>코드</code></pre>" +
      '<p><a href="https://a.com">링크글자</a></p>';

    async function setup() {
      const { container } = render(<PostEditor content={html} onChange={vi.fn()} />);
      const el = await findEditorEl(container);
      await waitFor(() => expect(el.querySelector("h1")).not.toBeNull());
      const pressed = (name: string) =>
        screen.getByRole("button", { name }).getAttribute("aria-pressed") === "true";
      const findPos = (text: string) => {
        let found = -1;
        (el.editor as unknown as { state: { doc: { descendants: (f: (n: { isText: boolean; text?: string }, p: number) => boolean | void) => void } } }).state.doc.descendants(
          (node, pos) => {
            if (found < 0 && node.isText && node.text?.includes(text)) found = pos + 1;
          },
        );
        return found;
      };
      return { el, pressed, findPos };
    }

    it("커서가 제목/굵은 글자/목록/코드/링크에 있으면 해당 버튼만 표시된다", async () => {
      const { el, pressed, findPos } = await setup();

      act(() => el.editor.commands.setTextSelection(findPos("제목")));
      expect(pressed("H1")).toBe(true);
      expect(pressed("H2")).toBe(false);
      expect(pressed("목록")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("중제목")));
      expect(pressed("H2")).toBe(true);
      expect(pressed("H1")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("소제목")));
      expect(pressed("H3")).toBe(true);
      expect(pressed("H2")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("굵게")));
      expect(pressed("B")).toBe(true);
      expect(pressed("I")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("기울임")));
      expect(pressed("I")).toBe(true);
      expect(pressed("B")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("항목")));
      expect(pressed("목록")).toBe(true);

      act(() => el.editor.commands.setTextSelection(findPos("코드")));
      expect(pressed("코드 블록")).toBe(true);
      expect(pressed("목록")).toBe(false);

      act(() => el.editor.commands.setTextSelection(findPos("링크글자")));
      expect(pressed("링크")).toBe(true);
      expect(pressed("코드 블록")).toBe(false);
    });

    it("서식이 여러 개 겹친 자리(굵은 링크, 굵은 목록 항목, 굵은 제목)에서는 아무 버튼도 표시하지 않는다", async () => {
      const { container } = render(
        <PostEditor
          content={
            '<p><a href="https://a.com"><strong>굵은링크</strong></a></p>' +
            "<ul><li><p><strong>굵은항목</strong></p></li></ul>" +
            "<h1><em>기울인제목</em></h1><p><strong>굵기만</strong></p>"
          }
          onChange={vi.fn()}
        />,
      );
      const el = await findEditorEl(container);
      await waitFor(() => expect(el.querySelector("a")).not.toBeNull());
      const names = ["H1", "H2", "H3", "B", "I", "목록", "링크", "코드 블록", "인라인 코드"];
      const pressedNames = () =>
        names.filter((n) => screen.getByRole("button", { name: n }).getAttribute("aria-pressed") === "true");
      const pos = (text: string) => {
        let found = -1;
        (el.editor as unknown as { state: { doc: { descendants: (f: (n: { isText: boolean; text?: string }, p: number) => boolean | void) => void } } }).state.doc.descendants(
          (node, p) => {
            if (found < 0 && node.isText && node.text?.includes(text)) found = p + 1;
          },
        );
        return found;
      };
      for (const text of ["굵은링크", "굵은항목", "기울인제목"]) {
        act(() => el.editor.commands.setTextSelection(pos(text)));
        expect(pressedNames()).toEqual([]);
      }

      // 서식이 하나뿐이면 여전히 표시된다
      act(() => el.editor.commands.setTextSelection(pos("굵기만")));
      expect(pressedNames()).toEqual(["B"]);
    });

    it("일반 문단으로 커서를 옮기면 모든 표시가 꺼진다", async () => {
      const { el, pressed, findPos } = await setup();

      act(() => el.editor.commands.setTextSelection(findPos("제목")));
      expect(pressed("H1")).toBe(true);

      act(() => el.editor.commands.setTextSelection(findPos("보통")));
      for (const name of ["H1", "H2", "H3", "B", "I", "목록", "링크", "코드 블록", "인라인 코드"]) {
        expect(pressed(name)).toBe(false);
      }
    });
  });

  it("H4 버튼으로 현재 문단을 가장 작은 제목(h4)으로 바꾸고, 다시 누르면 문단으로 되돌린다", async () => {
    const user = userEvent.setup();
    const { container } = render(<PostEditor content="<p>작은 제목 후보</p>" onChange={vi.fn()} />);
    const el = await findEditorEl(container);
    act(() => el.editor.commands.setTextSelection(2));

    await user.click(screen.getByRole("button", { name: "H4" }));
    expect(el.querySelector("h4")?.textContent).toBe("작은 제목 후보");
    expect(screen.getByRole("button", { name: "H4" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "H3" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "H4" }));
    expect(el.querySelector("h4")).toBeNull();
    expect(el.querySelector("p")?.textContent).toBe("작은 제목 후보");
  });

  it("H3 버튼으로 현재 문단을 소제목(h3)으로 바꾸고, 다시 누르면 문단으로 되돌린다", async () => {
    const user = userEvent.setup();
    const { container } = render(<PostEditor content="<p>소제목 후보</p>" onChange={vi.fn()} />);
    const el = await findEditorEl(container);
    act(() => el.editor.commands.setTextSelection(2));

    await user.click(screen.getByRole("button", { name: "H3" }));
    expect(el.querySelector("h3")?.textContent).toBe("소제목 후보");

    await user.click(screen.getByRole("button", { name: "H3" }));
    expect(el.querySelector("h3")).toBeNull();
    expect(el.querySelector("p")?.textContent).toBe("소제목 후보");
  });
});
