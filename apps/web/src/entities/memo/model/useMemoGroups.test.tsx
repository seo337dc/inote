import { describe, expect, it } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeGroupPage, makeMemoGroup, MEMO_GROUPS_URL } from "@/test/fixtures/memo";
import { useMemoGroups } from "./useMemoGroups";

const g = (id: string) => makeMemoGroup({ targetId: id });

describe("useMemoGroups", () => {
  it("첫 페이지를 불러와 그룹 목록(items)과 다음 페이지 유무를 돌려준다", async () => {
    server.use(http.get(MEMO_GROUPS_URL, () => HttpResponse.json(makeGroupPage([g("a"), g("b")], "c1"))));

    const { result } = renderHookWithQueryClient(() => useMemoGroups());

    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("fetchNextPage는 nextCursor로 다음 페이지를 받아 이어 붙이고, 마지막 페이지면 hasNextPage가 false가 된다", async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        cursors.push(cursor);
        return HttpResponse.json(cursor ? makeGroupPage([g("c")], null) : makeGroupPage([g("a"), g("b")], "c1"));
      }),
    );
    const { result } = renderHookWithQueryClient(() => useMemoGroups());
    await waitFor(() => expect(result.current.groups).toHaveLength(2));

    await act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.groups.map((x) => x.targetId)).toEqual(["a", "b", "c"]));
    expect(cursors).toEqual([null, "c1"]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("종류(targetType)를 주면 그 종류로 요청한다", async () => {
    let type: string | null = null;
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        type = new URL(request.url).searchParams.get("targetType");
        return HttpResponse.json(makeGroupPage([]));
      }),
    );

    renderHookWithQueryClient(() => useMemoGroups("reading"));

    await waitFor(() => expect(type).toBe("reading"));
  });

  it("종류가 바뀌면 처음부터 다시 불러온다 (다른 종류의 목록과 섞이지 않는다)", async () => {
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        const type = new URL(request.url).searchParams.get("targetType");
        return HttpResponse.json(makeGroupPage([g(type ?? "all")]));
      }),
    );
    const props: { type?: "post" } = {};
    const { result, rerender } = renderHookWithQueryClient(() => useMemoGroups(props.type));
    await waitFor(() => expect(result.current.groups.map((x) => x.targetId)).toEqual(["all"]));

    props.type = "post";
    rerender();

    await waitFor(() => expect(result.current.groups.map((x) => x.targetId)).toEqual(["post"]));
  });

  it("불러오기에 실패하면 isError가 true이고 groups는 비어 있다", async () => {
    server.use(http.get(MEMO_GROUPS_URL, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useMemoGroups());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.groups).toEqual([]);
  });
});
