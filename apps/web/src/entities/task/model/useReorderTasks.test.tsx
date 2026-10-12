import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useReorderTasks } from "./useTaskMutations";
import { TASK_GROUPS_KEY } from "./keys";
import type { Task, TaskGroup } from "./types";
import { server } from "@/test/msw/server";

const task = (id: string): Task => ({ id, groupId: "g1", title: id, status: "TODO", startDate: null, endDate: null, starred: false });
const GROUPS: TaskGroup[] = [{ id: "g1", name: "사이드", starred: false, tasks: [task("a"), task("b"), task("c")] }];
const titles = (client: QueryClient) =>
  client.getQueryData<TaskGroup[]>(TASK_GROUPS_KEY)?.[0].tasks.map((t) => t.id);

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(TASK_GROUPS_KEY, GROUPS);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useReorderTasks(), { wrapper });
  return { client, result };
}

describe("useReorderTasks (끌어서 순서 변경)", () => {
  it("서버 응답을 기다리지 않고 화면의 순서를 먼저 바꾸고, 새 순서를 서버에 보낸다", async () => {
    let sent: unknown = null;
    server.use(
      http.put("*/api/v1/task-groups/:id/tasks/order", async ({ request }) => {
        sent = await request.json();
        await delay(150);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ groupId: "g1", taskIds: ["c", "a", "b"] }));

    await waitFor(() => expect(titles(client)).toEqual(["c", "a", "b"])); // 응답 전에 이미 바뀜
    expect(result.current.isSuccess).toBe(false);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sent).toEqual({ taskIds: ["c", "a", "b"] });
  });

  it("서버가 실패하면 이전 순서로 되돌린다", async () => {
    server.use(
      http.put("*/api/v1/task-groups/:id/tasks/order", () => HttpResponse.json({ message: "x" }, { status: 500 })),
      // 실패 뒤 다시 불러오는 요청에 대비
      http.get("*/api/v1/task-groups", () => HttpResponse.json(GROUPS)),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ groupId: "g1", taskIds: ["c", "b", "a"] }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(titles(client)).toEqual(["a", "b", "c"]);
  });
});
