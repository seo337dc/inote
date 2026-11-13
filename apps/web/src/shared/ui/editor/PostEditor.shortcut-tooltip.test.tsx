import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sleep } from "@/test/sleep";
import PostEditor from "./PostEditor";

afterEach(() => vi.restoreAllMocks());

function setPlatform(platform: string) {
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue(platform);
}

async function setup() {
  const user = userEvent.setup();
  render(<PostEditor content="<p>본문</p>" onChange={vi.fn()} />);
  // 에디터가 마운트돼 툴바가 그려질 때까지 기다린다
  await screen.findByRole("button", { name: "B" });
  return user;
}

describe("툴바 단축키 말풍선", () => {
  it("맥: 글자 버튼(굵게)에 마우스를 올리면 이름과 ⌘B가 보인다", async () => {
    setPlatform("MacIntel");
    const user = await setup();

    await user.hover(screen.getByRole("button", { name: "B" }));

    expect(await screen.findByText("⌘B")).toBeInTheDocument();
    expect(screen.getByText("굵게")).toBeInTheDocument();
  });

  it("윈도우: 같은 버튼이 Ctrl+B로 보인다", async () => {
    setPlatform("Win32");
    const user = await setup();

    await user.hover(screen.getByRole("button", { name: "B" }));

    expect(await screen.findByText("Ctrl+B")).toBeInTheDocument();
  });

  it("아이콘 버튼(코드 블록)도 이름과 단축키를 보여주고, 브라우저 기본 툴팁(title)은 없다", async () => {
    setPlatform("MacIntel");
    const user = await setup();
    const button = screen.getByRole("button", { name: "코드 블록" });
    expect(button).not.toHaveAttribute("title");

    await user.hover(button);

    expect(await screen.findByText("⌥⌘C")).toBeInTheDocument();
  });

  it("기울임·취소선·목록 같은 나머지 대상도 각자의 단축키로 보인다 (윈도우)", async () => {
    setPlatform("Win32");
    const user = await setup();

    await user.hover(screen.getByRole("button", { name: "I" }));
    expect(await screen.findByText("Ctrl+I")).toBeInTheDocument();
    await user.unhover(screen.getByRole("button", { name: "I" }));

    await user.hover(screen.getByRole("button", { name: "취소선" }));
    expect(await screen.findByText("Ctrl+Shift+S")).toBeInTheDocument();
    await user.unhover(screen.getByRole("button", { name: "취소선" }));

    await user.hover(screen.getByRole("button", { name: "목록" }));
    expect(await screen.findByText("Ctrl+Shift+8")).toBeInTheDocument();
  });

  it("단축키가 없는 버튼(링크)과 동작이 달라 제외한 H1은 말풍선이 뜨지 않는다", async () => {
    setPlatform("MacIntel");
    const user = await setup();

    await user.hover(screen.getByRole("button", { name: "링크" }));
    await user.hover(screen.getByRole("button", { name: "H1" }));
    // 말풍선이 뜨는 지연(0.4초)보다 충분히 기다려도 단축키 글자(kbd)가 없다
    await sleep(700);

    expect(document.querySelector("kbd")).toBeNull();
    // 링크 버튼은 기존 브라우저 툴팁(title)을 그대로 쓴다
    expect(screen.getByRole("button", { name: "링크" })).toHaveAttribute("title", "링크");
  });
});
