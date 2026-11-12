import { describe, expect, it } from "vitest";
import { resolveMemoTarget } from "./resolveMemoTarget";

// 지금 화면의 메모장이 다룰 대상을 경로만으로 정한다 (계약: docs/todo/memo.md 3차).
// "내 글인지"·로그인 여부는 이 함수가 모른다 — 호출하는 컴포넌트가 정한다.
describe("resolveMemoTarget", () => {
  it("글쓰기·글 상세 경로는 그 글의 메모다", () => {
    expect(resolveMemoTarget("/write/abc123")).toEqual({ type: "post", id: "abc123" });
    expect(resolveMemoTarget("/posts/abc123")).toEqual({ type: "post", id: "abc123" });
  });

  it("독서 상세 경로는 그 독서 기록의 메모다", () => {
    expect(resolveMemoTarget("/reading/r9")).toEqual({ type: "reading", id: "r9" });
  });

  it("id가 아직 없는 새 글쓰기(/write, /reading/write)는 일반 메모다 — 'write'를 id로 오인하지 않는다", () => {
    expect(resolveMemoTarget("/write")).toEqual({ type: "general" });
    expect(resolveMemoTarget("/reading/write")).toEqual({ type: "general" });
  });

  it("목록 경로(/posts, /reading)는 글·독서 대상이 아니라 일반 메모다", () => {
    expect(resolveMemoTarget("/posts")).toEqual({ type: "general" });
    expect(resolveMemoTarget("/reading")).toEqual({ type: "general" });
  });

  it("홈과 그 밖의 화면은 모두 일반 메모다 (로그인 화면도 — 비로그인 숨김은 호출부가 한다)", () => {
    for (const path of ["/", "/my-posts", "/my-posts/drafts", "/todos", "/profile", "/dashboard", "/login"]) {
      expect(resolveMemoTarget(path)).toEqual({ type: "general" });
    }
  });

  it("메모 관리 화면(/memos)은 메모장을 숨긴다 (null) — 거기서는 메모장 버튼이 필요 없다", () => {
    expect(resolveMemoTarget("/memos")).toBeNull();
    expect(resolveMemoTarget("/memos/")).toBeNull();
  });

  it("관리자 화면은 메모장을 숨긴다 (null) — 보류 중", () => {
    expect(resolveMemoTarget("/admin")).toBeNull();
    expect(resolveMemoTarget("/admin/embeddings")).toBeNull();
  });

  it("'/administrator' 같은 비슷한 경로는 관리자 화면으로 보지 않는다", () => {
    expect(resolveMemoTarget("/administrator")).toEqual({ type: "general" });
  });

  it("끝 슬래시·쿼리·해시가 붙어도 같은 결과다", () => {
    expect(resolveMemoTarget("/posts/abc123/")).toEqual({ type: "post", id: "abc123" });
    expect(resolveMemoTarget("/posts/abc123?from=list#top")).toEqual({ type: "post", id: "abc123" });
  });

  it("글 id 뒤에 더 깊은 경로가 있으면 글 상세가 아니라 일반 메모다", () => {
    expect(resolveMemoTarget("/posts/abc123/edit")).toEqual({ type: "general" });
  });

  it("퍼센트 인코딩된 id는 디코딩해서 돌려준다", () => {
    expect(resolveMemoTarget("/posts/a%20b")).toEqual({ type: "post", id: "a b" });
  });

  it("잘못된 퍼센트 인코딩이어도 예외 없이 id를 그대로 돌려준다", () => {
    expect(resolveMemoTarget("/posts/%E0%A4%A")).toEqual({ type: "post", id: "%E0%A4%A" });
  });
});
