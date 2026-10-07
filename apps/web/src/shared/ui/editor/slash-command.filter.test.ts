import { describe, expect, it } from "vitest";
import { filterItems, type SlashCommandItem } from "./slash-command";

const titles = (query: string) => filterItems(query).map((item) => item.title);

describe("슬래시 메뉴 검색 — 영어로도 찾아진다", () => {
  it.each([
    ["table", ["표"]],
    ["code", ["코드 블록"]],
    ["quote", ["인용"]],
    ["divider", ["구분선"]],
    ["hr", ["구분선"]],
    ["text", ["텍스트"]],
    ["paragraph", ["텍스트"]],
  ])("/%s → %j", (query, expected) => {
    expect(titles(query)).toEqual(expected);
  });

  it("heading은 제목 1·2·3 모두, h2는 제목 2만 찾는다", () => {
    expect(titles("heading")).toEqual(["제목 1", "제목 2", "제목 3"]);
    expect(titles("h2")).toEqual(["제목 2"]);
    expect(titles("heading3")).toEqual(["제목 3"]);
  });

  it("list는 글머리 기호 목록과 번호 매기기 목록 둘 다, bullet·number는 각각 하나만 찾는다", () => {
    expect(titles("list")).toEqual(["글머리 기호 목록", "번호 매기기 목록"]);
    expect(titles("bullet")).toEqual(["글머리 기호 목록"]);
    expect(titles("number")).toEqual(["번호 매기기 목록"]);
  });

  it("영어 단어의 일부만 쳐도 찾는다 (tab → 표)", () => {
    expect(titles("tab")).toEqual(["표"]);
  });

  it("대문자로 쳐도 찾는다 (TABLE, Heading)", () => {
    expect(titles("TABLE")).toEqual(["표"]);
    expect(titles("Heading")).toEqual(["제목 1", "제목 2", "제목 3"]);
  });
});

describe("슬래시 메뉴 검색 — 한글 검색은 그대로 동작한다", () => {
  it("제목의 일부로 찾는다", () => {
    expect(titles("표")).toEqual(["표"]);
    expect(titles("제목")).toEqual(["제목 1", "제목 2", "제목 3"]);
    expect(titles("목록")).toEqual(["글머리 기호 목록", "번호 매기기 목록"]);
  });

  it("공백 없이 쳐도 '제목 1'을 찾는다 (제목1)", () => {
    expect(titles("제목1")).toEqual(["제목 1"]);
  });
});

describe("슬래시 메뉴 검색 — 경계", () => {
  it("빈 쿼리('/'만 친 상태)는 모든 항목을 돌려준다", () => {
    expect(titles("")).toHaveLength(10);
  });

  it("어디에도 없는 글자는 빈 목록이다", () => {
    expect(titles("zzzz")).toEqual([]);
    expect(titles("없는명령")).toEqual([]);
  });

  it("모든 기본 항목은 영어 키워드가 하나 이상 있다 (영어 검색에서 빠지는 항목이 없게)", () => {
    const items = filterItems("");
    expect(items.every((item) => (item.keywords ?? []).length > 0)).toBe(true);
  });

  it("keywords가 없는 항목도 제목으로는 찾아진다", () => {
    const custom: SlashCommandItem[] = [
      { title: "사용자 항목", description: "", command: () => undefined },
    ];

    expect(filterItems("사용자", custom)).toEqual(custom);
    expect(filterItems("x", custom)).toEqual([]);
  });
});
