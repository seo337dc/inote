import { describe, expect, it, vi } from "vitest";
import Page from "./page";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("@/views/write", () => ({ WritePage: () => null }));

const render = (searchParams: Record<string, string | string[] | undefined>) =>
  Page({ searchParams: Promise.resolve(searchParams) } as unknown as Parameters<typeof Page>[0]);

describe("/write 페이지", () => {
  it("예전 주소(/write?id=abc)는 /write/abc 로 보낸다", async () => {
    await expect(render({ id: "abc" })).rejects.toThrow("NEXT_REDIRECT:/write/abc");
  });

  it("id에 특수문자가 있어도 경로에 안전하게 넣는다", async () => {
    await expect(render({ id: "a/b" })).rejects.toThrow("NEXT_REDIRECT:/write/a%2Fb");
  });

  it("id가 없으면 새 글 화면을 보여준다 (redirect 없음)", async () => {
    redirect.mockClear();
    await render({});
    expect(redirect).not.toHaveBeenCalled();
  });
});
