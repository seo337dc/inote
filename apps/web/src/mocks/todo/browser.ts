import { setupWorker } from "msw/browser";
import { createTodoHandlers } from "./handlers";
import { createTodoStore } from "./store";

// 브라우저 개발용 — 새로고침하면 데이터가 처음 상태로 돌아간다.
export const worker = setupWorker(...createTodoHandlers(createTodoStore()));

// 개발 모드의 React Strict Mode는 useEffect를 두 번 실행하고 HMR은 모듈을 다시 불러온다.
// worker.start()를 두 번 부르면 "cannot configure an already enabled network" 오류가 나므로,
// 시작 약속(Promise)을 globalThis에 두고 한 번만 시작한다.
const globalForMsw = globalThis as typeof globalThis & { __mswStarted?: Promise<unknown> };

export function startMockWorker(): Promise<unknown> {
  globalForMsw.__mswStarted ??= worker.start({ onUnhandledRequest: "bypass" });
  return globalForMsw.__mswStarted;
}
