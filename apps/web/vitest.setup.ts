import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./src/test/msw/server";

// api.ts가 모듈 로드 시점에 읽는 값이라 다른 import보다 먼저 설정돼야 함.
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3200";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
