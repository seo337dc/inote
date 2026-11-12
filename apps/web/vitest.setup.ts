import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./src/test/msw/server";

// jsdom에는 Element.scrollTo가 없다 — 스크롤하는 컴포넌트(채팅 목록)가 렌더만으로 터지지 않게 빈 함수로 채운다.
// 스크롤 호출을 검증하는 테스트는 이 함수를 vi.fn()으로 바꿔서 쓴다.
Element.prototype.scrollTo ??= () => {};

// jsdom에는 레이아웃이 없어서 Range의 좌표 계산(getClientRects·getBoundingClientRect)이 없다 — ProseMirror(에디터)가 커서·선택 위치를
// 계산할 때 부르므로, 빈 좌표를 돌려주는 값으로 채운다. 에디터를 렌더하는 테스트가 각자 같은 mock을 만들던 것을 한 곳으로 모았다.
// (Range가 없는 환경에서는 건너뛴다)
if (typeof Range !== "undefined") {
  const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects ??= () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect ??= () => ({ ...emptyRect, toJSON: () => emptyRect }) as DOMRect;
}

// waitFor·findBy의 기본 대기는 1초인데, 전체 테스트를 병렬로 돌리거나 빌드·dev 서버가 같이 돌 때 가짜 서버(MSW) 응답이
// 그 안에 오지 못해 가끔 실패했다(useMemoDraft 테스트, 2026-11-12). 통과하는 테스트는 그대로 빠르고 실패할 때만 더 기다린다.
configure({ asyncUtilTimeout: 3000 });

// api.ts가 모듈 로드 시점에 읽는 값이라 다른 import보다 먼저 설정돼야 함.
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3200";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
