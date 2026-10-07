import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";
import { SLASH_MENU_Z_INDEX } from "./slash-command";

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  // 클릭하면 ProseMirror가 좌표로 위치를 찾으려고 elementFromPoint를 부르는데 jsdom에는 없다 (null이면 "찾지 못함"으로 처리됨)
  document.elementFromPoint = () => null;
});

async function openMenu() {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content="<p></p>" onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  await user.click(container.querySelector(".ProseMirror") as HTMLElement);
  await user.keyboard("/");
  const first = await screen.findByText("제목 1");
  // 화면에 붙는 요소: 메뉴 목록(div) → Tiptap이 감싸는 래퍼(div)
  const list = first.closest("button")!.parentElement as HTMLElement;
  const wrapper = list.parentElement as HTMLElement;
  return { user, container, list, wrapper };
}

describe("슬래시(/) 메뉴가 열릴 때", () => {
  it("빈 줄에서 /를 입력하면 블록 삽입 메뉴가 뜬다", async () => {
    const { list } = await openMenu();

    // 화면에는 위쪽 툴바의 "표" 버튼도 있으므로 메뉴 안으로 범위를 좁혀서 찾는다
    const menu = within(list);
    expect(menu.getByText("텍스트")).toBeInTheDocument();
    expect(menu.getByText("표")).toBeInTheDocument();
  });

  it("화면에 붙는 래퍼가 하단 고정 바(z-10)보다 위, 모달(z-50)보다 아래 레이어에 놓인다", async () => {
    const { wrapper } = await openMenu();

    const z = Number(wrapper.style.zIndex);

    expect(wrapper.style.zIndex).toBe(SLASH_MENU_Z_INDEX);
    expect(z).toBeGreaterThan(10);
    expect(z).toBeLessThan(50);
  });

  it("메뉴 목록은 높이가 제한되어 스크롤된다", async () => {
    const { list } = await openMenu();

    expect(list).toHaveClass("max-h-80", "overflow-y-auto");
  });

  it("영어로 검색해도 찾는다: /table → 표 항목만 남고 Enter로 표가 삽입된다", async () => {
    const { user, container, list } = await openMenu();

    await user.keyboard("table");

    await waitFor(() => expect(within(list).queryByText("제목 1")).toBeNull());
    expect(within(list).getByText("표")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(container.querySelectorAll("tr")).toHaveLength(3);
  });

  it("/h4를 입력하고 Enter를 누르면 현재 줄이 가장 작은 제목(h4)이 된다", async () => {
    const { user, container } = await openMenu();

    await user.keyboard("h4{Enter}");

    expect(container.querySelector(".ProseMirror h4")).not.toBeNull();
    await waitFor(() => expect(screen.queryByText("제목 1")).toBeNull());
  });

  it("영어 검색 결과가 없으면 안내 문구가 뜬다: /zzzz", async () => {
    const { user } = await openMenu();

    await user.keyboard("zzzz");

    expect(await screen.findByText("일치하는 명령어가 없습니다")).toBeInTheDocument();
  });

  it("방향키로 '표'까지 내려가 Enter를 누르면 표가 삽입되고 메뉴가 닫힌다", async () => {
    const { user, container } = await openMenu();

    await user.keyboard("{ArrowUp}{Enter}"); // 위로 한 칸 = 맨 마지막 항목(표)

    expect(container.querySelectorAll("tr")).toHaveLength(3);
    await waitFor(() => expect(screen.queryByText("제목 1")).toBeNull());
  });
});
