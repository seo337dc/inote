import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import PostSummarySection from "./PostSummarySection";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockedUseSession = vi.mocked(useSession);

function setUser(id: string | null) {
  mockedUseSession.mockReturnValue({
    data: id ? { user: { id } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

function renderSection(initialSummary = ["기존 요약"]) {
  return renderWithQueryClient(
    <PostSummarySection postId="p1" authorId="author" initialSummary={initialSummary} />,
  );
}

describe("PostSummarySection", () => {
  beforeEach(() => setUser("author"));

  it("작성자가 아니면 요약만 보여주고 설정 아이콘은 없다", () => {
    setUser("other");
    renderSection();

    expect(screen.getByText("기존 요약")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI 개요 설정" })).not.toBeInTheDocument();
  });

  it("작성자가 아니고 요약도 없으면 카드를 그리지 않는다", () => {
    setUser(null);
    const { container } = renderSection([]);

    expect(container).toBeEmptyDOMElement();
  });

  it("작성자는 다시 요약하기를 눌러 새 요약으로 바꿀 수 있다", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/p1/summarize`, () =>
        HttpResponse.json({ summary: ["새 요약"] }),
      ),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "AI 개요 설정" }));
    await user.click(screen.getByRole("button", { name: "AI 다시 요약하기" }));

    expect(await screen.findByText("새 요약")).toBeInTheDocument();
    expect(screen.queryByText("기존 요약")).not.toBeInTheDocument();
  });

  it("요약이 실패하면 기존 요약을 그대로 둔다", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/p1/summarize`, () =>
        HttpResponse.json({ message: "AI 요약에 실패했어요." }, { status: 502 }),
      ),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "AI 개요 설정" }));
    await user.click(screen.getByRole("button", { name: "AI 다시 요약하기" }));

    expect(await screen.findByText("기존 요약")).toBeInTheDocument();
  });

  it("요약이 아직 없는 글도 작성자에게는 카드가 보인다", () => {
    renderSection([]);

    expect(screen.getByText("아직 요약이 없어요.")).toBeInTheDocument();
  });
});
