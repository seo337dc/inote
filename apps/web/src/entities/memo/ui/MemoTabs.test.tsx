import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoTabs } from "./MemoTabs";

type Tab = { key: string; label: string; id: string | null; title: string; content: string };
const tab = (n: number, over: Partial<Tab> = {}): Tab => ({
  key: `k${n}`,
  label: `메모 ${n}`,
  id: `m${n}`,
  title: "",
  content: "",
  ...over,
});

// jsdom에는 IntersectionObserver가 없다 — 어떤 탭이 보이는지를 테스트가 직접 알려준다.
let observerCallback: IntersectionObserverCallback | null = null;
class FakeObserver {
  constructor(cb: IntersectionObserverCallback) {
    observerCallback = cb;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
/** 지정한 탭(index)만 잘려 있고 나머지는 다 보인다고 알린다 */
function reportCutOff(cutOff: number[]) {
  const tabs = screen.getAllByRole("tab");
  act(() => {
    observerCallback!(
      tabs.map((el, i) => ({ target: el, intersectionRatio: cutOff.includes(i) ? 0.3 : 1 }) as unknown as IntersectionObserverEntry),
      {} as IntersectionObserver,
    );
  });
}

beforeEach(() => {
  observerCallback = null;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

function setup(over: Partial<React.ComponentProps<typeof MemoTabs>> = {}) {
  const props = {
    tabs: [tab(1, { content: "본문" }), tab(2), tab(3)],
    activeIndex: 0,
    canAdd: true,
    disabled: false,
    error: null,
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onTitleChange: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    ...over,
  };
  render(<MemoTabs {...props} />);
  return props;
}

describe("MemoTabs — 탭", () => {
  it("메모마다 탭이 있고 열려 있는 탭이 선택 상태다", () => {
    setup({ activeIndex: 1 });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["메모 1", "메모 2", "메모 3"]);
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
  });

  it("탭을 누르면 그 메모를 연다", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("tab", { name: /메모 3/ }));
    expect(p.onSelect).toHaveBeenCalledWith(2);
  });

  it("불러오는 중(disabled)에는 탭·추가가 동작하지 않는다", async () => {
    const p = setup({ disabled: true });
    await userEvent.click(screen.getAllByRole("tab")[1]);
    expect(p.onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "메모 추가" })).toBeDisabled();
  });
});

describe("MemoTabs — 추가·상한", () => {
  it("+를 누르면 추가를 요청한다", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "메모 추가" }));
    expect(p.onAdd).toHaveBeenCalledOnce();
  });

  it("canAdd가 false면 +가 막힌다", () => {
    setup({ canAdd: false });
    expect(screen.getByRole("button", { name: "메모 추가" })).toBeDisabled();
  });

  it("10장이면 +의 안내(title)가 상한을 알려준다", () => {
    setup({ tabs: Array.from({ length: 10 }, (_, i) => tab(i + 1)), canAdd: false });
    expect(screen.getByRole("button", { name: "메모 추가" })).toHaveAttribute("title", "메모는 최대 10장까지 만들 수 있습니다");
  });

  it("실패 안내(error)를 alert로 보여준다", () => {
    setup({ error: "메모는 최대 10장까지 만들 수 있습니다" });
    expect(screen.getByRole("alert")).toHaveTextContent("메모는 최대 10장까지 만들 수 있습니다");
  });
});

describe("MemoTabs — 삭제", () => {
  it("빈 메모는 확인 없이 바로 지운다", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "메모 2 삭제" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(p.onRemove).toHaveBeenCalledWith(1);
  });

  it("내용이 있는 메모는 확인하고, 취소하면 지우지 않는다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "메모 1 삭제" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(p.onRemove).not.toHaveBeenCalled();
  });

  it("내용이 있는 메모를 확인하면 지운다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "메모 1 삭제" }));
    expect(p.onRemove).toHaveBeenCalledWith(0);
  });

  it("아직 서버에 만들어지지 않은 탭에는 삭제 버튼이 없다", () => {
    setup({ tabs: [tab(1, { id: null })] });
    expect(screen.queryByRole("button", { name: /삭제/ })).toBeNull();
  });

  it("삭제 버튼을 눌러도 그 탭이 열리지는 않는다", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "메모 3 삭제" }));
    expect(p.onSelect).not.toHaveBeenCalled();
  });
});

describe("MemoTabs — 이름 변경", () => {
  it("더블클릭하면 제목 입력창이 열리고, 고치면 알린다", async () => {
    const p = setup({ tabs: [tab(1, { title: "할 일", label: "할 일" }), tab(2)] });
    await userEvent.dblClick(screen.getAllByRole("tab")[0]);
    const input = screen.getByRole("textbox", { name: "메모 제목" });
    expect(input).toHaveValue("할 일");
    await userEvent.type(input, "!");
    expect(p.onTitleChange).toHaveBeenLastCalledWith("할 일!");
  });

  it("Enter로 입력창이 닫힌다", async () => {
    setup();
    await userEvent.dblClick(screen.getAllByRole("tab")[0]);
    await userEvent.keyboard("{Enter}");
    expect(screen.queryByRole("textbox", { name: "메모 제목" })).toBeNull();
  });

  it("제목은 30자까지만 받는다", async () => {
    setup();
    await userEvent.dblClick(screen.getAllByRole("tab")[0]);
    expect(screen.getByRole("textbox", { name: "메모 제목" })).toHaveAttribute("maxlength", "30");
  });
});

describe("MemoTabs — 순서 변경", () => {
  it("탭을 끌어다 다른 탭에 놓으면 그 자리로 옮긴다", () => {
    const p = setup();
    const tabs = screen.getAllByRole("tab");
    fireEvent.dragStart(tabs[0]);
    fireEvent.dragOver(tabs[2]);
    fireEvent.drop(tabs[2]);
    expect(p.onMove).toHaveBeenCalledWith(0, 2);
  });

  it("서버에 아직 없는 탭은 끌 수 없다", () => {
    setup({ tabs: [tab(1, { id: null })] });
    expect(screen.getByRole("tab")).toHaveAttribute("draggable", "false");
  });

  it("탭에서 Alt+→/←로도 옮길 수 있다", async () => {
    const p = setup();
    screen.getAllByRole("tab")[1].focus();
    await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(p.onMove).toHaveBeenLastCalledWith(1, 2);
    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(p.onMove).toHaveBeenLastCalledWith(1, 0);
  });
});

describe("MemoTabs — 안 보이는 탭 뱃지", () => {
  it("다 보이면 뱃지가 없다", () => {
    setup();
    reportCutOff([]);
    expect(screen.queryByRole("button", { name: /안 보이는 메모/ })).toBeNull();
  });

  it("잘린 탭이 있으면 그 개수를 뱃지로 보여준다", () => {
    setup();
    reportCutOff([0, 1]);
    expect(screen.getByRole("button", { name: "안 보이는 메모 2개 보기" })).toHaveTextContent("2");
  });

  it("뱃지를 누르면 안 보이는 메모만 목록으로 나오고, 고르면 그 메모를 열고 목록이 닫힌다", async () => {
    const p = setup({ tabs: [tab(1), tab(2), tab(3), tab(4)], activeIndex: 3 });
    reportCutOff([0, 2]);
    await userEvent.click(screen.getByRole("button", { name: /안 보이는 메모/ }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["메모 1", "메모 3"]);

    await userEvent.click(within(menu).getByRole("menuitem", { name: "메모 3" }));
    expect(p.onSelect).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Esc를 누르거나 바깥을 누르면 목록이 닫힌다", async () => {
    setup();
    reportCutOff([0]);
    const badge = screen.getByRole("button", { name: /안 보이는 메모/ });
    await userEvent.click(badge);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();

    await userEvent.click(badge);
    await userEvent.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
