import { act } from "@testing-library/react";
import { vi } from "vitest";

type Entry = { isIntersecting: boolean };
type Recorded = { callback: (entries: Entry[]) => void; options?: IntersectionObserverInit; target?: Element; disconnected: boolean };

/**
 * jsdom에는 IntersectionObserver가 없다 — 가짜를 전역에 심고, 만들어진 옵저버를 기록한다.
 * `show(true)`로 "관찰 중인 요소가 화면에 들어왔다"를 흘려보낸다. 테스트가 끝나면 `vi.unstubAllGlobals()`로 되돌린다.
 */
export function installFakeIntersectionObserver() {
  const all: Recorded[] = [];
  class FakeIO {
    private rec: Recorded;
    constructor(callback: (entries: Entry[]) => void, options?: IntersectionObserverInit) {
      this.rec = { callback, options, disconnected: false };
      all.push(this.rec);
    }
    observe(target: Element) {
      this.rec.target = target;
    }
    disconnect() {
      this.rec.disconnected = true;
    }
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeIO);

  const live = () => all.filter((o) => !o.disconnected);
  return {
    all,
    live,
    /** 지금 관찰 중인 마지막 옵저버에 보인다/안 보인다를 알린다 */
    show: (visible = true) => act(() => live().at(-1)!.callback([{ isIntersecting: visible }])),
  };
}
