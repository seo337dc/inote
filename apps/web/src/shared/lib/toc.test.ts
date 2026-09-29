import { describe, expect, it } from "vitest";
import { buildToc } from "./toc";

describe("buildToc", () => {
  it("h1~h3만 뽑고 레벨과 순서를 유지한다 (h4 이하와 본문은 제외)", () => {
    const { items } = buildToc("<h1>큰 제목</h1><p>본문</p><h2>중제목</h2><h3>소제목</h3><h4>더 작은</h4>");

    expect(items.map((i) => [i.level, i.text])).toEqual([
      [1, "큰 제목"],
      [2, "중제목"],
      [3, "소제목"],
    ]);
  });

  it("각 제목에 id를 달고, 목차 항목의 id와 일치한다", () => {
    const { html, items } = buildToc("<h2>React Query 개념</h2>");

    expect(items[0].id).toBe("react-query-개념");
    expect(html).toBe('<h2 id="react-query-개념">React Query 개념</h2>');
  });

  it("같은 제목이 반복되면 id에 번호를 붙여 중복을 피한다", () => {
    const { items } = buildToc("<h2>정리</h2><h2>정리</h2><h3>정리</h3>");

    expect(items.map((i) => i.id)).toEqual(["정리", "정리-2", "정리-3"]);
  });

  it("제목 안의 태그와 엔티티는 텍스트로 정리하되 원래 HTML은 그대로 둔다", () => {
    const { html, items } = buildToc("<h2>굵은 <strong>제목</strong> &amp; <a href=\"https://a.com\">링크</a></h2>");

    expect(items[0].text).toBe("굵은 제목 & 링크");
    expect(html).toContain("<strong>제목</strong>");
    expect(html).toContain('<a href="https://a.com">링크</a>');
  });

  it("줄바꿈(<br>)으로 여러 줄이 붙은 제목은 첫 줄만 목차 제목으로 쓴다", () => {
    const { items } = buildToc("<h3>기업리스트<br><br>보살핌 링크</h3>");

    expect(items[0].text).toBe("기업리스트");
  });

  it("텍스트가 없는 빈 제목은 목차에서 빼고 HTML은 건드리지 않는다", () => {
    const html = "<h2></h2><h3><br></h3>";
    const result = buildToc(html);

    expect(result.items).toEqual([]);
    expect(result.html).toBe(html);
  });

  it("이미 id가 있으면 교체하고, 다른 속성은 유지한다", () => {
    const { html } = buildToc('<h2 class="x" id="old">제목</h2>');

    expect(html).toBe('<h2 class="x" id="제목">제목</h2>');
  });

  it("제목이 하나도 없으면 원본 그대로 돌려준다", () => {
    const html = "<p>본문만</p>";

    expect(buildToc(html)).toEqual({ html, items: [] });
  });
});
