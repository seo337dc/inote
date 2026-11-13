import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemoGroupCard from "./MemoGroupCard";
import { makeMemo, makeMemoGroup } from "@/test/fixtures/memo";

// 메모 관리의 카드 한 장 = 대상(글·독서) 하나의 메모 묶음, 일반 메모는 한 장. 계약: docs/todo/memo.md 4차
const post = (id: string, over = {}) => makeMemo({ id, targetType: "post", targetId: "p1", ...over });
const groupOf = (memos: ReturnType<typeof makeMemo>[], over = {}) => makeMemoGroup({ targetType: "post", targetId: "p1", targetTitle: "글 제목", memos, ...over });
const THREE = [post("a", { title: "첫째", content: "내용1" }), post("b", { title: "둘째", content: "내용2" }), post("c", { title: "셋째", content: "내용3" })];

describe("MemoGroupCard — 헤더", () => {
  it("글 그룹은 '글' 뱃지·대상 제목·외 N개·대상으로 가는 이동 아이콘을 보여준다", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByText("글")).toBeInTheDocument();
    expect(screen.getByText("글 제목")).toBeInTheDocument();
    expect(screen.getByText("외 2개")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "글로 이동" })).toHaveAttribute("href", "/posts/p1");
  });

  it("독서 그룹은 '독서' 뱃지이고 이동 아이콘은 /reading/:id로 간다", () => {
    const memos = [makeMemo({ id: "r", targetType: "reading", targetId: "r9" })];
    render(<MemoGroupCard group={makeMemoGroup({ targetType: "reading", targetId: "r9", targetTitle: "책 제목", memos })} />);

    expect(screen.getByText("독서")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "독서 기록으로 이동" })).toHaveAttribute("href", "/reading/r9");
  });

  it("메모가 한 장이면 '외 N개'를 보이지 않는다", () => {
    render(<MemoGroupCard group={groupOf([post("a")])} />);

    expect(screen.queryByText(/^외 /)).toBeNull();
  });

  it("일반 메모는 '일반' 뱃지만 있고 대상 제목·이동 아이콘·'외 N개'가 없다 (묶지 않는다)", () => {
    const memos = [makeMemo({ id: "g", targetType: "general", targetId: "" })];
    render(<MemoGroupCard group={makeMemoGroup({ targetType: "general", targetId: "", targetTitle: null, memos })} />);

    expect(screen.getByText("일반")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/^외 /)).toBeNull();
  });

  it("대상 제목이 길어도 한 줄로 줄인다 (truncate)", () => {
    const title = "아주 긴 제목 ".repeat(20);
    render(<MemoGroupCard group={groupOf(THREE, { targetTitle: title })} />);

    expect(screen.getByText(title.trim())).toHaveClass("truncate");
  });
});

describe("MemoGroupCard — 본문과 날짜", () => {
  it("처음에는 그룹의 첫 메모(가장 최근 수정한 것)의 제목·내용을 보여준다", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByText("첫째")).toBeInTheDocument();
    expect(screen.getByText("내용1")).toBeInTheDocument();
    expect(screen.queryByText("둘째")).toBeNull();
  });

  it("날짜는 보이지 않는다", () => {
    const { container } = render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(container.textContent).not.toMatch(/\d{4}\.\d{2}\.\d{2}/);
  });

  it("제목이 비면 '제목 없음', 내용이 비면 '내용 없음'", () => {
    render(<MemoGroupCard group={groupOf([post("a", { title: "", content: "" })])} />);

    expect(screen.getByText("제목 없음")).toBeInTheDocument();
    expect(screen.getByText("내용 없음")).toBeInTheDocument();
  });

  it("카드는 정사각형이고 메모장과 같은 색 토큰을 쓴다", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByRole("article")).toHaveClass("aspect-square", "bg-memo", "text-memo-foreground", "border-memo-border");
  });
});

describe("MemoGroupCard — 메모 넘기기 (여러 장일 때)", () => {
  it("‹ › 버튼과 '1 / 3' 위치 표시가 있다", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 메모" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 메모" })).toBeInTheDocument();
  });

  it("다음 메모·이전 메모를 누르면 그 메모로 바뀐다", async () => {
    const user = userEvent.setup();
    render(<MemoGroupCard group={groupOf(THREE)} />);

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    expect(screen.getByText("둘째")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    expect(screen.getByText("셋째")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "이전 메모" }));
    expect(screen.getByText("둘째")).toBeInTheDocument();
  });

  it("처음에는 이전 버튼이, 마지막에는 다음 버튼이 비활성이다", async () => {
    const user = userEvent.setup();
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByRole("button", { name: "이전 메모" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    expect(screen.getByRole("button", { name: "다음 메모" })).toBeDisabled();
  });

  it("메모가 한 장이면 넘기기 버튼과 위치 표시가 없다", () => {
    render(<MemoGroupCard group={groupOf([post("a")])} />);

    expect(screen.queryByRole("button", { name: "이전 메모" })).toBeNull();
    expect(screen.queryByRole("button", { name: "다음 메모" })).toBeNull();
    expect(screen.queryByText(/ \/ /)).toBeNull();
  });

  it("카드마다 따로 넘긴다 (한 카드를 넘겨도 다른 카드는 그대로)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="a"><MemoGroupCard group={groupOf(THREE, { key: "k1" })} /></div>
        <div data-testid="b"><MemoGroupCard group={groupOf(THREE, { key: "k2" })} /></div>
      </>,
    );

    await user.click(within(screen.getByTestId("a")).getByRole("button", { name: "다음 메모" }));

    expect(within(screen.getByTestId("a")).getByText("둘째")).toBeInTheDocument();
    expect(within(screen.getByTestId("b")).getByText("첫째")).toBeInTheDocument();
  });

  it("메모를 고쳐 그룹 안 순서가 바뀌어도(수정한 메모가 맨 앞으로 옴) 보고 있던 메모를 따라간다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MemoGroupCard group={groupOf(THREE)} />);
    await user.click(screen.getByRole("button", { name: "다음 메모" })); // 둘째를 보는 중

    rerender(<MemoGroupCard group={groupOf([THREE[1], THREE[0], THREE[2]])} />); // 둘째가 방금 수정돼 맨 앞으로

    expect(screen.getByText("둘째")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("그룹의 메모가 바뀌어 현재 위치가 범위를 벗어나면(메모 삭제 등) 마지막 메모를 보여준다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MemoGroupCard group={groupOf(THREE)} />);
    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    await user.click(screen.getByRole("button", { name: "다음 메모" }));

    rerender(<MemoGroupCard group={groupOf(THREE.slice(0, 2))} />);

    expect(screen.getByText("둘째")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});

// 여러 장이면 카드 뒤에 종이가 겹쳐 보인다 (장식 — 최대 2장만 보여주고 정확한 수는 '외 N개'·'1 / 3'이 알려준다)
describe("MemoGroupCard — 겹친 종이", () => {
  const layers = (container: HTMLElement) => container.querySelectorAll("[data-stack-layer]");
  const memosOf = (n: number) => Array.from({ length: n }, (_, i) => post(`m${i}`, { title: `메모${i}` }));

  it("메모가 한 장이면 겹침이 없다", () => {
    const { container } = render(<MemoGroupCard group={groupOf(memosOf(1))} />);
    expect(layers(container)).toHaveLength(0);
  });

  it("두 장이면 한 겹, 세 장 이상이면 두 겹이다 (최대 2겹)", () => {
    for (const [n, expected] of [[2, 1], [3, 2], [10, 2]] as const) {
      const { container, unmount } = render(<MemoGroupCard group={groupOf(memosOf(n))} />);
      expect(layers(container)).toHaveLength(expected);
      unmount();
    }
  });

  it("겹침은 장식이라 접근성 트리에서 숨긴다 (aria-hidden)", () => {
    const { container } = render(<MemoGroupCard group={groupOf(memosOf(3))} />);
    for (const layer of layers(container)) expect(layer).toHaveAttribute("aria-hidden", "true");
  });

  it("겹침은 카드 뒤에 놓이고 메모장 색 토큰을 쓴다", () => {
    const { container } = render(<MemoGroupCard group={groupOf(memosOf(2))} />);
    const layer = layers(container)[0];
    expect(layer).toHaveClass("border-memo-border");
    expect(layer.compareDocumentPosition(screen.getByRole("article")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("카드(article) 안의 글자와 버튼은 겹침 때문에 늘어나지 않는다", () => {
    render(<MemoGroupCard group={groupOf(memosOf(3))} />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["메모 열기", "이전 메모", "다음 메모"]);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});

// 넘길 때 옆에서 스르륵 들어오는 슬라이드 효과 (다음은 오른쪽에서, 이전은 왼쪽에서)
describe("MemoGroupCard — 넘김 효과(슬라이드)", () => {
  const body = () => screen.getByRole("heading").parentElement!;

  it("처음에는 효과 클래스가 없다 (아직 넘기지 않았다)", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);
    expect(body().className).not.toMatch(/memo-slide/);
  });

  it("다음으로 넘기면 next, 이전으로 넘기면 prev 방향 클래스가 붙는다", async () => {
    const user = userEvent.setup();
    render(<MemoGroupCard group={groupOf(THREE)} />);

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    expect(body()).toHaveClass("memo-slide-next");

    await user.click(screen.getByRole("button", { name: "이전 메모" }));
    expect(body()).toHaveClass("memo-slide-prev");
  });

  it("넘길 때마다 본문 요소가 새로 만들어져 애니메이션이 다시 시작된다", async () => {
    const user = userEvent.setup();
    render(<MemoGroupCard group={groupOf(THREE)} />);
    const first = body();

    await user.click(screen.getByRole("button", { name: "다음 메모" }));

    expect(body()).not.toBe(first);
  });
});

// 카드의 메모(제목·내용 영역)를 누르면 메모장을 연다 — 열 메모는 지금 카드에 보이는 메모
describe("MemoGroupCard — 메모 눌러서 열기", () => {
  it("본문 영역의 '메모 열기'를 누르면 지금 보이는 메모의 id로 onOpenMemo가 불린다", async () => {
    const onOpenMemo = vi.fn();
    render(<MemoGroupCard group={groupOf(THREE)} onOpenMemo={onOpenMemo} />);

    await userEvent.click(screen.getByRole("button", { name: "메모 열기" }));

    expect(onOpenMemo).toHaveBeenCalledWith("a");
  });

  it("넘긴 뒤 누르면 넘긴 메모의 id로 불린다", async () => {
    const user = userEvent.setup();
    const onOpenMemo = vi.fn();
    render(<MemoGroupCard group={groupOf(THREE)} onOpenMemo={onOpenMemo} />);

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    await user.click(screen.getByRole("button", { name: "메모 열기" }));

    expect(onOpenMemo).toHaveBeenCalledWith("b");
  });

  it("넘기기 버튼과 이동 아이콘은 메모장을 열지 않는다", async () => {
    const user = userEvent.setup();
    const onOpenMemo = vi.fn();
    render(<MemoGroupCard group={groupOf(THREE)} onOpenMemo={onOpenMemo} />);

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    await user.click(screen.getByRole("link", { name: "글로 이동" }));

    expect(onOpenMemo).not.toHaveBeenCalled();
  });

  it("키보드로도 열 수 있다 (버튼이라 Enter)", async () => {
    const onOpenMemo = vi.fn();
    render(<MemoGroupCard group={groupOf(THREE)} onOpenMemo={onOpenMemo} />);

    screen.getByRole("button", { name: "메모 열기" }).focus();
    await userEvent.keyboard("{Enter}");

    expect(onOpenMemo).toHaveBeenCalledWith("a");
  });

  it("누를 수 있다는 것이 보이게 포인터 커서와 hover 효과가 있다", () => {
    render(<MemoGroupCard group={groupOf(THREE)} />);

    expect(screen.getByRole("button", { name: "메모 열기" })).toHaveClass("cursor-pointer");
  });
});

