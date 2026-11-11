import { describe, expect, it } from "vitest";
import { previewText } from "./previewText";

describe("previewText", () => {
  it("HTML 태그를 지우고 글자만 남긴다", () => {
    expect(previewText("<p>안녕 <strong>세계</strong></p>")).toBe("안녕 세계");
  });

  it("연속 공백·줄바꿈은 한 칸으로 줄이고 앞뒤를 자른다", () => {
    expect(previewText("<p>  가\n\n나  </p>")).toBe("가 나");
  });

  it("글자가 없으면 '내용 없음'이다 (빈 문자열·빈 태그)", () => {
    expect(previewText("")).toBe("내용 없음");
    expect(previewText("<p></p>")).toBe("내용 없음");
  });
});
