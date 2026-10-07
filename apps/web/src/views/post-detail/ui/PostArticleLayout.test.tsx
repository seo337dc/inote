import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostArticleLayout, { OUTLINE_HEADER_CLASS, TOC_HEADER_CLASS, useIsCollapsed } from "./PostArticleLayout";

// 실제 OutlinePanel·TocPanel처럼: 레이아웃이 컨텍스트로 알려 주는 접힘 값을 읽어서, 접히면 제목 줄은 남기고 목록만 가린다.
// 접어도 안쪽 상태가 사라지지 않는지 보려고 목록 안에 상태를 가진 입력창을 둔다.
function Outline() {
  const collapsed = useIsCollapsed("outline");
  const [text, setText] = useState("");
  return (
    <nav aria-label="카테고리 트리">
      <p>카테고리</p>
      <div hidden={collapsed}>
        <input aria-label="폴더 필터" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </nav>
  );
}

function Toc() {
  const collapsed = useIsCollapsed("toc");
  return (
    <nav aria-label="목차 내용">
      <p>목차</p>
      <ul hidden={collapsed}>
        <li>목차 항목들</li>
      </ul>
    </nav>
  );
}

function setup({ withToc = true }: { withToc?: boolean } = {}) {
  const user = userEvent.setup();
  const view = render(
    <PostArticleLayout outline={<Outline />} toc={withToc ? <Toc /> : null}>
      <p>본문 내용</p>
    </PostArticleLayout>,
  );
  const article = () => screen.getByRole("article");
  const outlineButton = (open: boolean) =>
    screen.getByRole("button", { name: open ? "카테고리 접기" : "카테고리 펼치기" });
  const tocButton = (open: boolean) => screen.getByRole("button", { name: open ? "목차 접기" : "목차 펼치기" });
  // 접히면 제목 줄은 남고 목록만 hidden 속성으로 가려진다 (DOM에는 남아 있다)
  const outlineList = () => screen.getByLabelText("폴더 필터").parentElement as HTMLElement;
  const tocList = () => screen.getByText("목차 항목들").closest("ul") as HTMLElement;
  const outlineTitle = () => screen.getByText("카테고리", { selector: "p" });
  const tocTitle = () => screen.getByText("목차", { selector: "p" });
  return { user, view, article, outlineButton, tocButton, outlineList, tocList, outlineTitle, tocTitle };
}

// lucide는 아이콘마다 class에 이름을 붙인다 (lucide-panel-right 와 lucide-panel-right-close는 접두어가 겹쳐서 토큰 단위로 비교)
const iconName = (button: HTMLElement) =>
  [...(button.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-") && c !== "lucide") ?? "";

describe("useIsCollapsed", () => {
  it("레이아웃 밖에서는 항상 펼침(false)으로 본다", () => {
    function Probe() {
      return <span>{String(useIsCollapsed("outline"))}</span>;
    }
    render(<Probe />);

    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("영역마다 따로 접힘 값을 읽는다 — 카테고리만 접으면 outline만 true", async () => {
    function Probe() {
      return (
        <span>
          {`outline=${useIsCollapsed("outline")} toc=${useIsCollapsed("toc")}`}
        </span>
      );
    }
    const user = userEvent.setup();
    render(
      <PostArticleLayout outline={<Probe />} toc={<span>목차</span>}>
        <p>본문</p>
      </PostArticleLayout>,
    );
    expect(screen.getByText("outline=false toc=false")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "카테고리 접기" }));

    expect(screen.getByText("outline=true toc=false")).toBeInTheDocument();
  });
});

describe("처음 상태", () => {
  it("카테고리와 목차가 모두 펼쳐져 있고, 본문은 읽기 좋은 폭(max-w-5xl)으로 제한된다", () => {
    const { article, outlineButton, tocButton, outlineList, tocList } = setup();

    expect(outlineList()).toBeVisible();
    expect(tocList()).toBeVisible();
    expect(outlineButton(true)).toHaveAttribute("aria-expanded", "true");
    expect(tocButton(true)).toHaveAttribute("aria-expanded", "true");
    expect(article()).toHaveClass("max-w-5xl");
    expect(article()).toHaveTextContent("본문 내용");
  });

  it("접기 버튼은 자기가 접는 영역을 aria-controls로 가리킨다", () => {
    const { outlineButton, tocButton } = setup();

    for (const [button, panelId] of [
      [outlineButton(true), "post-outline-panel"],
      [tocButton(true), "post-toc-panel"],
    ] as const) {
      expect(button.getAttribute("aria-controls")).toBe(panelId);
      expect(document.getElementById(panelId)).not.toBeNull();
    }
  });
});

describe("헤더 줄의 아이콘 버튼 모양", () => {
  it("이름 글자 없이 아이콘만 있다 — 이름은 기존 헤더가 보여주므로 두 번 나오지 않고, 접근성 이름은 라벨로 남는다", async () => {
    const { user, outlineButton, tocButton } = setup();

    expect(outlineButton(true)).toHaveTextContent("");
    expect(tocButton(true)).toHaveTextContent("");
    expect(outlineButton(true).querySelector("svg")).not.toBeNull();

    await user.click(outlineButton(true));
    await user.click(tocButton(true));
    expect(outlineButton(false)).toHaveTextContent("");
    expect(tocButton(false)).toHaveTextContent("");
    expect(outlineButton(false).querySelector("svg")).not.toBeNull();
    expect(tocButton(false).querySelector("svg")).not.toBeNull();
  });

  it("두 아이콘 모두 제목 왼쪽에 있다 — 카테고리는 영역 왼쪽 끝(left-0), 목차는 세로선 바로 오른쪽(left-2)", () => {
    const { outlineButton, tocButton } = setup();

    expect(outlineButton(true).parentElement).toHaveClass("left-0");
    expect(tocButton(true).parentElement).toHaveClass("left-2");
    expect(tocButton(true).parentElement).not.toHaveClass("right-0");
  });

  it("접고 펼 때 아이콘이 놓이는 기준(위치 클래스)은 바뀌지 않는다", async () => {
    const { user, outlineButton, tocButton } = setup();
    const slotOf = (button: HTMLElement) => button.parentElement!.className;
    const openSlots = [slotOf(outlineButton(true)), slotOf(tocButton(true))];

    await user.click(outlineButton(true));
    await user.click(tocButton(true));

    expect([slotOf(outlineButton(false)), slotOf(tocButton(false))]).toEqual(openSlots);
  });

  it("배지(배경·알약 모양) 없이 아이콘 색만 쓴다 — 펼침·접힘 모두", async () => {
    const { user, outlineButton, tocButton } = setup();
    const noBadge = (el: HTMLElement) => {
      expect(el.className).not.toMatch(/\bbg-/);
      expect(el.className).not.toContain("rounded-full");
    };
    noBadge(outlineButton(true));
    noBadge(tocButton(true));

    await user.click(outlineButton(true));
    await user.click(tocButton(true));

    noBadge(outlineButton(false));
    noBadge(tocButton(false));
  });

  it("펼침일 때와 접힘일 때 아이콘 색이 다르다 (펼침 색을 따로 바꿀 수 있는 자리)", async () => {
    const { user, outlineButton } = setup();
    const openColor = outlineButton(true).className.match(/text-zinc-\d+/)![0];

    await user.click(outlineButton(true));
    const closedColor = outlineButton(false).className.match(/text-zinc-\d+/)![0];

    expect(openColor).not.toBe(closedColor);
  });

  it("아이콘 버튼과 헤더 줄의 높이가 같아서(22px) 아이콘과 제목 글자가 수직 중앙에 맞는다", () => {
    const { outlineButton, tocButton } = setup();

    expect(outlineButton(true)).toHaveClass("size-[22px]");
    expect(tocButton(true)).toHaveClass("size-[22px]");
    expect(OUTLINE_HEADER_CLASS).toContain("min-h-[22px]");
    expect(TOC_HEADER_CLASS).toContain("min-h-[22px]");
    expect(TOC_HEADER_CLASS).toContain("items-center");
  });

  it("아이콘은 영역 위에 겹쳐 놓는다(absolute) — 별도 줄을 차지해 헤더를 아래로 밀지 않는다", () => {
    const { outlineButton, tocButton } = setup();

    expect(outlineButton(true).parentElement).toHaveClass("absolute");
    expect(tocButton(true).parentElement).toHaveClass("absolute");
  });
});

describe("닫으면 아이콘이 바뀐다", () => {
  it("펼침은 각자의 패널 아이콘(카테고리 panel-left, 목차 panel-right), 접힘은 둘 다 panel-right-close", async () => {
    const { user, outlineButton, tocButton } = setup();
    expect(iconName(outlineButton(true))).toBe("lucide-panel-left");
    expect(iconName(tocButton(true))).toBe("lucide-panel-right");

    await user.click(outlineButton(true));
    await user.click(tocButton(true));

    expect(iconName(outlineButton(false))).toBe("lucide-panel-right-close");
    expect(iconName(tocButton(false))).toBe("lucide-panel-right-close");
  });

  it("다시 펼치면 원래 아이콘으로 돌아온다", async () => {
    const { user, outlineButton, tocButton } = setup();
    await user.click(outlineButton(true));
    await user.click(tocButton(true));

    await user.click(outlineButton(false));
    await user.click(tocButton(false));

    expect(iconName(outlineButton(true))).toBe("lucide-panel-left");
    expect(iconName(tocButton(true))).toBe("lucide-panel-right");
  });

  it("한쪽만 접으면 그 쪽 아이콘만 바뀐다", async () => {
    const { user, outlineButton, tocButton } = setup();

    await user.click(outlineButton(true));

    expect(iconName(outlineButton(false))).toBe("lucide-panel-right-close");
    expect(iconName(tocButton(true))).toBe("lucide-panel-right");
  });
});

describe("닫아도 제목 텍스트는 남는다", () => {
  it("카테고리를 접으면 목록은 가려지고 '카테고리' 제목은 그대로 보인다", async () => {
    const { user, outlineButton, outlineList, outlineTitle } = setup();

    await user.click(outlineButton(true));

    expect(outlineList()).not.toBeVisible();
    expect(outlineTitle()).toBeVisible();
  });

  it("목차를 접으면 목록은 가려지고 '목차' 제목은 그대로 보인다", async () => {
    const { user, tocButton, tocList, tocTitle } = setup();

    await user.click(tocButton(true));

    expect(tocList()).not.toBeVisible();
    expect(tocTitle()).toBeVisible();
  });

  it("접힌 영역은 제목이 들어갈 만큼 폭을 남긴다 (카테고리 w-24, 목차 w-20) — 펼치면 원래 폭(w-52, w-48)", async () => {
    const { user, outlineButton, tocButton } = setup();
    const asideOf = (button: HTMLElement) => button.closest("aside")!;
    expect(asideOf(outlineButton(true))).toHaveClass("w-52");
    expect(asideOf(tocButton(true))).toHaveClass("w-48");

    await user.click(outlineButton(true));
    await user.click(tocButton(true));
    expect(asideOf(outlineButton(false))).toHaveClass("w-24");
    expect(asideOf(tocButton(false))).toHaveClass("w-20");

    await user.click(outlineButton(false));
    await user.click(tocButton(false));
    expect(asideOf(outlineButton(true))).toHaveClass("w-52");
    expect(asideOf(tocButton(true))).toHaveClass("w-48");
  });

  it("접힌 영역에서도 화살표(아이콘) 버튼이 남아 다시 펼칠 수 있다", async () => {
    const { user, outlineButton } = setup();

    await user.click(outlineButton(true));

    expect(outlineButton(false)).toBeVisible();
  });
});

describe("카테고리 접기·펼치기", () => {
  it("접으면 버튼이 '펼치기'로 바뀌고, 본문이 폭 제한 없이 넓어진다", async () => {
    const { user, article, outlineButton } = setup();

    await user.click(outlineButton(true));

    expect(outlineButton(false)).toHaveAttribute("aria-expanded", "false");
    expect(article()).toHaveClass("max-w-none");
    expect(article()).not.toHaveClass("max-w-5xl");
  });

  it("다시 펼치면 목록이 돌아오고 본문 폭도 원래대로 돌아온다", async () => {
    const { user, article, outlineButton, outlineList } = setup();
    await user.click(outlineButton(true));

    await user.click(outlineButton(false));

    expect(outlineList()).toBeVisible();
    expect(article()).toHaveClass("max-w-5xl");
  });

  it("접었다 펼쳐도 안쪽 상태(직접 입력한 값 등)가 사라지지 않는다 — 접어도 언마운트하지 않는다", async () => {
    const { user, outlineButton } = setup();
    await user.type(screen.getByLabelText("폴더 필터"), "독서");

    await user.click(outlineButton(true));
    await user.click(outlineButton(false));

    expect(screen.getByLabelText("폴더 필터")).toHaveValue("독서");
  });
});

describe("목차 접기·펼치기", () => {
  it("목차만 접으면 카테고리는 그대로이고 본문은 넓어진다", async () => {
    const { user, article, tocButton, tocList, outlineList } = setup();

    await user.click(tocButton(true));

    expect(tocList()).not.toBeVisible();
    expect(outlineList()).toBeVisible();
    expect(tocButton(false)).toHaveAttribute("aria-expanded", "false");
    expect(article()).toHaveClass("max-w-none");
  });

  it("목차를 다시 펼치면 본문 폭이 원래대로 돌아온다", async () => {
    const { user, article, tocButton } = setup();
    await user.click(tocButton(true));

    await user.click(tocButton(false));

    expect(article()).toHaveClass("max-w-5xl");
  });
});

describe("두 영역을 함께 다룰 때", () => {
  it("둘 다 접은 뒤 하나만 펼쳐도 본문은 넓은 채로 유지되고, 둘 다 펼쳐야 제한 폭으로 돌아온다", async () => {
    const { user, article, outlineButton, tocButton } = setup();
    await user.click(outlineButton(true));
    await user.click(tocButton(true));
    expect(article()).toHaveClass("max-w-none");

    await user.click(outlineButton(false));
    expect(article()).toHaveClass("max-w-none");

    await user.click(tocButton(false));
    expect(article()).toHaveClass("max-w-5xl");
  });

  it("두 영역은 서로 독립적으로 접힌다", async () => {
    const { user, outlineButton, tocButton, outlineList, tocList } = setup();

    await user.click(outlineButton(true));

    expect(outlineList()).not.toBeVisible();
    expect(tocList()).toBeVisible();
    expect(tocButton(true)).toHaveAttribute("aria-expanded", "true");
  });
});

describe("목차가 없는 글", () => {
  it("목차 영역과 목차 버튼을 만들지 않는다", () => {
    setup({ withToc: false });

    expect(screen.queryByRole("button", { name: /목차/ })).toBeNull();
    expect(screen.getByRole("button", { name: "카테고리 접기" })).toBeInTheDocument();
  });

  it("카테고리만 접어도 본문이 넓어지고, 펼치면 돌아온다 (없는 목차는 접힌 것으로 치지 않는다)", async () => {
    const { user, article, outlineButton } = setup({ withToc: false });
    expect(article()).toHaveClass("max-w-5xl");

    await user.click(outlineButton(true));
    expect(article()).toHaveClass("max-w-none");

    await user.click(outlineButton(false));
    expect(article()).toHaveClass("max-w-5xl");
  });
});

describe("상태 저장", () => {
  it("접은 상태를 기억하지 않는다 — 다시 열면(새로 그리면) 둘 다 펼쳐진 채로 시작한다", async () => {
    const first = setup();
    await first.user.click(first.outlineButton(true));
    await first.user.click(first.tocButton(true));
    expect(first.article()).toHaveClass("max-w-none");
    first.view.unmount();

    const second = setup();

    expect(second.outlineList()).toBeVisible();
    expect(second.tocList()).toBeVisible();
    expect(second.article()).toHaveClass("max-w-5xl");
  });
});
