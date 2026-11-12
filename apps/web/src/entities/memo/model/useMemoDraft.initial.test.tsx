import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createTestQueryClient, renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL } from "@/test/fixtures/memo";
import { useMemoDraft } from "./useMemoDraft";

// 메모 관리 화면에서 카드를 눌러 들어오면 그 메모 탭이 선택된 채로 열린다 (initialMemoId)
const LIST = [makeMemo({ id: "m1", content: "첫째" }), makeMemo({ id: "m2", content: "둘째" }), makeMemo({ id: "m3", content: "셋째" })];

function setup(initialMemoId?: string) {
  server.use(http.get(MEMOS_URL, () => HttpResponse.json(LIST)));
  return renderHookWithQueryClient(() => useMemoDraft({ type: "general" }, { initialMemoId }), createTestQueryClient());
}

describe("useMemoDraft — initialMemoId", () => {
  it("initialMemoId에 해당하는 메모 탭이 처음부터 선택돼 있다", async () => {
    const hook = setup("m2");
    await waitFor(() => expect(hook.result.current.ready).toBe(true));

    expect(hook.result.current.activeIndex).toBe(1);
    expect(hook.result.current.text).toBe("둘째");
  });

  it("목록에 없는 id면 첫 탭으로 연다", async () => {
    const hook = setup("nope");
    await waitFor(() => expect(hook.result.current.ready).toBe(true));

    expect(hook.result.current.activeIndex).toBe(0);
  });

  it("initialMemoId가 없으면 첫 탭이다 (기존 동작)", async () => {
    const hook = setup();
    await waitFor(() => expect(hook.result.current.ready).toBe(true));

    expect(hook.result.current.activeIndex).toBe(0);
    expect(hook.result.current.text).toBe("첫째");
  });
});
