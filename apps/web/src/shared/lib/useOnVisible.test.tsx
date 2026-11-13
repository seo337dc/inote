import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { installFakeIntersectionObserver } from "@/test/intersection-observer";
import { useOnVisible } from "./useOnVisible";

let io: ReturnType<typeof installFakeIntersectionObserver>;
const observers: ReturnType<typeof installFakeIntersectionObserver>["all"] = [];
beforeEach(() => {
  io = installFakeIntersectionObserver();
  observers.length = 0;
  observers.push(...io.all);
});
afterEach(() => vi.unstubAllGlobals());

const live = () => io.live();
const show = (visible = true) => io.show(visible);

function Probe({ onVisible, enabled = true, watch = 0, rootMargin }: { onVisible: () => void; enabled?: boolean; watch?: number; rootMargin?: string }) {
  const ref = useOnVisible<HTMLDivElement>(onVisible, { enabled, watch, rootMargin });
  return <div ref={ref} data-testid="sentinel" />;
}

describe("useOnVisible", () => {
  it("요소가 화면에 들어오면 콜백을 부른다", () => {
    const onVisible = vi.fn();
    render(<Probe onVisible={onVisible} />);

    show(true);

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("화면 밖이면 부르지 않는다", () => {
    const onVisible = vi.fn();
    render(<Probe onVisible={onVisible} />);

    show(false);

    expect(onVisible).not.toHaveBeenCalled();
  });

  it("enabled가 false면 관찰하지 않는다 (다음 페이지가 없거나 불러오는 중)", () => {
    render(<Probe onVisible={vi.fn()} enabled={false} />);

    expect(live()).toHaveLength(0);
  });

  it("enabled가 다시 true가 되면 관찰을 다시 시작한다", () => {
    const { rerender } = render(<Probe onVisible={vi.fn()} enabled={false} />);
    rerender(<Probe onVisible={vi.fn()} enabled />);

    expect(live()).toHaveLength(1);
  });

  it("watch 값이 바뀌면 관찰을 새로 시작한다 — 새 페이지를 붙인 뒤에도 요소가 여전히 보이면 다음 페이지를 이어 부르기 위해", () => {
    const { rerender } = render(<Probe onVisible={vi.fn()} watch={1} />);
    const first = live().at(-1);

    rerender(<Probe onVisible={vi.fn()} watch={2} />);

    expect(first!.disconnected).toBe(true);
    expect(live()).toHaveLength(1);
  });

  it("rootMargin을 넘기면 미리(화면에 닿기 전에) 부르도록 옵저버에 전달한다", () => {
    render(<Probe onVisible={vi.fn()} rootMargin="400px" />);

    expect(live()[0].options?.rootMargin).toBe("400px");
  });

  it("언마운트하면 옵저버를 끊는다", () => {
    const { unmount } = render(<Probe onVisible={vi.fn()} />);

    unmount();

    expect(live()).toHaveLength(0);
  });

  it("콜백이 매 렌더 새로 만들어져도 옵저버를 다시 만들지 않는다 (최신 콜백을 부른다)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Probe onVisible={first} />);
    const count = io.all.length;

    rerender(<Probe onVisible={second} />);
    show(true);

    expect(io.all.length).toBe(count);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("IntersectionObserver가 없는 환경에서도 오류 없이 지나간다", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    expect(() => render(<Probe onVisible={vi.fn()} />)).not.toThrow();
  });
});
