import { describe, expect, it } from "vitest";
import { memosKey } from "./queryKeys";

describe("memosKey", () => {
  it("글·독서는 종류와 id로 구분한다", () => {
    expect(memosKey({ type: "post", id: "p1" })).toEqual(["memos", "post", "p1"]);
    expect(memosKey({ type: "reading", id: "p1" })).not.toEqual(memosKey({ type: "post", id: "p1" }));
  });

  it("일반 메모는 id 없이 하나의 키다 (글 id와 섞이지 않는다)", () => {
    expect(memosKey({ type: "general" })).toEqual(["memos", "general"]);
  });
});
