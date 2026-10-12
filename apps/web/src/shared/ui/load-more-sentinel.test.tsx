import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoadMoreSentinel } from "./load-more-sentinel";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

function mockObserver() {
  const instances: { callback: Callback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class FakeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(public callback: Callback) {
      instances.push(this);
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return instances;
}

describe("LoadMoreSentinel", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("끝 표시선이 화면에 들어오면 다음 묶음을 요청한다", () => {
    const observers = mockObserver();
    const onLoadMore = vi.fn();
    render(<LoadMoreSentinel onLoadMore={onLoadMore} watch={1} />);

    observers[0].callback([{ isIntersecting: false }]);
    expect(onLoadMore).not.toHaveBeenCalled();
    observers[0].callback([{ isIntersecting: true }]);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("보여 주는 개수(watch)가 바뀌면 다시 살펴본다 — 끝이 아직 화면 안이어도 이어서 불러오게", () => {
    const observers = mockObserver();
    const { rerender } = render(<LoadMoreSentinel onLoadMore={() => {}} watch={1} />);
    rerender(<LoadMoreSentinel onLoadMore={() => {}} watch={2} />);

    expect(observers).toHaveLength(2);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(observers[1].observe).toHaveBeenCalled();
  });

  it("불러오는 중에는 살펴보지 않고 안내를 보여준다", () => {
    const observers = mockObserver();
    render(<LoadMoreSentinel onLoadMore={() => {}} loading watch={1} />);

    expect(observers).toHaveLength(0);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("IntersectionObserver가 없으면 [더 보기] 버튼으로 대신한다", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const onLoadMore = vi.fn();
    render(<LoadMoreSentinel onLoadMore={onLoadMore} watch={1} />);

    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
