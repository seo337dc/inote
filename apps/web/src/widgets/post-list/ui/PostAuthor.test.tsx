import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PostAuthor from "./PostAuthor";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function loginAs(userId: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: userId ? { user: { id: userId } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

const POST = { userId: "u1", user: { name: "서동찬", email: "a@a.com" } };

describe("PostAuthor", () => {
  beforeEach(() => loginAs(null));

  it("로그인 전이면 그 작성자의 공개 글 목록(/users/[id])으로 연결한다", () => {
    render(<PostAuthor post={POST} />);

    expect(screen.getByRole("link", { name: "서동찬 (a@a.com)" })).toHaveAttribute("href", "/users/u1");
  });

  it("로그인한 사용자가 자기 글의 작성자를 누르면 '나의 글'(/my-posts)로 연결한다", () => {
    loginAs("u1");
    render(<PostAuthor post={POST} />);

    expect(screen.getByRole("link", { name: "서동찬 (a@a.com)" })).toHaveAttribute("href", "/my-posts");
  });

  it("로그인했어도 다른 사람의 글이면 그 사람의 목록(/users/[id])으로 연결한다", () => {
    loginAs("me");
    render(<PostAuthor post={POST} />);

    expect(screen.getByRole("link", { name: "서동찬 (a@a.com)" })).toHaveAttribute("href", "/users/u1");
  });

  it("작성자 정보가 없으면 '작성자 없음'을 링크 없이 보여준다", () => {
    loginAs("u1");
    render(<PostAuthor post={{ userId: null, user: null }} />);

    expect(screen.getByText("작성자 없음")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("작성자 id가 없으면(탈퇴 등) 이름은 보여주되 링크는 걸지 않는다 — 로그인 사용자의 id와 null이 같다고 보지 않는다", () => {
    loginAs("u1");
    render(<PostAuthor post={{ userId: null, user: { name: "서동찬", email: "a@a.com" } }} />);

    expect(screen.getByText("서동찬 (a@a.com)")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
