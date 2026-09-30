import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useMoveCategory } from "./useMoveCategory";
import { CATEGORIES_QUERY_KEY } from "./useCategories";
import type { Category } from "./types";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";

const cat = (id: string, position: number): Category => ({
  id,
  userId: "u",
  name: id,
  parentId: null,
  depth: 1,
  position,
  createdAt: "",
  updatedAt: "",
});

const INITIAL = [cat("A", 0), cat("B", 1), cat("C", 2)];
const order = (list: Category[] | undefined) =>
  [...(list ?? [])].sort((a, b) => a.position - b.position).map((c) => c.id);

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(CATEGORIES_QUERY_KEY, INITIAL);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useMoveCategory(), { wrapper });
  return { client, ...hook };
}

describe("useMoveCategory (낙관적 업데이트)", () => {
  it("서버 응답을 기다리지 않고 캐시의 순서를 먼저 바꾼다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/C/move`, async () => {
        await delay(200);
        return HttpResponse.json([cat("C", 0), cat("A", 1), cat("B", 2)]);
      }),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "C", parentId: null, index: 0 }));

    // 응답(200ms 뒤)이 오기 전에 이미 순서가 바뀌어 있다
    await waitFor(() =>
      expect(order(client.getQueryData(CATEGORIES_QUERY_KEY))).toEqual(["C", "A", "B"]),
    );
    expect(result.current.isSuccess).toBe(false);
  });

  it("요청에 새 부모와 위치를 보낸다", async () => {
    let body: unknown;
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/A/move`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(INITIAL);
      }),
    );
    const { result } = setup();

    act(() => result.current.mutate({ id: "A", parentId: "B", index: 0 }));

    await waitFor(() => expect(body).toEqual({ parentId: "B", index: 0 }));
  });

  it("서버가 실패하면 이동 전 상태로 되돌린다", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/C/move`, () =>
        HttpResponse.json({ message: "fail" }, { status: 400 }),
      ),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ id: "C", parentId: null, index: 0 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(order(client.getQueryData(CATEGORIES_QUERY_KEY))).toEqual(["A", "B", "C"]);
  });
});
