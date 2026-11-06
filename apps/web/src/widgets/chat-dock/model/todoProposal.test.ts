import { describe, expect, it } from "vitest";
import { parseTodoProposal } from "./todoProposal";

describe("parseTodoProposal", () => {
  it("항목을 모두 선택된 상태의 확인 대기 카드로 만든다", () => {
    // 지켜주는 것: 카드가 처음엔 전부 체크된 채 사용자의 확인을 기다리는 것
    const proposal = parseTodoProposal({ items: [{ title: "이력서 작성" }, { title: "독서모임" }] });

    expect(proposal?.status).toBe("pending");
    expect(proposal?.items.map((i) => [i.title, i.selected])).toEqual([
      ["이력서 작성", true],
      ["독서모임", true],
    ]);
  });

  it("빈 제목과 제목이 아닌 값은 버리고 앞뒤 공백을 자른다", () => {
    // 지켜주는 것: 빈 줄이나 깨진 항목이 할 일로 만들어지는 것
    const proposal = parseTodoProposal({ items: [{ title: "  운동  " }, { title: "  " }, {}, null, { title: 3 }] });

    expect(proposal?.items.map((i) => i.title)).toEqual(["운동"]);
  });

  it("모양이 틀렸거나 남는 항목이 없으면 null이라 카드를 만들지 않는다", () => {
    // 지켜주는 것: 빈 카드가 채팅에 뜨는 것
    expect(parseTodoProposal(undefined)).toBeNull();
    expect(parseTodoProposal({ items: "x" })).toBeNull();
    expect(parseTodoProposal({ items: [] })).toBeNull();
    expect(parseTodoProposal({ items: [{ title: "" }] })).toBeNull();
  });
});
