import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import ArchivePostButton from "./ArchivePostButton";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useSession } from "@/shared/lib/auth-client";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function setSession(userId: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: userId ? { user: { id: userId } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

describe("ArchivePostButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("u1");
  });

  it("작성자가 아니면 버튼이 없다", () => {
    setSession("u2");
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived={false} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("로그인하지 않았으면 버튼이 없다", () => {
    setSession(null);
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived={false} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("작성자에게는 보관 상태에 맞는 이름의 버튼이 보인다", () => {
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived={false} />);
    expect(screen.getByRole("button", { name: "보관함으로 옮기기" })).toBeInTheDocument();
  });

  it("보관한 글이면 [보관 해제] 버튼이다", () => {
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived />);

    expect(screen.getByRole("button", { name: "보관 해제" })).toBeInTheDocument();
  });

  it("누르면 이 글의 id 하나로 archive를 부르고 버튼이 [보관 해제]로 바뀐다", async () => {
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ archivedIds: ["p1"] });
      }),
    );
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived={false} />);

    await userEvent.click(screen.getByRole("button", { name: "보관함으로 옮기기" }));

    await screen.findByRole("button", { name: "보관 해제" });
    expect(body).toEqual({ ids: ["p1"] });
    expect(refresh).toHaveBeenCalled();
  });

  it("서버가 건너뛰어 처리된 글이 없으면(발행 전 글 등) 상태를 바꾸지 않고 안내한다", async () => {
    server.use(http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, () => HttpResponse.json({ archivedIds: [] })));
    renderWithQueryClient(<ArchivePostButton postId="p1" authorId="u1" initialArchived={false} />);

    await userEvent.click(screen.getByRole("button", { name: "보관함으로 옮기기" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "보관함으로 옮기기" })).toBeInTheDocument();
  });
});
