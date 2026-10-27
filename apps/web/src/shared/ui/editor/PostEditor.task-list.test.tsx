import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";

type Ed = { getHTML: () => string };
type El = HTMLElement & { editor: Ed };

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  document.elementFromPoint = () => null;
});

// Tiptap TaskItem이 저장하는 모양 (getHTML)
const taskItem = (checked: boolean, text: string) =>
  `<li data-checked="${checked}" data-type="taskItem"><label><input type="checkbox"${
    checked ? ' checked="checked"' : ""
  }><span></span></label><div><p>${text}</p></div></li>`;

async function setup(initial = "<p></p>") {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const { container } = render(<PostEditor content={initial} onChange={onChange} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  // 에디터 안의 DOM은 노드뷰가 그려서 <li data-checked>만 있다 (data-type="taskItem"은 저장되는 HTML(getHTML)에만 붙는다)
  const items = () => Array.from(el.querySelectorAll('ul[data-type="taskList"] > li[data-checked]'));
  const checkboxes = () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  return { user, el, onChange, items, checkboxes, html: () => el.editor.getHTML() };
}

// userEvent.keyboard에서 "[[" 는 글자 "[" 하나를 뜻한다 ("[Enter]" 같은 키 표기와 구분하려고)
describe("에디터 — 체크리스트 만들기", () => {
  it.each([
    ["[[] ", "[] — 노션처럼 공백 없이"],
    ["[[ ] ", "[ ]"],
  ])("빈 줄에서 %s 를 치면 체크 안 된 체크리스트 항목이 된다 (%s)", async (typed) => {
    const { user, el, items, html } = await setup();
    await user.click(el);

    await user.keyboard(typed);

    await waitFor(() => expect(items()).toHaveLength(1));
    expect(items()[0].getAttribute("data-checked")).toBe("false");
    expect(html()).toContain('<ul data-type="taskList">');
  });

  it("[x] 를 치면 처음부터 체크된 항목이 된다", async () => {
    const { user, el, items, checkboxes } = await setup();
    await user.click(el);

    await user.keyboard("[[x] ");

    await waitFor(() => expect(items()).toHaveLength(1));
    expect(items()[0].getAttribute("data-checked")).toBe("true");
    expect(checkboxes()[0].checked).toBe(true);
  });

  it("글 중간에 쓴 '[] '는 변환되지 않는다 (줄 맨 앞에서만)", async () => {
    const { user, el, items } = await setup();
    await user.click(el);

    await user.keyboard("메모 [[] ");

    expect(items()).toHaveLength(0);
    expect(el.textContent).toContain("메모 [] ");
  });

  it("슬래시 메뉴에서 /todo 를 고르면 체크리스트가 된다", async () => {
    const { user, el, items } = await setup();
    await user.click(el);

    await user.keyboard("/todo{Enter}");

    await waitFor(() => expect(items()).toHaveLength(1));
    expect(items()[0].getAttribute("data-checked")).toBe("false");
  });
});

describe("에디터 — 체크리스트 편집", () => {
  it("체크박스를 누르면 체크되고 저장될 HTML에도 반영된다, 다시 누르면 해제", async () => {
    const { user, items, checkboxes, html, onChange } = await setup(
      `<ul data-type="taskList">${taskItem(false, "할 일")}</ul>`,
    );
    await waitFor(() => expect(items()).toHaveLength(1));

    await user.click(checkboxes()[0]);

    await waitFor(() => expect(items()[0].getAttribute("data-checked")).toBe("true"));
    expect(html()).toContain('data-checked="true"');
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('data-checked="true"'));

    await user.click(checkboxes()[0]);

    await waitFor(() => expect(items()[0].getAttribute("data-checked")).toBe("false"));
    expect(html()).toContain('data-checked="false"');
  });

  it("저장된 체크 상태를 그대로 불러온다 (체크됨 / 안 됨) — 다시 저장해도 같은 HTML", async () => {
    const saved = `<ul data-type="taskList">${taskItem(true, "끝낸 일")}${taskItem(false, "할 일")}</ul>`;
    const { items, checkboxes, html } = await setup(saved);
    await waitFor(() => expect(items()).toHaveLength(2));

    expect(checkboxes().map((c) => c.checked)).toEqual([true, false]);
    expect(html()).toBe(saved);
  });

  it("Enter로 다음 항목을 만들고, 빈 항목에서 Enter를 한 번 더 치면 목록을 벗어나 일반 문단이 된다", async () => {
    const { user, el, items, html } = await setup();
    await user.click(el);

    await user.keyboard("[[] 첫째{Enter}둘째{Enter}");
    await waitFor(() => expect(items()).toHaveLength(3)); // 방금 만든 빈 세 번째 항목

    await user.keyboard("{Enter}");

    await waitFor(() => expect(items()).toHaveLength(2));
    // 목록 바로 뒤에 일반 문단이 생긴다 (문서 끝의 빈 문단은 StarterKit의 trailingNode가 따로 유지)
    expect(html()).toContain("</ul><p></p>");
  });

  it("Tab으로 항목을 안쪽으로 들여쓸 수 있다 (중첩 체크리스트)", async () => {
    const { user, el, items } = await setup();
    await user.click(el);
    await user.keyboard("[[] 부모{Enter}자식");

    await user.keyboard("{Tab}");

    await waitFor(() =>
      expect(el.querySelectorAll('ul[data-type="taskList"] ul[data-type="taskList"]')).toHaveLength(1),
    );
    expect(items()).toHaveLength(2);
  });
});
