import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import AdminEmbeddingsPage from "./AdminEmbeddingsPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import type {
  AdminEmbeddingItem,
  AdminEmbeddingsPage as EmbeddingsPageResponse,
  EmbeddingStatus,
} from "../model/useAdminEmbeddings";

function makeItem(overrides: Partial<AdminEmbeddingItem> = {}): AdminEmbeddingItem {
  return {
    postId: "post-1",
    title: "Docker - Volume",
    category: "DevOps",
    isPrivate: false,
    isArchived: false,
    isPublished: true,
    lastEditedAt: "2026-11-01T00:00:00.000Z",
    status: "done",
    chunkCount: 4,
    embeddedAt: "2026-11-04T06:52:00.000Z",
    job: null,
    ...overrides,
  };
}

// 실제 BE처럼 status 탭 값과 page 파라미터에 따라 응답하는 가짜 API — 프론트가 올바른 쿼리를
// 보내는지(탭 이동 시 첫 페이지로 돌아가는지 포함)까지 검증할 수 있다. 요청 기록은 requests에 남는다.
const FILTER_GROUPS: Record<string, EmbeddingStatus[] | null> = {
  all: null,
  incomplete: ["incomplete", "outdated", "pending", "processing"],
  failed: ["failed"],
  done: ["done"],
  excluded: ["excluded"],
};

function mockEmbeddingsApi(
  all: AdminEmbeddingItem[],
  options: { pageSize?: number; aiAvailable?: boolean; embedderReachable?: boolean } = {},
) {
  const { pageSize = 20, aiAvailable = true, embedderReachable = true } = options;
  const requests: { page: number; status: string }[] = [];

  server.use(
    http.get(`${TEST_API_URL}/api/v1/admin/embeddings`, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page")) || 1;
      const status = url.searchParams.get("status") ?? "all";
      requests.push({ page, status });

      const group = FILTER_GROUPS[status];
      const matched = group ? all.filter((i) => group.includes(i.status)) : all;
      const start = (page - 1) * pageSize;
      const count = (s: EmbeddingStatus[]) => all.filter((i) => s.includes(i.status)).length;
      const body: EmbeddingsPageResponse = {
        items: matched.slice(start, start + pageSize),
        total: matched.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(matched.length / pageSize)),
        summary: {
          eligible: all.filter((i) => i.status !== "excluded").length,
          excluded: count(["excluded"]),
          counts: aiAvailable
            ? {
                done: count(["done"]),
                incomplete: count(["incomplete"]),
                outdated: count(["outdated"]),
                pending: count(["pending"]),
                processing: count(["processing"]),
                failed: count(["failed"]),
              }
            : null,
        },
        embedder: { reachable: embedderReachable },
        aiAvailable,
      };
      return HttpResponse.json(body);
    }),
  );
  return requests;
}

// 요약 카드의 숫자 칸(<dd>) — 탭·배지에도 같은 글자("완료")가 있어서 <dt>로 라벨을 찾는다.
function cardValue(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;
}

describe("AdminEmbeddingsPage", () => {
  it("글 목록과 상태 배지·조각 수·임베딩 시각을 보여준다", async () => {
    mockEmbeddingsApi([
      makeItem({ postId: "a", title: "완료된 글", status: "done", chunkCount: 4 }),
      makeItem({ postId: "b", title: "아직 안 한 글", status: "incomplete", chunkCount: 0, embeddedAt: null }),
    ]);
    renderWithQueryClient(<AdminEmbeddingsPage />);

    expect(await screen.findByText("완료된 글")).toBeInTheDocument();
    expect(screen.getByText("아직 안 한 글")).toBeInTheDocument();
    expect(screen.getAllByText("완료").some((el) => el.tagName === "SPAN")).toBe(true);
    expect(screen.getByText("미완료", { selector: "span.rounded-full" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/2026\. 11\. 4\./)).toBeInTheDocument();
  });

  it("요약 카드는 페이지가 아니라 전체 글 기준이고, 미완료는 아직 끝나지 않은 상태를 모두 합친다", async () => {
    mockEmbeddingsApi(
      [
        makeItem({ postId: "1", status: "done" }),
        makeItem({ postId: "2", status: "incomplete" }),
        makeItem({ postId: "3", status: "outdated" }),
        makeItem({ postId: "4", status: "pending" }),
        makeItem({ postId: "5", status: "processing" }),
        makeItem({ postId: "6", status: "failed" }),
        makeItem({ postId: "7", status: "excluded", isPrivate: true }),
      ],
      { pageSize: 2 }, // 한 페이지에는 2건만 보여도 요약은 전체 기준이어야 한다
    );
    renderWithQueryClient(<AdminEmbeddingsPage />);

    await screen.findByText("대상 글", { selector: "dt" });
    expect(cardValue("대상 글").textContent).toBe("6");
    expect(cardValue("완료").textContent).toBe("1");
    expect(cardValue("미완료").textContent).toBe("4"); // incomplete + outdated + pending + processing
    expect(cardValue("실패").textContent).toBe("1");
    expect(cardValue("대상 아님").textContent).toBe("1");
  });

  it("실패가 있을 때만 실패 카드의 숫자를 빨간색으로 강조한다", async () => {
    mockEmbeddingsApi([makeItem({ postId: "1", status: "failed" })]);
    const { unmount } = renderWithQueryClient(<AdminEmbeddingsPage />);
    await screen.findByText("실패", { selector: "dt" });
    expect(cardValue("실패")).toHaveClass("text-red-600");
    unmount();

    mockEmbeddingsApi([makeItem({ postId: "1", status: "done" })]);
    renderWithQueryClient(<AdminEmbeddingsPage />);
    await screen.findByText("실패", { selector: "dt" });
    expect(cardValue("실패")).not.toHaveClass("text-red-600");
  });

  it("임베딩 서버가 연결돼 있으면 '연결됨', 아니면 '연결 안 됨'을 보여준다", async () => {
    mockEmbeddingsApi([makeItem()], { embedderReachable: true });
    const { unmount } = renderWithQueryClient(<AdminEmbeddingsPage />);
    expect(await screen.findByText("임베딩 서버 연결됨")).toBeInTheDocument();
    unmount();

    mockEmbeddingsApi([makeItem()], { embedderReachable: false });
    renderWithQueryClient(<AdminEmbeddingsPage />);
    expect(await screen.findByText("임베딩 서버 연결 안 됨")).toBeInTheDocument();
  });

  it("관리 서버(inote-ai)가 응답하지 않아도 글 목록은 보이고 상태만 '확인 불가'로 보여준다", async () => {
    mockEmbeddingsApi(
      [
        makeItem({ postId: "a", title: "글 A", status: "unknown", chunkCount: 0, embeddedAt: null }),
        makeItem({ postId: "b", title: "비공개 글", status: "excluded", isPrivate: true }),
      ],
      { aiAvailable: false, embedderReachable: false },
    );
    renderWithQueryClient(<AdminEmbeddingsPage />);

    expect(await screen.findByText("글 A")).toBeInTheDocument();
    expect(screen.getByText("확인 불가")).toBeInTheDocument();
    expect(screen.getByText("임베딩 상태를 가져오지 못했습니다. 글 목록만 표시합니다.")).toBeInTheDocument();
    // 상태를 모르는 카드는 0이 아니라 "-"로 보여야 한다(0이라고 단정하면 안 된다). 대상 글·대상 아님은 BE가 알 수 있어 숫자 그대로.
    expect(cardValue("완료").textContent).toBe("-");
    expect(cardValue("미완료").textContent).toBe("-");
    expect(cardValue("실패").textContent).toBe("-");
    expect(cardValue("대상 글").textContent).toBe("1");
    expect(cardValue("대상 아님").textContent).toBe("1");
    // 서버 상태를 모르는데 "연결 안 됨"이라고 단정하면 안 된다
    expect(screen.queryByText("임베딩 서버 연결 안 됨")).not.toBeInTheDocument();
    expect(screen.queryByText("임베딩 서버 연결됨")).not.toBeInTheDocument();
  });

  it("관리 서버 응답이 없는 상태에서 상태 탭의 결과가 비면 이유를 알려준다", async () => {
    const user = userEvent.setup();
    mockEmbeddingsApi([makeItem({ status: "unknown" })], { aiAvailable: false });
    renderWithQueryClient(<AdminEmbeddingsPage />);
    await screen.findByText("Docker - Volume");

    await user.click(screen.getByRole("tab", { name: "실패" }));

    expect(await screen.findByText("상태를 확인할 수 없어 이 탭은 볼 수 없습니다.")).toBeInTheDocument();
  });

  it("글이 없으면 안내 문구를 보여준다", async () => {
    mockEmbeddingsApi([]);
    renderWithQueryClient(<AdminEmbeddingsPage />);

    expect(await screen.findByText("해당하는 글이 없습니다.")).toBeInTheDocument();
  });

  it("목록 조회가 실패하면 에러 문구를 보여준다", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/v1/admin/embeddings`, () => {
        return HttpResponse.json({ message: "Internal Server Error" }, { status: 500 });
      }),
    );
    renderWithQueryClient(<AdminEmbeddingsPage />);

    expect(
      await screen.findByText("임베딩 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."),
    ).toBeInTheDocument();
  });

  it("상태 탭을 누르면 그 상태로 다시 조회하고 그 상태의 글만 보여준다", async () => {
    const user = userEvent.setup();
    const requests = mockEmbeddingsApi([
      makeItem({ postId: "a", title: "완료된 글", status: "done" }),
      makeItem({ postId: "b", title: "실패한 글", status: "failed", job: { status: "failed", attempts: 3, lastError: "오류" } }),
    ]);
    renderWithQueryClient(<AdminEmbeddingsPage />);
    await screen.findByText("완료된 글");
    expect(requests.at(-1)).toEqual({ page: 1, status: "all" });

    await user.click(screen.getByRole("tab", { name: "실패" }));

    await waitFor(() => expect(requests.at(-1)).toEqual({ page: 1, status: "failed" }));
    expect(await screen.findByText("실패한 글")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("완료된 글")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "실패" })).toHaveAttribute("aria-selected", "true");
  });

  it("2페이지에서 탭을 바꾸면 첫 페이지부터 다시 조회한다", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 25 }, (_, i) => makeItem({ postId: `p${i}`, title: `글${i + 1}` }));
    const requests = mockEmbeddingsApi(items, { pageSize: 20 });
    renderWithQueryClient(<AdminEmbeddingsPage />);
    await screen.findByText("글1");

    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(requests.at(-1)).toEqual({ page: 2, status: "all" }));

    await user.click(screen.getByRole("tab", { name: "완료" }));

    await waitFor(() => expect(requests.at(-1)).toEqual({ page: 1, status: "done" }));
  });

  it("첫 페이지에서는 이전 버튼이, 마지막 페이지에서는 다음 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 25 }, (_, i) => makeItem({ postId: `p${i}`, title: `글${i + 1}` }));
    mockEmbeddingsApi(items, { pageSize: 20 });
    renderWithQueryClient(<AdminEmbeddingsPage />);

    await screen.findByText("글1");
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "다음" }));

    await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
    expect(await screen.findByText("글21")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이전" })).toBeEnabled();
  });

  it("실패한 글은 시도 횟수를 보여주고 실패 원인은 배지 툴팁에 담는다", async () => {
    mockEmbeddingsApi([
      makeItem({
        status: "failed",
        job: { status: "failed", attempts: 5, lastError: "임베딩 서비스 오류: 500을 돌려줬습니다" },
      }),
    ]);
    renderWithQueryClient(<AdminEmbeddingsPage />);

    expect(await screen.findByText("시도 5회")).toBeInTheDocument();
    expect(screen.getByText("실패", { selector: "span.rounded-full" })).toHaveAttribute(
      "title",
      "임베딩 서비스 오류: 500을 돌려줬습니다",
    );
  });

  it("공개 칸에는 임베딩 대상이 아닌 이유(임시저장·보관·비공개)가 보인다", async () => {
    mockEmbeddingsApi([
      makeItem({ postId: "1", title: "공개 글" }),
      makeItem({ postId: "2", title: "비공개 글", isPrivate: true, status: "excluded" }),
      makeItem({ postId: "3", title: "보관 글", isArchived: true, status: "excluded" }),
      makeItem({ postId: "4", title: "임시 글", isPublished: false, status: "excluded" }),
    ]);
    renderWithQueryClient(<AdminEmbeddingsPage />);

    const rowOf = async (title: string) => (await screen.findByText(title)).closest("tr") as HTMLElement;
    expect((await rowOf("공개 글")).textContent).toContain("공개");
    expect((await rowOf("비공개 글")).textContent).toContain("비공개");
    expect((await rowOf("보관 글")).textContent).toContain("보관");
    expect((await rowOf("임시 글")).textContent).toContain("임시저장");
  });
});
