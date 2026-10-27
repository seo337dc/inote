import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { getMyPosts } from "./getMyPosts";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

// 요청한 쿼리를 그대로 돌려받아 확인하기 위한 핸들러 (BE 계약: page·pinnedPage·categoryId)
function captureRequest() {
  const captured: { url?: URL } = {};
  server.use(
    http.get(`${TEST_API_URL}/api/v1/blog/posts/mine`, ({ request }) => {
      captured.url = new URL(request.url);
      return HttpResponse.json({
        ...makePostListPage({ pinned: [makePost("p1")], pinnedTotal: 1, pinnedPage: 2 }),
        categoryCounts: {},
      });
    }),
  );
  return captured;
}

describe("getMyPosts", () => {
  it("전체 글 페이지와 고정 글 페이지를 각각 쿼리로 보낸다", async () => {
    const captured = captureRequest();

    await getMyPosts(3, 2, null);

    expect(captured.url?.searchParams.get("page")).toBe("3");
    expect(captured.url?.searchParams.get("pinnedPage")).toBe("2");
    expect(captured.url?.searchParams.has("categoryId")).toBe(false);
  });

  it("카테고리가 있으면 이름이 아니라 categoryId를 보낸다", async () => {
    const captured = captureRequest();

    await getMyPosts(1, 1, "c1");

    expect(captured.url?.searchParams.get("categoryId")).toBe("c1");
    expect(captured.url?.searchParams.has("category")).toBe(false);
  });

  it("보관함이면 archived=true를 보내고, 기본은 보내지 않는다 (나의 글은 보관한 글이 빠진다)", async () => {
    const captured = captureRequest();

    await getMyPosts(1, 1, null, null, true);
    expect(captured.url?.searchParams.get("archived")).toBe("true");

    await getMyPosts(1, 1, null);
    expect(captured.url?.searchParams.has("archived")).toBe(false);
  });

  it("응답의 고정 글 페이지 정보를 그대로 돌려준다", async () => {
    captureRequest();

    const data = await getMyPosts(1, 2, null);

    expect(data.pinnedPage).toBe(2);
    expect(data.pinned.map((p) => p.id)).toEqual(["p1"]);
  });
});
