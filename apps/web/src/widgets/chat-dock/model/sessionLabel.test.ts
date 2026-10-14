import { describe, expect, it } from "vitest";
import { plainText, sessionLabel, sessionTitle } from "./sessionLabel";
import type { ChatSession } from "./types";

const base: ChatSession = {
  id: "s1",
  kind: "write",
  post_id: null,
  post_title: null,
  post_category: null,
  updated_at: "2026-10-14T00:00:00Z",
  last_message: null,
};

describe("plainText", () => {
  it("마크다운 기호를 걷어내고 한 줄로 만든다", () => {
    expect(plainText("**굵게** 그리고 `코드`\n\n- 하나\n- 둘")).toBe("굵게 그리고 코드 하나 둘");
    expect(plainText("## 제목\n본문 [링크](http://x.test) 끝")).toBe("제목 본문 링크 끝");
    expect(plainText("1. 첫째\n2. 둘째")).toBe("첫째 둘째");
    expect(plainText("앞 <br> 뒤")).toBe("앞 뒤");
    expect(plainText("```js\nconst a = 1;\n```\n뒤")).toBe("뒤");
  });
  it("평범한 글은 그대로 둔다", () => {
    expect(plainText("도커 볼륨이 뭐야?")).toBe("도커 볼륨이 뭐야?");
    expect(plainText("snake_case_name 그대로")).toContain("snake");
  });
});

describe("sessionLabel / sessionTitle", () => {
  it("종류별 뱃지 글자", () => {
    expect(sessionLabel({ ...base, kind: "write", first_question: "안녕" }).kicker).toBe("일반 대화");
    expect(sessionLabel({ ...base, kind: "posts", first_question: "안녕" }).kicker).toBe("글 찾기");
    expect(sessionLabel({ ...base, kind: "reading", first_question: "안녕" }).kicker).toBe("독서");
    expect(sessionLabel({ ...base, kind: "todo", first_question: "안녕" }).kicker).toBe("할 일");
  });

  it("알 수 없는 종류나 종류가 없는 옛 응답은 일반 대화로 본다", () => {
    expect(sessionLabel({ ...base, kind: undefined as never, first_question: "안녕" }).kicker).toBe("일반 대화");
    expect(sessionLabel({ ...base, kind: "weird" as never, first_question: "안녕" }).kicker).toBe("일반 대화");
  });

  it("제목은 첫 질문, 없으면 마지막 말(마크다운 제거), 둘 다 없으면 '새 대화'", () => {
    expect(sessionLabel({ ...base, first_question: "모니터링 글 있어?", last_message: "**긴** 답변" }).title).toBe("모니터링 글 있어?");
    expect(sessionLabel({ ...base, first_question: null, last_message: "**긴** 답변" }).title).toBe("긴 답변");
    expect(sessionLabel({ ...base }).title).toBe("새 대화");
  });

  it("글에 묶인 글쓰기 대화는 글 제목과 카테고리를 보여준다", () => {
    const s = { ...base, post_id: "p1", post_title: " 내 글 ", post_category: "DevOps", first_question: "무시됨" };
    expect(sessionLabel(s)).toEqual({ kicker: "글쓰기 · DevOps", title: "내 글" });
    expect(sessionLabel({ ...s, post_title: "", post_category: "" })).toEqual({ kicker: "글쓰기 · 카테고리 없음", title: "제목 없음" });
  });

  it("sessionTitle은 제목이 없으면 빈 문자열(헤더가 첫 메시지로 대신한다)", () => {
    expect(sessionTitle({ ...base })).toBe("");
    expect(sessionTitle({ ...base, post_id: "p1", post_title: " " })).toBe("");
  });
});
