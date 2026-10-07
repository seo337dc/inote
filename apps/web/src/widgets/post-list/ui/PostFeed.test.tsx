import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PostFeed from "./PostFeed";
import { makePost, makePostListPage } from "@/test/fixtures/posts";

function renderFeed(
  data = makePostListPage(),
  category: string | null = null,
  q: string | null = null,
) {
  return render(
    <PostFeed data={data} basePath="/" category={category} q={q} emptyMessage="비었어요" />,
  );
}

describe("PostFeed", () => {
  it("글이 하나도 없고 카테고리 필터도 없으면 빈 화면 안내를 보여준다", () => {
    renderFeed(makePostListPage({ total: 0 }));

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("고정 글이 없으면 고정 글 영역과 그 페이지네이션은 없고 전체 글 페이지네이션만 '1 / 1'로 보인다", () => {
    renderFeed(makePostListPage({ items: [makePost("a")], total: 1 }));

    expect(screen.queryByText("고정 글")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "고정 글 페이지 이동" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "전체 글 페이지 이동" });
    expect(within(nav).getByText("1 / 1")).toBeInTheDocument();
  });

  it("고정 글이 있으면 고정 글·전체 글 영역이 각각 자기 페이지네이션을 가진다", () => {
    renderFeed(
      makePostListPage({
        pinned: [makePost("p1", { pinned: true })],
        pinnedTotal: 1,
        items: [makePost("a")],
        total: 2,
      }),
    );

    expect(screen.getByText("고정 글")).toBeInTheDocument();
    expect(screen.getByText("전체 글")).toBeInTheDocument();
    const pinnedNav = screen.getByRole("navigation", { name: "고정 글 페이지 이동" });
    const allNav = screen.getByRole("navigation", { name: "전체 글 페이지 이동" });
    expect(within(pinnedNav).getByText("1 / 1")).toBeInTheDocument();
    expect(within(allNav).getByText("1 / 1")).toBeInTheDocument();
  });

  it("한쪽 영역을 넘겨도 다른 쪽 페이지가 주소에 유지된다", () => {
    renderFeed(
      makePostListPage({
        pinned: [makePost("p4", { pinned: true })],
        pinnedPage: 2,
        pinnedTotal: 4,
        pinnedTotalPages: 2,
        items: [makePost("a")],
        page: 3,
        totalPages: 5,
        total: 30,
      }),
    );

    const pinnedNav = screen.getByRole("navigation", { name: "고정 글 페이지 이동" });
    const allNav = screen.getByRole("navigation", { name: "전체 글 페이지 이동" });
    // 고정 글 이전 → pinnedPage 1(주소에서 생략), 전체 글은 page=3 유지
    expect(within(pinnedNav).getByRole("link", { name: "이전" })).toHaveAttribute("href", "/?page=3");
    // 전체 글 다음 → page=4, 고정 글은 pinnedPage=2 유지
    expect(within(allNav).getByRole("link", { name: "다음" })).toHaveAttribute(
      "href",
      "/?pinnedPage=2&page=4",
    );
  });

  it("고정 글 페이지 번호가 범위를 넘어 비어 있으면 안내 문구를 보여준다", () => {
    renderFeed(
      makePostListPage({
        pinned: [],
        pinnedPage: 9,
        pinnedTotal: 4,
        pinnedTotalPages: 2,
        items: [makePost("a")],
        total: 5,
      }),
    );

    expect(screen.getByText("이 페이지에는 고정 글이 없습니다.")).toBeInTheDocument();
  });

  it("카테고리 필터로 걸러 결과가 없으면 지정한 안내 문구를 보여준다", () => {
    renderFeed(makePostListPage({ total: 0 }), "이직");

    expect(screen.getByText("비었어요")).toBeInTheDocument();
  });

  it("검색 결과가 0개면 '첫 글' 빈 화면이 아니라 목록 안에 '검색 결과가 없습니다.'를 보여준다", () => {
    renderFeed(makePostListPage({ total: 0 }), null, "없는단어");

    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "전체 글 페이지 이동" })).toBeInTheDocument();
  });

  it("검색어는 페이지를 넘겨도 주소에 유지된다 (카테고리와 함께)", () => {
    renderFeed(
      makePostListPage({ items: [makePost("a")], page: 1, totalPages: 3, total: 25 }),
      "학습",
      "리액트",
    );

    const allNav = screen.getByRole("navigation", { name: "전체 글 페이지 이동" });
    expect(within(allNav).getByRole("link", { name: "다음" })).toHaveAttribute(
      "href",
      `/?category=${encodeURIComponent("학습")}&q=${encodeURIComponent("리액트")}&page=2`,
    );
  });

  it("emptyState를 주면 글이 하나도 없을 때 기본 '첫 글 쓰기' 화면 대신 그것을 보여준다", () => {
    render(
      <PostFeed
        data={makePostListPage({ total: 0 })}
        basePath="/users/u1"
        category={null}
        emptyState={<p>아직 공개된 글이 없어요.</p>}
      />,
    );

    expect(screen.getByText("아직 공개된 글이 없어요.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "글쓰기" })).toBeNull();
  });

  it("emptyState가 있어도 검색 결과가 0개면 목록 안에서 '검색 결과가 없습니다.'로 안내한다", () => {
    render(
      <PostFeed
        data={makePostListPage({ total: 0 })}
        basePath="/users/u1"
        category={null}
        q="없는말"
        emptyState={<p>아직 공개된 글이 없어요.</p>}
      />,
    );

    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("아직 공개된 글이 없어요.")).toBeNull();
  });
});
