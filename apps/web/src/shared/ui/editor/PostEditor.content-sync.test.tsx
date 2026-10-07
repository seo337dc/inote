import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PostEditor from "./PostEditor";

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  document.elementFromPoint = () => null;
});

afterEach(() => vi.restoreAllMocks());

const CALLOUT_HTML = '<div data-type="callout" data-emoji="💡"><p>강조 내용</p></div><p>뒤 문단</p>';

// 수정 화면은 글을 불러온 뒤에 content가 채워지므로, 빈 에디터에 저장된 내용(콜아웃 같은 React 노드뷰가 든)이 나중에 들어온다.
// 이때 Tiptap이 새 React 노드뷰를 flushSync로 그리는데, 효과(useEffect) 안에서 부르면 React가 오류를 낸다.
describe("PostEditor — 불러온 내용 동기화", () => {
  it("나중에 들어온 content에 콜아웃이 있어도 React 오류(flushSync)를 내지 않고 그린다", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onChange = vi.fn();
    const { rerender } = render(<PostEditor content="" onChange={onChange} />);
    await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());

    rerender(<PostEditor content={CALLOUT_HTML} onChange={onChange} />);

    await waitFor(() => expect(screen.getByText("강조 내용")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "콜아웃 아이콘 변경" })).toBeInTheDocument();
    const flushSyncErrors = errors.mock.calls.filter((args) => String(args[0]).includes("flushSync"));
    expect(flushSyncErrors).toEqual([]);
  });

  it("불러온 내용은 사용자가 고친 것으로 치지 않는다 (onUserEdit을 부르지 않는다)", async () => {
    const onUserEdit = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(<PostEditor content="" onChange={onChange} onUserEdit={onUserEdit} />);
    await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());

    rerender(<PostEditor content={CALLOUT_HTML} onChange={onChange} onUserEdit={onUserEdit} />);

    await waitFor(() => expect(screen.getByText("강조 내용")).toBeInTheDocument());
    expect(onChange).toHaveBeenCalled(); // 정규화된 내용은 알려 주되
    expect(onUserEdit).not.toHaveBeenCalled(); // 사용자 편집으로는 세지 않는다
  });
});
