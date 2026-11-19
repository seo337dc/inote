import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { MEMOS_URL } from "@/test/fixtures/memo";
import { makePost } from "@/test/fixtures/posts";
import { renderWithQueryClient as render } from "@/test/render";
import { resetViewport, setViewport } from "@/test/viewport";
import { useSession } from "@/shared/lib/auth-client";
import { useSlotActions } from "@/shared/lib/slot-actions";
import WritePostForm from "./WritePostForm";

// 에디터까지 렌더하는 무거운 화면이라 전체 테스트를 병렬로 돌릴 때 기본 5초를 넘기기도 한다(5.9초 관측) — 이 파일만 늘린다
vi.setConfig({ testTimeout: 15_000 });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
// 드래그·리사이즈는 jsdom에서 재현할 수 없어 껍데기로 대체
vi.mock("react-rnd", () => ({
  Rnd: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(resetViewport);

beforeEach(() => {
  setViewport(true);
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1" } },
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
  server.use(
    http.get(`${TEST_API_URL}/api/v1/blog/posts/p1`, () =>
      HttpResponse.json(makePost("p1", { title: "제목", content: "<p>내용</p>", isPrivate: false })),
    ),
    http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json([])),
    http.get(MEMOS_URL, () => HttpResponse.json([])),
  );
});

// 글을 불러와 제목이 채워지고 "저장"이 눌릴 때까지 기다린다
async function renderLoaded() {
  render(<WritePostForm id="p1" />);
  await waitFor(() => expect(screen.getByPlaceholderText("제목")).toHaveValue("제목"));
  const save = screen.getByRole("button", { name: "저장" });
  await waitFor(() => expect(save).toBeEnabled());
  return save;
}

describe("WritePostForm — 메모 버튼과 출간 설정 화면", () => {
  it("글을 불러오면 상단 바에 메모 버튼이 보인다", async () => {
    await renderLoaded();

    expect(screen.getByRole("button", { name: "메모" })).toBeInTheDocument();
  });

  it("'저장'을 눌러 출간 설정 화면이 열려 있는 동안에는 메모 버튼이 숨겨진다", async () => {
    const save = await renderLoaded();

    await userEvent.click(save);

    const publish = await screen.findByRole("dialog", { name: "저장 설정" });
    expect(publish).not.toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();
  });

  it("출간 설정 화면을 '취소'로 닫으면 메모 버튼이 다시 보인다", async () => {
    const save = await renderLoaded();
    await userEvent.click(save);
    const publish = await screen.findByRole("dialog", { name: "저장 설정" });

    await userEvent.click(within(publish).getByRole("button", { name: "취소" }));

    expect(await screen.findByRole("button", { name: "메모" })).toBeInTheDocument();
  });

  it("메모장이 열린 채 '저장'으로 출간 설정 화면이 덮이면, 첫 Esc는 출간 설정 화면을 닫고 다음 Esc가 메모장을 닫는다 (앞에 있는 것부터)", async () => {
    const save = await renderLoaded();
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    await screen.findByRole("dialog", { name: "메모" });
    await userEvent.click(save);
    const publish = await screen.findByRole("dialog", { name: "저장 설정" });
    expect(publish).not.toHaveAttribute("aria-hidden", "true");

    await userEvent.keyboard("{Escape}");

    // 닫힌 출간 설정 화면은 aria-hidden이라 이름으로는 못 찾는다 — 앞에서 잡아 둔 요소로 확인
    await waitFor(() => expect(publish).toHaveAttribute("aria-hidden", "true"));
    expect(screen.getByRole("dialog", { name: "메모" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "메모" })).not.toBeInTheDocument();
  });

  it("좁은 화면: 메모장이 열린 채 왼쪽 '글 설정' 시트를 열면, 첫 Esc는 시트를 닫고 다음 Esc가 메모장을 닫는다", async () => {
    setViewport(false);
    render(
      <>
        <WritePostForm id="p1" />
        <SlotProbe slot="dock" prefix="도크" />
        <SlotProbe slot="header-left" prefix="헤더" />
      </>,
    );
    await waitFor(() => expect(screen.getByPlaceholderText("제목")).toHaveValue("제목"));
    await userEvent.click(await screen.findByRole("button", { name: "도크:메모" }));
    await screen.findByRole("dialog", { name: "메모" });
    await userEvent.click(await screen.findByRole("button", { name: "헤더:글 설정" }));
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull());
    expect(screen.getByRole("dialog", { name: "메모" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "메모" })).not.toBeInTheDocument());
  });
});

// 모바일 헤더·도크가 하는 일: 슬롯에 등록된 버튼을 그린다
function SlotProbe({ slot, prefix }: { slot: "dock" | "header-left"; prefix: string }) {
  const actions = useSlotActions(slot);
  return (
    <>
      {actions.map((a) => (
        <button key={a.id} type="button" onClick={a.onClick}>
          {prefix}:{a.label}
        </button>
      ))}
    </>
  );
}
