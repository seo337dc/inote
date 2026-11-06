import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";
import { type EditorElement } from "@/test/editor";


const MORE_LABELS = ["목록", "체크박스", "인용", "링크", "인라인 코드", "코드 블록", "표", "콜아웃", "이미지"];

afterEach(() => {
  // @ts-expect-error jsdom 기본값(없음)으로 되돌림
  delete window.matchMedia;
});

// jsdom엔 matchMedia가 없다 — 좁은 화면(sm 미만)을 흉내 낸다
function mockNarrowScreen() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width: 639px"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

async function setup(initial = "<p>본문</p>") {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content={initial} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as EditorElement;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  const cursorInBody = () => {
    let found = -1;
    el.editor.state.doc.descendants((node, pos) => {
      if (found < 0 && node.isText) found = pos + 1;
    });
    act(() => {
      el.editor.commands.setTextSelection(found);
      el.editor.commands.focus();
    });
  };
  return { user, el, cursorInBody };
}

describe("툴바 뒤쪽 버튼 (아이콘)", () => {
  it("넓은 화면: 9개가 모두 아이콘 버튼(이름은 aria-label)으로 툴바에 펼쳐지고 `…`는 없다", async () => {
    await setup();
    for (const name of MORE_LABELS) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("title", name);
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.textContent).toBe("");
    }
    expect(screen.queryByRole("button", { name: "더보기" })).toBeNull();
  });

  it("좁은 화면: 앞쪽 글자 버튼과 `…`만 보이고 나머지 9개는 팝오버가 열릴 때까지 없다", async () => {
    mockNarrowScreen();
    await setup();

    for (const name of ["H1", "H2", "H3", "H4", "B", "I", "취소선"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    const more = screen.getByRole("button", { name: "더보기" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    for (const name of MORE_LABELS) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("좁은 화면: `…`를 누르면 9개 아이콘이 열리고, 항목을 누르면 서식이 적용되며 닫힌다", async () => {
    mockNarrowScreen();
    const { user, el, cursorInBody } = await setup();
    cursorInBody();

    await user.click(screen.getByRole("button", { name: "더보기" }));
    expect(screen.getByRole("button", { name: "더보기" })).toHaveAttribute("aria-expanded", "true");
    for (const name of MORE_LABELS) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "목록" }));

    expect(el.querySelector("ul li")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "목록" })).toBeNull();
    expect(screen.getByRole("button", { name: "더보기" })).toHaveAttribute("aria-expanded", "false");
  });

  it("좁은 화면: Esc나 바깥을 누르면 팝오버가 닫힌다", async () => {
    mockNarrowScreen();
    const { user } = await setup();

    await user.click(screen.getByRole("button", { name: "더보기" }));
    expect(screen.getByRole("button", { name: "목록" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "목록" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "더보기" }));
    expect(screen.getByRole("button", { name: "목록" })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole("button", { name: "목록" })).toBeNull();
  });

  it("좁은 화면: 현재 서식이 켜져 있으면 팝오버 안 해당 아이콘이 눌린 상태(aria-pressed)로 보인다", async () => {
    mockNarrowScreen();
    const { user } = await setup("<ul><li><p>항목</p></li></ul>");
    // 목록 안에 커서를 둔다
    const el = document.querySelector(".ProseMirror") as EditorElement;
    act(() => {
      el.editor.commands.setTextSelection(3);
      el.editor.commands.focus();
    });

    await user.click(screen.getByRole("button", { name: "더보기" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "목록" })).toHaveAttribute("aria-pressed", "true"),
    );
    expect(screen.getByRole("button", { name: "인용" })).toHaveAttribute("aria-pressed", "false");
  });
});
