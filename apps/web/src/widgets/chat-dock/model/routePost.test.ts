import { describe, expect, it } from "vitest";
import { getRoutePostIds } from "./routePost";

describe("getRoutePostIds", () => {
  it("/write/{id}는 글쓰기·수정 화면의 글 id를 돌려준다", () => {
    expect(getRoutePostIds("/write/abc123")).toEqual({ routePostId: "abc123", detailPostId: null });
  });

  it("새 글 화면(/write)에는 글 id가 없다", () => {
    expect(getRoutePostIds("/write")).toEqual({ routePostId: null, detailPostId: null });
  });

  it("예전 쿼리 주소는 pathname에 id가 없으므로 글로 취급하지 않는다", () => {
    // /write?id=abc 는 pathname이 "/write"라 위와 같다 (실제 이동은 페이지에서 새 주소로 redirect)
    expect(getRoutePostIds("/write").routePostId).toBeNull();
  });

  it("/posts/{id}는 상세 화면의 글 id를 돌려준다", () => {
    expect(getRoutePostIds("/posts/xyz")).toEqual({ routePostId: null, detailPostId: "xyz" });
  });

  it("하위 경로나 다른 화면은 글 id로 보지 않는다", () => {
    expect(getRoutePostIds("/write/abc/extra")).toEqual({ routePostId: null, detailPostId: null });
    expect(getRoutePostIds("/reading/abc")).toEqual({ routePostId: null, detailPostId: null });
  });
});
