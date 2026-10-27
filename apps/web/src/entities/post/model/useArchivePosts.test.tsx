import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useArchivePosts } from "./useArchivePosts";
import { MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY } from "./queryKeys";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useArchivePosts(), { wrapper }), invalidate };
}

describe("useArchivePosts", () => {
  it("보관하면 POST /blog/posts/archive에 ids를 보내고, 처리된 id를 돌려준다", async () => {
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ archivedIds: ["a"] });
      }),
    );
    const { result } = setup();

    let done: string[] = [];
    await act(async () => {
      done = await result.current.mutateAsync({ ids: ["a", "b"], archived: true });
    });

    expect(body).toEqual({ ids: ["a", "b"] });
    // 서버가 건너뛴 글(b)은 빠진다 — 요청한 개수와 다를 수 있다
    expect(done).toEqual(["a"]);
  });

  it("보관 해제는 POST /blog/posts/unarchive를 부르고 unarchivedIds를 돌려준다", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/unarchive`, () => HttpResponse.json({ unarchivedIds: ["a", "b"] })),
    );
    const { result } = setup();

    let done: string[] = [];
    await act(async () => {
      done = await result.current.mutateAsync({ ids: ["a", "b"], archived: false });
    });

    expect(done).toEqual(["a", "b"]);
  });

  it("성공하면 나의 글·카테고리 트리·글 상세 캐시를 다시 불러오게 한다", async () => {
    server.use(http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, () => HttpResponse.json({ archivedIds: ["a"] })));
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync({ ids: ["a"], archived: true });
    });

    const keys = invalidate.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(MY_POSTS_KEY);
    expect(keys).toContainEqual(MY_POST_OUTLINE_KEY);
    expect(keys).toContainEqual(POST_OUTLINE_KEY);
    expect(keys).toContainEqual(["post-detail"]);
  });

  it("실패하면 캐시를 건드리지 않고 오류 상태가 된다", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, () => HttpResponse.json({ message: "no" }, { status: 500 })),
    );
    const { result, invalidate } = setup();

    act(() => result.current.mutate({ ids: ["a"], archived: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
