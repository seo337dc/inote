import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildCategoryTree, type Category } from "@/entities/category";
import WriteSidePanel from "./WriteSidePanel";

function category(id: string, name: string, parentId: string | null, depth: number): Category {
  return {
    id,
    userId: "u1",
    name,
    parentId,
    depth,
    position: 0,
    createdAt: `2026-01-0${id}T00:00:00Z`,
    updatedAt: `2026-01-0${id}T00:00:00Z`,
  };
}

const tree = buildCategoryTree([
  category("1", "학습", null, 1),
  category("2", "AI", "1", 2),
  category("3", "운동", null, 1),
]);

function setup(props: Partial<React.ComponentProps<typeof WriteSidePanel>> = {}) {
  const onCategoryChange = vi.fn();
  const onPrivateChange = vi.fn();
  render(
    <WriteSidePanel
      categories={tree}
      category="학습"
      onCategoryChange={onCategoryChange}
      isPrivate={false}
      onPrivateChange={onPrivateChange}
      {...props}
    />,
  );
  return { onCategoryChange, onPrivateChange };
}

describe("WriteSidePanel", () => {
  it("카테고리를 폴더 트리로 보여주고 현재 카테고리를 선택 상태로 표시한다", () => {
    setup();
    expect(screen.getByRole("button", { name: "학습" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "AI" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "운동" })).toBeInTheDocument();
  });

  it("카테고리를 누르면 그 이름으로 바꾼다 (하위 카테고리 포함)", async () => {
    const { onCategoryChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "AI" }));
    expect(onCategoryChange).toHaveBeenCalledWith("AI");
  });

  it("하위가 있는 폴더는 접고 펼 수 있다", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "학습 접기" }));
    expect(screen.queryByRole("button", { name: "AI" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "학습 펼치기" }));
    expect(screen.getByRole("button", { name: "AI" })).toBeInTheDocument();
  });

  it("영역 전체를 접으면 목록이 가려지고, 다시 펼치면 보인다", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "글 설정 접기" }));
    expect(screen.getByRole("button", { name: "글 설정 펼치기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: "운동" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "글 설정 펼치기" }));
    expect(screen.getByRole("button", { name: "운동" })).toBeInTheDocument();
  });

  it("공개 설정에서 현재 값이 선택 상태로 보이고, 누르면 그 값으로 바꾼다", async () => {
    const { onPrivateChange } = setup({ isPrivate: true });
    expect(screen.getByRole("button", { name: "비공개" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "전체 공개" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await userEvent.click(screen.getByRole("button", { name: "전체 공개" }));
    expect(onPrivateChange).toHaveBeenCalledWith(false);
    await userEvent.click(screen.getByRole("button", { name: "비공개" }));
    expect(onPrivateChange).toHaveBeenCalledWith(true);
  });

  it("카테고리가 없으면 안내 문구를 보여준다", () => {
    setup({ categories: [], category: "" });
    expect(screen.getByText("카테고리가 없어요.")).toBeInTheDocument();
  });
});
