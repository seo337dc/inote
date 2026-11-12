import { describe, expect, it } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createTestQueryClient, renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL } from "@/test/fixtures/memo";
import { sleep } from "@/test/sleep";
import { useMemoDraft } from "./useMemoDraft";

// 일반 메모(general)도 글·독서 메모와 같은 방식으로 불러오고 자동저장한다 — 요청에 targetId만 빠진다
describe("useMemoDraft — 일반 메모", () => {
  it("targetType=general로 불러오고, 첫 입력 때 targetId 없이 POST한다", async () => {
    let getSearch: URLSearchParams | undefined;
    let postBody: unknown;
    server.use(
      http.get(MEMOS_URL, ({ request }) => {
        getSearch = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
      http.post(MEMOS_URL, async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json(makeMemo({ id: "g1", targetType: "general", targetId: "", content: "홈에서 쓴 메모" }), { status: 201 });
      }),
    );
    const hook = renderHookWithQueryClient(() => useMemoDraft({ type: "general" }, { delayMs: 30 }), createTestQueryClient());
    await waitFor(() => expect(hook.result.current.ready).toBe(true));

    act(() => hook.result.current.setText("홈에서 쓴 메모"));
    await act(() => sleep(150));

    expect(getSearch?.get("targetType")).toBe("general");
    expect(getSearch?.has("targetId")).toBe(false);
    expect(postBody).toEqual({ targetType: "general", content: "홈에서 쓴 메모" });
  });
});
