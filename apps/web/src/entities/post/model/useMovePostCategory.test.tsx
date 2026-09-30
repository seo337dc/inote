import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useMovePostCategory } from "./useMovePostCategory";
import { MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY } from "./queryKeys";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

const MY_POSTS = [...MY_POSTS_KEY, 1, 1, null];
const MY_OUTLINE = [...MY_POST_OUTLINE_KEY, "u"];
const OUTLINE = [...POST_OUTLINE_KEY, "u"];

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(MY_OUTLINE, [
    { id: "p1", title: "a", category: "학습", isPrivate: false, publishedAt: null },
    { id: "p2", title: "b", category: "학습", isPrivate: false, publishedAt: null },
  ]);
  client.setQueryData(MY_POSTS, {
    ...makePostListPage({ items: [makePost("p1", { category: "학습" })] }),
    categoryCounts: { 학습: 2, 일기: 1 },
  });
  client.setQueryData(OUTLINE, [
    { id: "p1", title: "a", category: "학습", isPrivate: false, pinned: false },
  ]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useMovePostCategory(), { wrapper }) };
}

const categoriesOf = (client: QueryClient, key: unknown[]) =>
  (client.getQueryData<{ category: string }[]>(key) ?? []).map((p) => p.category);

describe("useMovePostCategory (낙관적 업데이트)", () => {
  it("서버 응답 전에 글 목록의 카테고리와 카테고리별 글 수를 먼저 바꾼다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/blog/posts/p1`, async () => {
        await delay(200);
        return HttpResponse.json({ id: "p1" });
      }),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "p1", from: "학습", to: "일기" }));

    await waitFor(() => expect(categoriesOf(client, MY_OUTLINE)).toEqual(["일기", "학습"]));
    expect(result.current.isSuccess).toBe(false); // 응답은 아직
    const mine = client.getQueryData<{ items: { category: string }[]; categoryCounts: Record<string, number> }>(MY_POSTS);
    expect(mine?.categoryCounts).toEqual({ 학습: 1, 일기: 2 });
    expect(mine?.items[0].category).toBe("일기");
    expect(categoriesOf(client, OUTLINE)).toEqual(["일기"]);
  });

  it("카테고리만 담아 글 수정 API에 보낸다 (publish를 보내지 않음)", async () => {
    let body: unknown;
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/blog/posts/p1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "p1" });
      }),
    );
    const { result } = setup();

    act(() => result.current.mutate({ id: "p1", from: "학습", to: "일기" }));

    await waitFor(() => expect(body).toEqual({ category: "일기" }));
  });

  it("서버가 실패하면 글 목록과 글 수를 모두 원래대로 되돌린다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/blog/posts/p1`, () =>
        HttpResponse.json({ message: "fail" }, { status: 403 }),
      ),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "p1", from: "학습", to: "일기" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(categoriesOf(client, MY_OUTLINE)).toEqual(["학습", "학습"]);
    const mine = client.getQueryData<{ categoryCounts: Record<string, number> }>(MY_POSTS);
    expect(mine?.categoryCounts).toEqual({ 학습: 2, 일기: 1 });
    expect(categoriesOf(client, OUTLINE)).toEqual(["학습"]);
  });
});
