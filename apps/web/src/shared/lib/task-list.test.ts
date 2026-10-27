import { describe, expect, it } from "vitest";
import { lockTaskCheckboxes } from "./task-list";

// Tiptap TaskItem이 저장하는 모양 (getHTML)
const item = (checked: boolean, text: string) =>
  `<li data-checked="${checked}" data-type="taskItem"><label><input type="checkbox"${
    checked ? ' checked="checked"' : ""
  }><span></span></label><div><p>${text}</p></div></li>`;

describe("lockTaskCheckboxes — 상세 화면의 체크박스를 읽기 전용으로", () => {
  it("체크박스에 disabled를 붙인다", () => {
    const html = `<ul data-type="taskList">${item(false, "할 일")}</ul>`;

    expect(lockTaskCheckboxes(html)).toContain('<input type="checkbox" disabled>');
  });

  it("체크된 상태(checked)는 그대로 두고 disabled만 더한다", () => {
    const html = `<ul data-type="taskList">${item(true, "끝낸 일")}</ul>`;

    expect(lockTaskCheckboxes(html)).toContain('<input type="checkbox" checked="checked" disabled>');
  });

  it("체크박스가 여러 개(중첩 포함)여도 전부 잠근다", () => {
    const nested = `<ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>부모</p>${`<ul data-type="taskList">${item(true, "자식")}</ul>`}</div></li></ul>`;

    const locked = lockTaskCheckboxes(nested);

    expect(locked.match(/<input /g)).toHaveLength(2);
    expect(locked.match(/ disabled>/g)).toHaveLength(2);
  });

  it("이미 disabled인 체크박스는 다시 붙이지 않는다 (여러 번 불러도 같은 결과)", () => {
    const once = lockTaskCheckboxes(`<ul data-type="taskList">${item(false, "a")}</ul>`);

    expect(lockTaskCheckboxes(once)).toBe(once);
  });

  it("자기 닫힘 표기(<input ... />)여도 disabled가 슬래시 앞에 온다", () => {
    expect(lockTaskCheckboxes('<input type="checkbox" />')).toBe('<input type="checkbox" disabled>');
  });

  it("체크박스가 아닌 input과 일반 본문, 글자로 쓴 '<input'은 건드리지 않는다", () => {
    const html = '<p>텍스트</p><input type="text"><p>&lt;input type="checkbox"&gt; 라고 쓴 글</p>';

    expect(lockTaskCheckboxes(html)).toBe(html);
  });

  it("체크리스트가 없는 본문은 그대로 돌려준다", () => {
    const html = "<h2>제목</h2><p>본문</p><ul><li>목록</li></ul>";

    expect(lockTaskCheckboxes(html)).toBe(html);
  });
});
