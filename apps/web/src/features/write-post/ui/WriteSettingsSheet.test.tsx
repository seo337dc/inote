import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildCategoryTree, type Category } from "@/entities/category";
import { useSlotActions } from "@/shared/lib/slot-actions";
import WriteSettingsSheet from "./WriteSettingsSheet";

function category(id: string, name: string): Category {
  return {
    id,
    userId: "u1",
    name,
    parentId: null,
    depth: 1,
    position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

// 모바일 헤더가 하는 일: header-left 슬롯의 버튼을 그린다
function HeaderProbe() {
  const actions = useSlotActions("header-left");
  return (
    <header>
      {actions.map((a) => (
        <button key={a.id} type="button" onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </header>
  );
}

function setup() {
  const onCategoryChange = vi.fn();
  const onPrivateChange = vi.fn();
  const view = render(
    <>
      <HeaderProbe />
      <WriteSettingsSheet
        categories={buildCategoryTree([category("1", "학습"), category("2", "운동")])}
        categoryId="1"
        onCategoryChange={onCategoryChange}
        isPrivate={false}
        onPrivateChange={onPrivateChange}
      />
    </>,
  );
  return { user: userEvent.setup(), onCategoryChange, onPrivateChange, ...view };
}

describe("WriteSettingsSheet (모바일 글 설정 시트)", () => {
  it("마운트되면 헤더 왼쪽 슬롯에 '글 설정' 버튼을 등록하고, 언마운트하면 해제한다", () => {
    const { unmount } = setup();
    expect(screen.getByRole("button", { name: "글 설정" })).toBeInTheDocument();

    unmount();
    render(<HeaderProbe />);
    expect(screen.queryByRole("button", { name: "글 설정" })).toBeNull();
  });

  it("처음에는 닫혀 있고, 헤더 버튼을 누르면 공개 설정·카테고리가 든 시트가 열린다", async () => {
    const { user } = setup();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "글 설정" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("글 설정");
    expect(screen.getByRole("button", { name: "전체 공개" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "운동" })).toBeInTheDocument();
  });

  it("카테고리·공개 설정을 골라도 시트가 자동으로 닫히지 않는다", async () => {
    const { user, onCategoryChange, onPrivateChange } = setup();
    await user.click(screen.getByRole("button", { name: "글 설정" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "운동" }));
    await user.click(screen.getByRole("button", { name: "비공개" }));

    expect(onCategoryChange).toHaveBeenCalledWith("2");
    expect(onPrivateChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Esc와 닫기 버튼으로 닫힌다", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "글 설정" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "글 설정" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
