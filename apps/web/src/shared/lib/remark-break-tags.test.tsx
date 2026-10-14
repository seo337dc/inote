import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkBreakTags } from "./remark-break-tags";

function renderMd(text: string) {
  return render(<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreakTags]}>{text}</ReactMarkdown>).container;
}

const TABLE = (cell: string) => `| 구분 | 설명 |\n|---|---|\n| FE | ${cell} |`;

describe("remarkBreakTags", () => {
  it("표 칸 안의 <br>을 글자로 보이지 않고 줄바꿈으로 그린다", () => {
    const el = renderMd(TABLE("Client-side JS 에러 수집 <br>Performance API 활용"));
    const cell = el.querySelectorAll("td")[1];

    expect(cell.textContent).toContain("Client-side JS 에러 수집");
    expect(cell.textContent).toContain("Performance API 활용");
    expect(cell.querySelectorAll("br")).toHaveLength(1);
    expect(el.textContent).not.toContain("<br>");
  });

  it("<br/>, <br />, 대문자 <BR>도 같은 줄바꿈이다", () => {
    const el = renderMd(TABLE("가<br/>나<br />다<BR>라"));

    expect(el.querySelectorAll("td")[1].querySelectorAll("br")).toHaveLength(3);
    expect(el.textContent).not.toMatch(/<br/i);
  });

  it("강조 안에 든 <br>도 바꾼다", () => {
    const el = renderMd(TABLE("*가<br>나*"));

    expect(el.querySelector("em")?.querySelectorAll("br")).toHaveLength(1);
  });

  it("문단 속 <br>도 줄바꿈이 된다", () => {
    const el = renderMd("첫째 줄<br>둘째 줄");

    expect(el.querySelectorAll("p br")).toHaveLength(1);
  });

  it("다른 HTML 태그는 그대로 두어 렌더하지 않는다 (스크립트가 실행되지 않는다)", () => {
    const el = renderMd("<script>alert(1)</script> 안녕");

    expect(el.querySelector("script")).toBeNull();
  });

  it("<br>이 없으면 아무것도 바꾸지 않는다", () => {
    const el = renderMd(TABLE("그냥 글자"));

    expect(el.querySelectorAll("br")).toHaveLength(0);
    expect(el.querySelectorAll("td")[1].textContent).toBe("그냥 글자");
  });
});
