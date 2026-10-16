import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CategoryBreadcrumb from "./CategoryBreadcrumb";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const mockedUseSession = vi.mocked(useSession);

function loginAs(userId: string | null) {
  mockedUseSession.mockReturnValue({
    data: userId ? { user: { id: userId } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

const STUDY = { id: "c1", name: "학습" };
const AI = { id: "c2", name: "AI" };
const AI_POST = { category: "AI", categoryId: "c2", categoryPath: [STUDY, AI], userId: "u1" };

describe("CategoryBreadcrumb", () => {
  beforeEach(() => loginAs("u1"));

  describe("작성자 본인이 볼 때", () => {
    it("경로를 '학습 > AI'처럼 위에서 아래 순서로 링크로 보여준다", () => {
      render(<CategoryBreadcrumb post={AI_POST} />);

      const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
      expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["학습", "AI"]);
    });

    it("각 이름은 그 카테고리의 '나의 글' 목록으로 가는 링크다 (상위 카테고리도 따로 눌러 갈 수 있다)", () => {
      render(<CategoryBreadcrumb post={AI_POST} />);

      expect(screen.getByRole("link", { name: "학습" })).toHaveAttribute("href", "/my-posts?categoryId=c1");
      expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/my-posts?categoryId=c2");
    });

    it("링크는 이름이 아니라 id로 건다 — 이름에 특수문자가 있어도 주소가 깨지지 않는다", () => {
      render(
        <CategoryBreadcrumb
          post={{ category: "C&C 기록", categoryId: "c&c 1", categoryPath: [{ id: "c&c 1", name: "C&C 기록" }], userId: "u1" }}
        />,
      );

      expect(screen.getByRole("link", { name: "C&C 기록" })).toHaveAttribute("href", "/my-posts?categoryId=c%26c%201");
    });

    it("경로 단계가 3개여도 모두 순서대로 링크가 된다", () => {
      render(<CategoryBreadcrumb post={{ category: "RAG", categoryId: "c3", categoryPath: [STUDY, AI, { id: "c3", name: "RAG" }], userId: "u1" }} />);

      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습", "AI", "RAG"]);
    });

    it("경로를 못 받으면(없음·빈 배열) 카테고리 이름 하나만 링크로 보여준다", () => {
      const { unmount } = render(<CategoryBreadcrumb post={{ category: "학습", categoryId: "c1", userId: "u1" }} />);
      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
      unmount();

      render(<CategoryBreadcrumb post={{ category: "학습", categoryId: "c1", categoryPath: [], userId: "u1" }} />);
      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
    });

    it("같은 이름이 경로에 두 번 나와도(다른 부모 아래) 둘 다 그리고, 각각 자기 id로 간다", () => {
      render(
        <CategoryBreadcrumb
          post={{
            category: "AI",
            categoryId: "inner",
            categoryPath: [
              { id: "outer", name: "AI" },
              { id: "inner", name: "AI" },
            ],
            userId: "u1",
          }}
        />,
      );

      expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
        "/my-posts?categoryId=outer",
        "/my-posts?categoryId=inner",
      ]);
    });

    it("아직 카테고리가 지정되지 않은 글(id 없음)은 이름만 글자로 보여주고 링크는 없다", () => {
      render(<CategoryBreadcrumb post={{ category: "AI", categoryId: null, userId: "u1" }} />);

      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("AI")).toBeInTheDocument();
    });
  });

  describe("다른 사람이 보거나 로그인 전이면", () => {
    it("다른 사용자의 글이면 경로를 글자로만 보여주고 링크는 없다", () => {
      loginAs("other");
      render(<CategoryBreadcrumb post={AI_POST} />);

      const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
      expect(within(nav).queryByRole("link")).toBeNull();
      expect(nav).toHaveTextContent("학습");
      expect(nav).toHaveTextContent("AI");
    });

    it("로그인 전이면 링크 없이 글자로만 보여준다", () => {
      loginAs(null);
      render(<CategoryBreadcrumb post={AI_POST} />);

      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("학습")).toBeInTheDocument();
    });

    it("작성자가 없는 글(탈퇴)은 로그인해도 링크가 없다", () => {
      render(<CategoryBreadcrumb post={{ category: "AI", categoryId: "c2", categoryPath: [STUDY, AI], userId: null }} />);

      expect(screen.queryByRole("link")).toBeNull();
    });
  });

  it("카테고리가 비어 있고 경로도 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<CategoryBreadcrumb post={{ category: "", categoryId: null, userId: "u1" }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
