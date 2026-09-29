import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";

type Ed = {
  getHTML: () => string;
  view: { someProp: (name: string, f: (handler: unknown) => unknown) => unknown };
  commands: { setTextSelection: (p: number | { from: number; to: number }) => void };
};
type El = HTMLElement & { editor: Ed };

beforeAll(() => {
  // jsdom엔 레이아웃이 없어서 ProseMirror의 좌표 계산이 실패한다
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
});

// "앞 링크글자 뒤" — 문서 위치: 앞(1~2), 공백(2~3), 링크글자(3~7), 공백(7~8), 뒤(8~9)
const WITH_LINK = '<p>앞 <a href="https://a.com">링크글자</a> 뒤</p>';

async function setup(html: string) {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content={html} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  const popup = () => screen.queryByRole("dialog", { name: "링크 편집" });
  const input = () => screen.getByRole("textbox", { name: "링크 주소" });
  const select = (range: number | { from: number; to: number }) =>
    act(() => el.editor.commands.setTextSelection(range));
  // 링크에 마우스를 올리면 나오는 편집 아이콘을 눌러 팝업을 연다 (문서의 첫 링크가 대상)
  const openByHover = async () => {
    fireEvent.mouseOver(el.querySelector("a")!);
    await user.click(await screen.findByRole("button", { name: "링크 편집" }));
  };
  return { user, el, popup, input, select, openByHover };
}

describe("링크 편집 아이콘 (마우스 hover)", () => {
  it("링크 글자를 그냥 클릭해도 팝업이 뜨지 않는다 (커서만 옮기는 동작)", async () => {
    const { el, popup } = await setup(WITH_LINK);

    act(() => {
      el.editor.view.someProp("handleClick", (h) =>
        (h as (v: unknown, p: number, e: unknown) => boolean)(
          (el.editor as unknown as { view: unknown }).view,
          5,
          new MouseEvent("click"),
        ),
      );
    });

    expect(popup()).not.toBeInTheDocument();
  });

  it("링크에 마우스를 올리면 편집 아이콘이 나오고, 링크가 아닌 글자에서는 나오지 않는다", async () => {
    const { el } = await setup(WITH_LINK);

    fireEvent.mouseOver(el.querySelector("p")!);
    expect(screen.queryByRole("button", { name: "링크 편집" })).not.toBeInTheDocument();

    fireEvent.mouseOver(el.querySelector("a")!);
    expect(await screen.findByRole("button", { name: "링크 편집" })).toBeInTheDocument();
  });

  it("마우스가 링크를 벗어나면 잠시 뒤 아이콘이 사라진다", async () => {
    const { el } = await setup(WITH_LINK);
    fireEvent.mouseOver(el.querySelector("a")!);
    await screen.findByRole("button", { name: "링크 편집" });

    fireEvent.mouseOut(el.querySelector("a")!);

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "링크 편집" })).not.toBeInTheDocument(),
    );
  });

  it("링크에서 아이콘으로 마우스를 옮기는 사이에는 아이콘이 사라지지 않는다", async () => {
    const { el } = await setup(WITH_LINK);
    fireEvent.mouseOver(el.querySelector("a")!);
    const icon = await screen.findByRole("button", { name: "링크 편집" });

    fireEvent.mouseOut(el.querySelector("a")!);
    fireEvent.mouseEnter(icon);
    await new Promise((r) => setTimeout(r, 300));

    expect(screen.getByRole("button", { name: "링크 편집" })).toBeInTheDocument();
  });
});

describe("링크 주소 팝업: 열기", () => {
  it("편집 아이콘을 누르면 현재 주소가 채워진 팝업이 뜬다", async () => {
    const { popup, input, openByHover } = await setup(WITH_LINK);

    await openByHover();

    expect(popup()).toBeInTheDocument();
    expect(input()).toHaveValue("https://a.com");
    expect(screen.getByRole("link", { name: "새 탭에서 열기" })).toHaveAttribute("href", "https://a.com");
    expect(screen.getByRole("link", { name: "새 탭에서 열기" })).toHaveAttribute("target", "_blank");
  });

  it("툴바 링크 버튼: 링크 옆 글자까지 함께 선택했어도 '고치기' 팝업(링크 해제 버튼 있음)이 뜬다", async () => {
    const { user, popup, select } = await setup(WITH_LINK);

    select({ from: 1, to: 9 });
    await user.click(screen.getByRole("button", { name: "링크" }));

    expect(popup()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 해제" })).toBeInTheDocument();
  });

  it("툴바 링크 버튼: 커서가 링크 글자 끝 경계에 있어도 링크로 본다", async () => {
    const { user, input, select } = await setup(WITH_LINK);

    select(7);
    await user.click(screen.getByRole("button", { name: "링크" }));

    expect(input()).toHaveValue("https://a.com");
  });

  it("툴바 링크 버튼: 링크가 없는 글자를 고르면 빈 주소의 '새 링크' 팝업이 뜬다 (링크 해제 버튼 없음)", async () => {
    const { user, popup, input, select } = await setup(WITH_LINK);

    select({ from: 1, to: 2 }); // "앞"
    await user.click(screen.getByRole("button", { name: "링크" }));

    expect(popup()).toBeInTheDocument();
    expect(input()).toHaveValue("");
    expect(screen.queryByRole("button", { name: "링크 해제" })).not.toBeInTheDocument();
  });
});

describe("링크 주소 팝업: 적용", () => {
  it("새 링크: 고른 글자에 입력한 주소로 링크가 걸리고, 스킴이 없으면 https://가 붙는다", async () => {
    const { user, el, popup, input, select } = await setup("<p>걸릴글자</p>");

    select({ from: 1, to: 5 });
    await user.click(screen.getByRole("button", { name: "링크" }));
    await user.type(input(), "b.com{Enter}");

    expect(el.querySelector("a")?.getAttribute("href")).toBe("https://b.com");
    expect(el.querySelector("a")?.textContent).toBe("걸릴글자");
    expect(popup()).not.toBeInTheDocument();
  });

  it("새 링크: 고른 글자가 없으면 입력한 주소 자체가 링크 글자로 들어간다", async () => {
    const { user, el, input, select } = await setup("<p>본문</p>");

    select(3);
    await user.click(screen.getByRole("button", { name: "링크" }));
    await user.type(input(), "https://c.com");
    await user.click(screen.getByRole("button", { name: "적용" }));

    expect(el.querySelector("a")?.getAttribute("href")).toBe("https://c.com");
    expect(el.querySelector("a")?.textContent).toBe("https://c.com");
  });

  it("주소 수정: 링크를 눌러 주소를 바꾸면 글자는 그대로이고 주소만 바뀐다", async () => {
    const { user, el, input, openByHover } = await setup(WITH_LINK);

    await openByHover();
    await user.clear(input());
    await user.type(input(), "https://new.com{Enter}");

    expect(el.querySelector("a")?.getAttribute("href")).toBe("https://new.com");
    expect(el.querySelector("a")?.textContent).toBe("링크글자");
    expect(el.textContent).toContain("앞 ");
  });

  it("주소를 모두 지우고 적용하면 링크가 해제된다", async () => {
    const { user, el, input, openByHover } = await setup(WITH_LINK);

    await openByHover();
    await user.clear(input());
    await user.keyboard("{Enter}");

    expect(el.querySelector("a")).toBeNull();
    expect(el.textContent).toContain("링크글자");
  });

  it("링크 해제 버튼을 누르면 글자는 남고 링크만 사라진다", async () => {
    const { user, el, popup, openByHover } = await setup(WITH_LINK);

    await openByHover();
    await user.click(screen.getByRole("button", { name: "링크 해제" }));

    expect(el.querySelector("a")).toBeNull();
    expect(el.textContent).toContain("링크글자");
    expect(popup()).not.toBeInTheDocument();
  });

  it("주소 입력창에서 Enter를 눌러도 바깥 폼이 제출되지 않는다", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    const { container } = render(
      <form onSubmit={onSubmit}>
        <PostEditor content={WITH_LINK} onChange={vi.fn()} />
      </form>,
    );
    await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
    const el = container.querySelector(".ProseMirror") as El;
    await waitFor(() => expect(el.textContent).not.toBe(""));
    act(() => el.editor.commands.setTextSelection(5));
    await user.click(screen.getByRole("button", { name: "링크" }));

    await user.type(screen.getByRole("textbox", { name: "링크 주소" }), "{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("링크 주소 팝업: 닫기", () => {
  it("Esc를 누르면 아무것도 바꾸지 않고 닫힌다", async () => {
    const { user, el, popup, input, openByHover } = await setup(WITH_LINK);

    await openByHover();
    await user.type(input(), "수정중{Escape}");

    expect(popup()).not.toBeInTheDocument();
    expect(el.querySelector("a")?.getAttribute("href")).toBe("https://a.com");
  });

  it("팝업 바깥을 누르면 닫힌다", async () => {
    const { user, popup, openByHover } = await setup(WITH_LINK);

    await openByHover();
    await user.click(document.body);

    expect(popup()).not.toBeInTheDocument();
  });

  it("링크를 고치는 중에 커서가 링크 밖으로 나가면 닫힌다", async () => {
    const { popup, select, openByHover } = await setup(WITH_LINK);

    await openByHover();
    select(1);

    await waitFor(() => expect(popup()).not.toBeInTheDocument());
  });
});
