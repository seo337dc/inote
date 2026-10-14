import { describe, expect, it } from "vitest";
import { MAX_SHOWN_DRAFTS, loadWriteGuide } from "./writeGuide";

const draft = (id: string, title: string, category: string | null = "DevOps") => ({ id, title, category });
const NEW_POST = { href: "/write", label: "새 글 쓰기" };

describe("loadWriteGuide", () => {
  it("로그인하지 않았으면 로그인 안내만 하고 임시저장을 조회하지 않는다", async () => {
    let called = false;
    const reply = await loadWriteGuide(false, async () => ((called = true), []));
    expect(reply.text).toContain("로그인");
    expect(reply.links).toEqual([{ href: "/login", label: "로그인하기" }]);
    expect(called).toBe(false);
  });

  it("작성 중인 글이 있으면 개수와 이어 쓸 글 링크, 새 글 쓰기를 준다", async () => {
    const reply = await loadWriteGuide(true, async () => [draft("d1", "도커 정리"), draft("d2", "  ", null)]);
    expect(reply.text).toContain("작성 중인 글이 2개");
    expect(reply.links).toEqual([
      { href: "/write/d1", label: "도커 정리", hint: "DevOps · 작성 중" },
      { href: "/write/d2", label: "(제목 없음)", hint: "작성 중" },
      NEW_POST,
    ]);
  });

  it("글 id는 주소에 안전하게 넣는다", async () => {
    const reply = await loadWriteGuide(true, async () => [draft("a/b?c", "t")]);
    expect(reply.links![0].href).toBe("/write/a%2Fb%3Fc");
  });

  it("너무 많으면 앞의 몇 개만 보여주고 전체 개수를 알린다", async () => {
    const many = Array.from({ length: MAX_SHOWN_DRAFTS + 3 }, (_, i) => draft(`d${i}`, `글 ${i}`));
    const reply = await loadWriteGuide(true, async () => many);
    expect(reply.text).toContain(`${many.length}개`);
    expect(reply.text).toContain(`최근 ${MAX_SHOWN_DRAFTS}개만`);
    expect(reply.links).toHaveLength(MAX_SHOWN_DRAFTS + 1); // + 새 글 쓰기
  });

  it("작성 중인 글이 없으면 새 글 쓰기만 준다", async () => {
    const reply = await loadWriteGuide(true, async () => []);
    expect(reply.text).toContain("없어요");
    expect(reply.links).toEqual([NEW_POST]);
  });

  it("조회에 실패해도 던지지 않고 새 글 쓰기를 준다", async () => {
    const reply = await loadWriteGuide(true, async () => {
      throw new Error("network");
    });
    expect(reply.text).toContain("불러오지 못했어요");
    expect(reply.links).toEqual([NEW_POST]);
  });
});
