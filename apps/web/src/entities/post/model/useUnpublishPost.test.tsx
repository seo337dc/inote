import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createTestQueryClient, renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost } from "@/test/fixtures/posts";
import { ApiError } from "@/shared/lib/api";
import { useUnpublishPost } from "./useUnpublishPost";
import { MY_DRAFTS_KEY, MY_POSTS_KEY, MY_POST_OUTLINE_KEY, POST_OUTLINE_KEY, USER_OUTLINE_KEY } from "./queryKeys";

// 계약: docs/todo/post-unpublish.md — POST /blog/posts/:id/unpublish (본인 글만, 응답은 글 상세 모양)
const URL = (id: string) => `${TEST_API_URL}/api/v1/blog/posts/${id}/unpublish`;

function setup() {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { ...renderHookWithQueryClient(() => useUnpublishPost(), client), invalidate };
}
const keysOf = (invalidate: ReturnType<typeof setup>["invalidate"]) => invalidate.mock.calls.map((call) => call[0]?.queryKey);

describe("useUnpublishPost", () => {
  it("글 id로 POST /blog/posts/:id/unpublish를 부르고, 서버가 돌려준 글(draft)을 반환한다", async () => {
    let called = false;
    server.use(
      http.post(URL("p1"), () => {
        called = true;
        return HttpResponse.json(makePost("p1", { publishedAt: null, lastEditedAt: null, pinned: false }));
      }),
    );
    const { result } = setup();

    let post;
    await act(async () => {
      post = await result.current.mutateAsync("p1");
    });

    expect(called).toBe(true);
    expect(post).toMatchObject({ id: "p1", publishedAt: null, lastEditedAt: null });
  });

  it("성공하면 나의 글·임시저장 목록·카테고리 트리·글 상세 캐시를 다시 불러오게 한다", async () => {
    server.use(http.post(URL("p1"), () => HttpResponse.json(makePost("p1", { publishedAt: null }))));
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync("p1");
    });

    const keys = keysOf(invalidate);
    // 글이 나의 글에서 빠지고 임시저장 목록에 생기며, 공개 목록·카테고리 개수·상세가 모두 바뀐다
    expect(keys).toContainEqual(MY_POSTS_KEY);
    expect(keys).toContainEqual(MY_DRAFTS_KEY);
    expect(keys).toContainEqual(MY_POST_OUTLINE_KEY);
    expect(keys).toContainEqual(POST_OUTLINE_KEY);
    expect(keys).toContainEqual(USER_OUTLINE_KEY);
    expect(keys).toContainEqual(["post-detail"]);
    expect(keys).toContainEqual(["post"]);
  });

  it("보관한 글이면 409(ApiError)로 실패하고 캐시를 건드리지 않는다", async () => {
    server.use(
      http.post(URL("p1"), () => HttpResponse.json({ message: "보관을 해제한 뒤 임시저장으로 바꿀 수 있습니다." }, { status: 409 })),
    );
    const { result, invalidate } = setup();

    act(() => result.current.mutate("p1"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(409);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("남의 글(403)·없는 글(404)도 오류 상태가 되고 캐시를 건드리지 않는다", async () => {
    server.use(
      http.post(URL("other"), () => HttpResponse.json({ message: "forbidden" }, { status: 403 })),
      http.post(URL("none"), () => HttpResponse.json({ message: "not found" }, { status: 404 })),
    );
    const { result, invalidate } = setup();

    act(() => result.current.mutate("other"));
    await waitFor(() => expect((result.current.error as ApiError | null)?.status).toBe(403));
    act(() => result.current.mutate("none"));
    await waitFor(() => expect((result.current.error as ApiError | null)?.status).toBe(404));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
