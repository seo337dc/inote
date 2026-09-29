import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import PostEditor from "./PostEditor";

type ProseMirrorEl = HTMLElement & { editor: { commands: { insertContent: (c: string) => void } } };

async function findEditorEl(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  return container.querySelector(".ProseMirror") as ProseMirrorEl;
}

describe("PostEditor onUserEdit", () => {
  it("바깥에서 내려준 content를 불러올 때는 호출되지 않는다", async () => {
    const onUserEdit = vi.fn();
    const { container, rerender } = render(
      <PostEditor content="" onChange={vi.fn()} onUserEdit={onUserEdit} />,
    );
    await findEditorEl(container);

    rerender(<PostEditor content="<p>불러온 글</p>" onChange={vi.fn()} onUserEdit={onUserEdit} />);
    await waitFor(() => expect(container.textContent).toContain("불러온 글"));

    expect(onUserEdit).not.toHaveBeenCalled();
  });

  it("사용자가 직접 내용을 입력하면 호출된다 (포커스 여부와 무관)", async () => {
    const onUserEdit = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <PostEditor content="<p>기존</p>" onChange={onChange} onUserEdit={onUserEdit} />,
    );
    const el = await findEditorEl(container);

    act(() => {
      el.editor.commands.insertContent("추가 입력");
    });

    expect(onChange).toHaveBeenCalled();
    expect(onUserEdit).toHaveBeenCalled();
  });
});
