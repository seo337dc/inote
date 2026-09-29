import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishScreen from "./PublishScreen";
import { renderWithQueryClient } from "@/test/render";
import { api } from "@/shared/lib/api";

const CATEGORIES = [
  { id: "c1", name: "학습", depth: 1 },
  { id: "c2", name: "React", depth: 2 },
  { id: "c3", name: "일기", depth: 1 },
];

// 상태를 실제로 들고 있어야 버튼을 눌렀을 때의 변화를 확인할 수 있어서 작은 래퍼를 둔다
function Harness({
  open = true,
  onClose = vi.fn(),
  initial = {},
}: {
  open?: boolean;
  onClose?: () => void;
  initial?: Partial<{ thumbnailUrl: string; category: string; isPrivate: boolean; pinned: boolean }>;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnailUrl ?? "");
  const [category, setCategory] = useState(initial.category ?? "학습");
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate ?? false);
  const [pinned, setPinned] = useState(initial.pinned ?? false);
  return (
    <>
      <form id="f" onSubmit={(e) => e.preventDefault()} />
      <PublishScreen
        open={open}
        onClose={onClose}
        formId="f"
        publishLabel="저장"
        isPublishing={false}
        error={null}
        title="내 글 제목"
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={setThumbnailUrl}
        category={category}
        onCategoryChange={setCategory}
        categories={CATEGORIES}
        isPrivate={isPrivate}
        onPrivateChange={setIsPrivate}
        pinned={pinned}
        onPinnedChange={setPinned}
      />
    </>
  );
}

describe("PublishScreen", () => {
  afterEach(() => vi.restoreAllMocks());

  it("열려 있으면 미리보기(제목)와 카테고리·공개 설정을 보여준다", () => {
    renderWithQueryClient(<Harness />);

    const dialog = screen.getByRole("dialog", { name: "저장 설정" });
    expect(dialog).not.toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("내 글 제목")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "카테고리" })).toHaveValue("학습");
    expect(screen.getByRole("button", { name: "전체 공개" })).toHaveAttribute("aria-pressed", "true");
  });

  it("닫혀 있으면 화면 밖으로 올라가 있고 접근할 수 없다", () => {
    renderWithQueryClient(<Harness open={false} />);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-hidden", "true");
    expect(dialog).toHaveClass("-translate-y-full");
    expect(dialog).toHaveAttribute("inert");
  });

  it("카테고리를 고르고 공개 설정·즐겨찾기를 바꿀 수 있다", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Harness />);

    await user.selectOptions(screen.getByRole("combobox", { name: "카테고리" }), "일기");
    await user.click(screen.getByRole("button", { name: "비공개" }));
    await user.click(screen.getByRole("button", { name: /즐겨찾기/ }));

    expect(screen.getByRole("combobox", { name: "카테고리" })).toHaveValue("일기");
    expect(screen.getByRole("button", { name: "비공개" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "전체 공개" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /즐겨찾기/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("취소 버튼이나 Esc로 닫는다", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQueryClient(<Harness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "취소" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("썸네일을 올리면 업로드된 이미지가 미리보기에 뜨고, 제거하면 사라진다", async () => {
    // jsdom의 File/FormData는 Node fetch와 호환되지 않아 실제 요청 대신 api.upload를 대체한다
    vi.spyOn(api, "upload").mockResolvedValue({ url: "https://r2.example/thumb.png" });
    const user = userEvent.setup();
    renderWithQueryClient(<Harness />);
    expect(screen.queryByAltText("썸네일 미리보기")).not.toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("썸네일 파일 선택"),
      new File(["x"], "thumb.png", { type: "image/png" }),
    );

    const img = await screen.findByAltText("썸네일 미리보기");
    expect(img).toHaveAttribute("src", "https://r2.example/thumb.png");

    await user.click(screen.getByRole("button", { name: "제거" }));
    expect(screen.queryByAltText("썸네일 미리보기")).not.toBeInTheDocument();
  });

  it("업로드가 실패하면 안내 문구를 보여주고 썸네일은 그대로 둔다", async () => {
    vi.spyOn(api, "upload").mockRejectedValue(new Error("too large"));
    const user = userEvent.setup();
    renderWithQueryClient(<Harness />);

    await user.upload(
      screen.getByLabelText("썸네일 파일 선택"),
      new File(["x"], "big.png", { type: "image/png" }),
    );

    await waitFor(() => expect(screen.getByText(/이미지 업로드에 실패했어요/)).toBeInTheDocument());
    expect(screen.queryByAltText("썸네일 미리보기")).not.toBeInTheDocument();
  });

  it("저장 버튼은 바깥 폼(formId)을 제출한다", () => {
    renderWithQueryClient(<Harness />);

    const submit = screen.getByRole("button", { name: "저장" });
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toHaveAttribute("form", "f");
  });
});
