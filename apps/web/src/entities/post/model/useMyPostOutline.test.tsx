import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useMyPostOutline } from "./useMyPostOutline";
import { useSession } from "@/shared/lib/auth-client";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMyPostOutline(), { wrapper });
}

function setSession(state: "user" | "none") {
  vi.mocked(useSession).mockReturnValue({
    data: state === "user" ? { user: { id: "u1" } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

describe("useMyPostOutline", () => {
  beforeEach(() => setSession("user"));

  it("내 글 목록(제목·카테고리)을 가져온다", async () => {
    const items = [{ id: "p1", title: "글", category: "학습", isPrivate: false, publishedAt: null }];
    server.use(http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () => HttpResponse.json(items)));

    const { result } = setup();

    await waitFor(() => expect(result.current.data).toEqual(items));
  });

  it("로그인하지 않았으면 요청하지 않는다", () => {
    setSession("none");
    const { result } = setup();

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("API 오류여도 예외를 던지지 않고 error 상태로 남는다 (구조 편집을 막지 않음)", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () =>
        HttpResponse.json({ message: "not found" }, { status: 404 }),
      ),
    );

    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
