import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./src/test/msw/server";

// jsdom에는 Element.scrollTo가 없다 — 스크롤하는 컴포넌트(채팅 목록)가 렌더만으로 터지지 않게 빈 함수로 채운다.
// 스크롤 호출을 검증하는 테스트는 이 함수를 vi.fn()으로 바꿔서 쓴다.
Element.prototype.scrollTo ??= () => {};

// api.ts가 모듈 로드 시점에 읽는 값이라 다른 import보다 먼저 설정돼야 함.
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3200";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
