import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL } from "@/test/fixtures/memo";
import { useAllMemos } from "./useAllMemos";
import { MOCK_MEMOS, resetMockMemos } from "./mock";

afterEach(() => {
  vi.unstubAllEnvs();
  resetMockMemos();
});

describe("useAllMemos", () => {
  it("GET /memos(대상 지정 없이)로 내 메모 전체를 불러온다", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(MEMOS_URL, ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json([makeMemo({ id: "a" }), makeMemo({ id: "b" })]);
      }),
    );

    const { result } = renderHookWithQueryClient(() => useAllMemos());

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect([...search!.keys()]).toEqual([]);
  });

  it("NEXT_PUBLIC_MEMOS_MOCK=true면 서버를 부르지 않고 목 데이터를 돌려준다 (서버 API 전 UI 확인용)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK", "true");
    const requested = vi.fn();
    server.use(http.get(MEMOS_URL, () => (requested(), HttpResponse.json([]))));

    const { result } = renderHookWithQueryClient(() => useAllMemos());

    await waitFor(() => expect(result.current.data).toEqual(MOCK_MEMOS));
    expect(requested).not.toHaveBeenCalled();
  });

  it("목 데이터는 일반·글·독서 메모를 모두 담고 있다 (탭마다 화면을 확인할 수 있게)", () => {
    expect(new Set(MOCK_MEMOS.map((m) => m.targetType))).toEqual(new Set(["general", "post", "reading"]));
  });
});
