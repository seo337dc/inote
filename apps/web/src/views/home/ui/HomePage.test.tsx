import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import HomePage from "./HomePage";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

describe("HomePage", () => {
  it("주소의 page·pinnedPage·category·q(검색어)를 BE 요청에 그대로 실어 보내고, 두 영역을 그린다", async () => {
    let requested: URL | undefined;
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts`, ({ request }) => {
        requested = new URL(request.url);
        return HttpResponse.json(
          makePostListPage({
            pinned: [makePost("p1", { title: "고정된 글", pinned: true })],
            pinnedPage: 2,
            pinnedTotal: 4,
            pinnedTotalPages: 2,
            items: [makePost("a", { title: "일반 글" })],
            page: 3,
            totalPages: 3,
            total: 20,
          }),
        );
      }),
    );

    render(await HomePage({ category: "학습", page: 3, pinnedPage: 2, q: "리액트" }));

    expect(requested?.searchParams.get("page")).toBe("3");
    expect(requested?.searchParams.get("pinnedPage")).toBe("2");
    expect(requested?.searchParams.get("category")).toBe("학습");
    expect(requested?.searchParams.get("q")).toBe("리액트");
    expect(screen.getByText("고정된 글")).toBeInTheDocument();
    expect(screen.getByText("일반 글")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "고정 글 페이지 이동" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "전체 글 페이지 이동" })).toBeInTheDocument();
  });

  it("검색어가 없으면 BE 요청에 q를 넣지 않는다", async () => {
    let requested: URL | undefined;
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts`, ({ request }) => {
        requested = new URL(request.url);
        return HttpResponse.json(makePostListPage({ items: [makePost("a")], total: 1 }));
      }),
    );

    render(await HomePage({ category: null, page: 1, pinnedPage: 1, q: null }));

    expect(requested?.searchParams.has("q")).toBe(false);
  });
});
