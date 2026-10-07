import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import UserPostsPage from "./UserPostsPage";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

const AUTHOR = { id: "u1", name: "서동찬" };

// next/navigation의 notFound()가 던지는 에러 — 아무 에러가 아니라 "404"로 가는 에러인지 확인한다
const NOT_FOUND = { digest: expect.stringContaining("404") };

function mockList(data: object, onRequest?: (url: URL) => void) {
  server.use(
    http.get(`${TEST_API_URL}/api/v1/blog/posts`, ({ request }) => {
      onRequest?.(new URL(request.url));
      return HttpResponse.json(data);
    }),
  );
}

describe("UserPostsPage (작성자의 글 목록)", () => {
  it("주소의 userId·page·pinnedPage·q를 BE 요청에 실어 보내고, 작성자 이름을 제목으로 보여준다", async () => {
    let requested: URL | undefined;
    mockList(
      { ...makePostListPage({ items: [makePost("a", { title: "그 사람의 글" })], total: 12 }), author: AUTHOR },
      (url) => (requested = url),
    );

    render(await UserPostsPage({ userId: "u1", page: 3, pinnedPage: 2, q: "리액트" }));

    expect(requested?.searchParams.get("userId")).toBe("u1");
    expect(requested?.searchParams.get("page")).toBe("3");
    expect(requested?.searchParams.get("pinnedPage")).toBe("2");
    expect(requested?.searchParams.get("q")).toBe("리액트");
    expect(requested?.searchParams.has("category")).toBe(false);
    expect(screen.getByRole("heading", { name: "서동찬의 글" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "그 사람의 글" })).toHaveAttribute("href", "/posts/a");
  });

  it("검색어가 없으면 요청에 q를 넣지 않는다", async () => {
    let requested: URL | undefined;
    mockList({ ...makePostListPage({ items: [makePost("a")], total: 1 }), author: AUTHOR }, (url) => (requested = url));

    render(await UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: null }));

    expect(requested?.searchParams.has("q")).toBe(false);
  });

  it("글쓰기 버튼은 없고, 검색은 이 사람의 목록 주소로 보낸다", async () => {
    mockList({ ...makePostListPage({ items: [makePost("a")], total: 1 }), author: AUTHOR });

    render(await UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: null }));

    expect(screen.queryByRole("link", { name: "글쓰기" })).toBeNull();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/users/u1");
  });

  it("페이지네이션 링크도 이 사람의 목록 주소(/users/[id])를 쓴다", async () => {
    mockList({
      ...makePostListPage({ items: [makePost("a")], total: 30, page: 1, totalPages: 3 }),
      author: AUTHOR,
    });

    render(await UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: null }));

    const nav = screen.getByRole("navigation", { name: "전체 글 페이지 이동" });
    expect(within(nav).getByRole("link", { name: "다음" })).toHaveAttribute("href", "/users/u1?page=2");
  });

  it("공개된 글이 하나도 없으면 '아직 공개된 글이 없어요.'를 보여주고 첫 글 쓰기 안내는 없다", async () => {
    mockList({ ...makePostListPage({ total: 0 }), author: AUTHOR });

    render(await UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: null }));

    expect(screen.getByRole("heading", { name: "서동찬의 글" })).toBeInTheDocument();
    expect(screen.getByText("아직 공개된 글이 없어요.")).toBeInTheDocument();
    expect(screen.queryByText(/첫 시작/)).toBeNull();
  });

  it("검색 결과가 0개여도 작성자 이름은 그대로 보이고 '검색 결과가 없습니다.'를 안내한다", async () => {
    mockList({ ...makePostListPage({ total: 0 }), author: AUTHOR });

    render(await UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: "없는말" }));

    expect(screen.getByRole("heading", { name: "서동찬의 글" })).toBeInTheDocument();
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
  });

  it("없는 사용자(author: null)면 404 화면으로 보낸다", async () => {
    mockList({ ...makePostListPage({ total: 0 }), author: null });

    await expect(UserPostsPage({ userId: "nope", page: 1, pinnedPage: 1, q: null })).rejects.toMatchObject(NOT_FOUND);
  });

  it("BE가 아직 author를 안 보내면(필드 없음) 404로 본다", async () => {
    mockList(makePostListPage({ total: 0 }));

    await expect(UserPostsPage({ userId: "u1", page: 1, pinnedPage: 1, q: null })).rejects.toMatchObject(NOT_FOUND);
  });
});
