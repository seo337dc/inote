import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useRenameCategory } from "./useRenameCategory";
import { CATEGORIES_QUERY_KEY } from "./useCategories";
import type { Category } from "./types";
import { MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY } from "@/entities/post";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

const cat = (id: string, name: string): Category => ({
  id,
  userId: "u",
  name,
  parentId: null,
  depth: 1,
  position: 0,
  createdAt: "",
  updatedAt: "",
});

const MY_POSTS = [...MY_POSTS_KEY, 1, 1, null];
const OUTLINE = [...POST_OUTLINE_KEY, "u"];
const MY_OUTLINE = [...MY_POST_OUTLINE_KEY, "u"];

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(CATEGORIES_QUERY_KEY, [cat("a", "학습"), cat("b", "이직")]);
  client.setQueryData(MY_POSTS, {
    ...makePostListPage({
      pinned: [makePost("p1", { category: "학습", pinned: true })],
      items: [makePost("p2", { category: "이직" })],
    }),
    categoryCounts: { 학습: 3, 이직: 1 },
  });
  client.setQueryData(OUTLINE, [
    { id: "p1", title: "a", category: "학습", isPrivate: false, pinned: true },
    { id: "p2", title: "b", category: "이직", isPrivate: false, pinned: false },
  ]);
  client.setQueryData(MY_OUTLINE, [
    { id: "p1", title: "a", category: "학습", isPrivate: false, publishedAt: null },
    { id: "p2", title: "b", category: "이직", isPrivate: false, publishedAt: null },
  ]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useRenameCategory(), { wrapper }) };
}

const names = (client: QueryClient) =>
  (client.getQueryData<Category[]>(CATEGORIES_QUERY_KEY) ?? []).map((c) => c.name);

describe("useRenameCategory (낙관적 업데이트)", () => {
  it("서버 응답 전에 카테고리 이름과 글 캐시(개수·글의 카테고리)를 함께 바꾼다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/a`, async () => {
        await delay(200);
        return HttpResponse.json(cat("a", "공부"));
      }),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "a", name: "공부" }));

    await waitFor(() => expect(names(client)).toEqual(["공부", "이직"]));
    expect(result.current.isSuccess).toBe(false); // 응답은 아직
    const mine = client.getQueryData<{ pinned: { category: string }[]; categoryCounts: Record<string, number> }>(MY_POSTS);
    expect(mine?.categoryCounts).toEqual({ 이직: 1, 공부: 3 });
    expect(mine?.pinned[0].category).toBe("공부");
    expect(client.getQueryData<{ category: string }[]>(OUTLINE)?.[0].category).toBe("공부");
    expect(client.getQueryData<{ category: string }[]>(MY_OUTLINE)?.[0].category).toBe("공부");
    // 다른 카테고리 글은 그대로
    expect(client.getQueryData<{ category: string }[]>(MY_OUTLINE)?.[1].category).toBe("이직");
  });

  it("요청 본문에 새 이름을 보낸다", async () => {
    let body: unknown;
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/a`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(cat("a", "공부"));
      }),
    );
    const { result } = setup();

    act(() => result.current.mutate({ id: "a", name: "공부" }));

    await waitFor(() => expect(body).toEqual({ name: "공부" }));
  });

  it("서버가 실패하면 카테고리 이름과 글 캐시를 모두 원래대로 되돌린다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/a`, () =>
        HttpResponse.json({ message: "duplicate" }, { status: 400 }),
      ),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "a", name: "공부" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(names(client)).toEqual(["학습", "이직"]);
    const mine = client.getQueryData<{ categoryCounts: Record<string, number> }>(MY_POSTS);
    expect(mine?.categoryCounts).toEqual({ 학습: 3, 이직: 1 });
    expect(client.getQueryData<{ category: string }[]>(MY_OUTLINE)?.[0].category).toBe("학습");
    expect(client.getQueryData<{ category: string }[]>(OUTLINE)?.[0].category).toBe("학습");
  });
});
