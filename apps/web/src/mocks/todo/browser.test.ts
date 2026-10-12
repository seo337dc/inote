import { beforeEach, describe, expect, it, vi } from "vitest";

const start = vi.fn().mockResolvedValue(undefined);
vi.mock("msw/browser", () => ({ setupWorker: () => ({ start }) }));

describe("startMockWorker", () => {
  beforeEach(() => {
    start.mockClear();
    vi.resetModules();
    delete (globalThis as { __mswStarted?: unknown }).__mswStarted;
  });

  it("여러 번 불러도 워커는 한 번만 시작한다 (Strict Mode의 effect 두 번 실행 대비)", async () => {
    const { startMockWorker } = await import("./browser");

    await Promise.all([startMockWorker(), startMockWorker(), startMockWorker()]);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("모듈이 다시 불러와져도(HMR) 이미 시작했으면 다시 시작하지 않는다", async () => {
    const first = await import("./browser");
    await first.startMockWorker();

    vi.resetModules();
    const second = await import("./browser");
    await second.startMockWorker();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("처음 시작할 때 처리하지 않은 요청은 그대로 통과시킨다 (로그인 등 실제 API)", async () => {
    const { startMockWorker } = await import("./browser");

    await startMockWorker();

    expect(start).toHaveBeenCalledWith({ onUnhandledRequest: "bypass" });
  });
});
