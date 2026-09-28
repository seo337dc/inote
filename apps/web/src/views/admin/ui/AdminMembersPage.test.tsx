import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import AdminMembersPage from "./AdminMembersPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import type { AdminUser } from "../model/useAdminUsers";

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "user-1",
    name: "홍길동",
    nickname: null,
    email: "hong@example.com",
    role: "USER",
    usesInote: true,
    usesInoteMoney: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// 실제 BE(/admin/users?page=&pageSize=)처럼 page 파라미터에 따라 응답을 바꾸는
// 핸들러 — 프론트가 진짜로 올바른 page를 요청하는지까지 검증할 수 있다.
function mockPaginatedUsers(totalItems: number, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  server.use(
    http.get(`${TEST_API_URL}/api/v1/admin/users`, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page")) || 1;
      const start = (page - 1) * pageSize;
      const items = Array.from(
        { length: Math.max(0, Math.min(pageSize, totalItems - start)) },
        (_, i) => makeUser({ id: `user-${start + i + 1}`, name: `회원${start + i + 1}` }),
      );
      return HttpResponse.json({ items, total: totalItems, page, pageSize, totalPages });
    }),
  );
}

describe("AdminMembersPage", () => {
  it("회원 목록과 총 인원수를 보여준다", async () => {
    mockPaginatedUsers(2);
    renderWithQueryClient(<AdminMembersPage />);

    expect(await screen.findByText("회원1")).toBeInTheDocument();
    expect(screen.getByText("회원2")).toBeInTheDocument();
    expect(screen.getByText("총 2명")).toBeInTheDocument();
  });

  it("회원이 없으면 안내 문구를 보여준다", async () => {
    mockPaginatedUsers(0);
    renderWithQueryClient(<AdminMembersPage />);

    expect(await screen.findByText("회원이 없습니다.")).toBeInTheDocument();
  });

  it("목록 조회가 실패하면 에러 문구를 보여준다", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/v1/admin/users`, () => {
        return HttpResponse.json({ message: "Internal Server Error" }, { status: 500 });
      }),
    );
    renderWithQueryClient(<AdminMembersPage />);

    expect(
      await screen.findByText("회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."),
    ).toBeInTheDocument();
  });

  it("첫 페이지에서는 이전 버튼이 비활성화된다", async () => {
    mockPaginatedUsers(25, 20); // 2페이지 분량
    renderWithQueryClient(<AdminMembersPage />);

    await screen.findByText("회원1");
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("마지막 페이지로 이동하면 다음 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    mockPaginatedUsers(25, 20); // 2페이지 분량
    renderWithQueryClient(<AdminMembersPage />);

    await screen.findByText("회원1");
    await user.click(screen.getByRole("button", { name: "다음" }));

    await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
    expect(await screen.findByText("회원21")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이전" })).toBeEnabled();
  });

  it("행을 클릭하면 상세 모달이 열린다", async () => {
    const user = userEvent.setup();
    mockPaginatedUsers(1);
    renderWithQueryClient(<AdminMembersPage />);

    const row = (await screen.findByText("회원1")).closest("tr");
    if (!row) throw new Error("행을 찾지 못했습니다");

    server.use(
      http.get(`${TEST_API_URL}/api/v1/admin/users/user-1`, () => {
        return HttpResponse.json({
          ...makeUser({ id: "user-1", name: "회원1" }),
          emailVerified: true,
          phone: null,
          image: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        });
      }),
    );

    await user.click(within(row).getByText("회원1"));

    expect(await screen.findByText("앱 이용 현황")).toBeInTheDocument();
  });
});
