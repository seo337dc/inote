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

const AI_POST = { category: "AI", categoryPath: ["학습", "AI"], userId: "u1" };

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

      expect(screen.getByRole("link", { name: "학습" })).toHaveAttribute(
        "href",
        `/my-posts?category=${encodeURIComponent("학습")}`,
      );
      expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/my-posts?category=AI");
    });

    it("공백·특수문자가 있는 이름도 주소에 안전하게 담는다", () => {
      render(<CategoryBreadcrumb post={{ category: "C&C 기록", categoryPath: ["C&C 기록"], userId: "u1" }} />);

      expect(screen.getByRole("link", { name: "C&C 기록" })).toHaveAttribute(
        "href",
        "/my-posts?category=C%26C%20%EA%B8%B0%EB%A1%9D",
      );
    });

    it("경로 단계가 3개여도 모두 순서대로 링크가 된다", () => {
      render(<CategoryBreadcrumb post={{ category: "RAG", categoryPath: ["학습", "AI", "RAG"], userId: "u1" }} />);

      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습", "AI", "RAG"]);
    });

    it("경로를 못 받으면(없음·빈 배열) 카테고리 이름 하나만 링크로 보여준다", () => {
      const { unmount } = render(<CategoryBreadcrumb post={{ category: "학습", userId: "u1" }} />);
      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
      unmount();

      render(<CategoryBreadcrumb post={{ category: "학습", categoryPath: [], userId: "u1" }} />);
      expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
    });

    it("같은 이름이 경로에 두 번 나와도(다른 부모 아래) 둘 다 그린다", () => {
      render(<CategoryBreadcrumb post={{ category: "AI", categoryPath: ["AI", "AI"], userId: "u1" }} />);

      expect(screen.getAllByRole("link")).toHaveLength(2);
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
      render(<CategoryBreadcrumb post={{ category: "AI", categoryPath: ["학습", "AI"], userId: null }} />);

      expect(screen.queryByRole("link")).toBeNull();
    });
  });

  it("카테고리가 비어 있고 경로도 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<CategoryBreadcrumb post={{ category: "", userId: "u1" }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
