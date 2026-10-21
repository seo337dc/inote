import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import PostEditor from "./PostEditor";
import { api } from "@/shared/lib/api";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
// jsdom의 FormData/File이 Node fetch(MSW)와 맞지 않아 업로드 호출 자체를 대체한다 — 업로드 경로는 아래 테스트에서 확인
vi.mock("@/shared/lib/api", () => ({ api: { upload: vi.fn() } }));
const upload = vi.mocked(api.upload);

type Ed = {
  getHTML: () => string;
  state: { doc: { content: { size: number }; descendants: (f: (n: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => void) => void } };
  commands: { setTextSelection: (p: number) => void; setNodeSelection: (p: number) => void };
  view: { someProp: (name: string, f: (handler: (...args: unknown[]) => boolean) => unknown) => unknown };
};
type El = HTMLElement & { editor: Ed };

const TMP_URL = "https://cdn.example.com/tmp/post/u1/abc.png";

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  // jsdom에는 없는 미리보기 주소 API
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => vi.clearAllMocks());

async function setup(initial = "<p>앞</p><p>뒤</p>") {
  const { container } = render(<PostEditor content={initial} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  return { container, el };
}

const png = (size = 10) => new File([new Uint8Array(size)], "a.png", { type: "image/png" });

function paste(el: El, files: File[]) {
  const event = Object.assign(new Event("paste", { bubbles: true, cancelable: true }), {
    clipboardData: { files, getData: () => "" },
  });
  let handled = false;
  act(() => {
    handled = Boolean(el.editor.view.someProp("handlePaste", (h) => h(el.editor.view, event, null)));
  });
  return handled;
}

function imageNodes(el: El) {
  const nodes: Record<string, unknown>[] = [];
  el.editor.state.doc.descendants((n) => {
    if (n.type.name === "image") nodes.push(n.attrs);
  });
  return nodes;
}

describe("PostEditor 이미지 업로드", () => {
  it("붙여넣은 이미지를 커서 위치에 넣고, 올리기가 끝나면 tmp 주소로 바꾼다", async () => {
    upload.mockResolvedValue({ url: TMP_URL });
    const { el } = await setup();
    act(() => el.editor.commands.setTextSelection(2));

    expect(paste(el, [png()])).toBe(true);

    // 올리는 동안: 미리보기 노드 (저장 HTML에는 <img>가 나가지 않는다)
    expect(imageNodes(el)).toHaveLength(1);
    expect(el.editor.getHTML()).not.toContain("blob:");

    await waitFor(() => expect(el.editor.getHTML()).toContain(`src="${TMP_URL}"`));
    expect(upload).toHaveBeenCalledWith("/uploads/post-image", expect.any(File));
    expect(imageNodes(el)[0].uploadId).toBeNull();
    // 커서가 있던 "앞" 문단 다음, "뒤" 문단 앞이 아닌 위치에 들어갔는지(순서 확인)
    const html = el.editor.getHTML();
    expect(html.indexOf("앞")).toBeLessThan(html.indexOf("<img"));
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("뒤"));
  });

  it("올리기에 실패하면 이미지를 지우고 안내한다", async () => {
    upload.mockRejectedValue(new Error("fail"));
    const { el } = await setup();

    paste(el, [png()]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("올리지 못했어요")));
    expect(imageNodes(el)).toHaveLength(0);
  });

  it("5MB를 넘으면 요청 없이 안내만 한다", async () => {
    const { el } = await setup();

    paste(el, [png(5 * 1024 * 1024 + 1)]);

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("5MB"));
    expect(imageNodes(el)).toHaveLength(0);
    expect(upload).not.toHaveBeenCalled();
  });

  it("이미지가 없는 붙여넣기는 건드리지 않는다", async () => {
    const { el } = await setup();
    expect(paste(el, [])).toBe(false);
  });

  it("너비(%)는 style로 저장되고 다시 불러와도 유지된다", async () => {
    const { el } = await setup(`<p>글</p><img src="${TMP_URL}" style="width: 60%">`);
    expect(imageNodes(el)[0].width).toBe(60);
    expect(el.editor.getHTML()).toContain("width: 60%");
  });

  it("툴바 [이미지]는 이미지 파일만 고르는 선택창을 연다", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const { container } = await setup();
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "이미지");

    act(() => button?.click());

    expect(click).toHaveBeenCalledTimes(1);
    const input = click.mock.contexts[0] as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toContain("image/png");
    click.mockRestore();
  });

  it("이미지를 선택해 오른쪽 핸들을 끌면 본문 폭 대비 %로 너비가 바뀐다", async () => {
    const { container, el } = await setup(`<p>글</p><img src="${TMP_URL}" style="width: 40%">`);
    // jsdom에는 레이아웃이 없어서 본문 폭 1000px, 이미지 폭 400px(40%)로 가정한다
    const widthOf = (node: Element) => (node.classList.contains("image-node") ? 1000 : node.parentElement?.classList.contains("image-node") ? 400 : 0);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const width = widthOf(this);
      return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: 0, width, height: 0, toJSON: () => ({}) } as DOMRect;
    });
    // 이미지 노드의 위치를 찾아 선택
    let imagePos = -1;
    el.editor.state.doc.descendants((n, pos) => {
      if (n.type.name === "image") imagePos = pos;
    });
    act(() => el.editor.commands.setNodeSelection(imagePos));

    const handle = await screen.findByTestId("image-resize-handle");
    fireEvent.pointerDown(handle, { clientX: 400 });
    act(() => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 600 }));
    });
    expect(container.textContent).toContain("60%"); // 끄는 동안 표시
    act(() => {
      window.dispatchEvent(new MouseEvent("pointerup"));
    });

    await waitFor(() => expect(imageNodes(el)[0].width).toBe(60));
    expect(el.editor.getHTML()).toContain("width: 60%");
    vi.restoreAllMocks();
  });
});
