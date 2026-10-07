"use client";

import { createContext, useContext, useState, type ComponentType, type ReactNode } from "react";
import { PanelLeft, PanelRight, PanelRightClose } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PostOutline } from "@/widgets/post-outline";
import { ContentToc } from "@/shared/ui/content-toc";
import type { TocItem } from "@/shared/lib/toc";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

// 각 영역이 펼쳐져 있는지. OutlinePanel·TocPanel(과 useIsCollapsed)이 읽어서 안쪽 컴포넌트에 접힘 값을 전달한다.
type PanelsState = { outlineOpen: boolean; tocOpen: boolean };

const PanelsContext = createContext<PanelsState | null>(null);

// 아이콘 버튼과 헤더 줄을 같은 높이(22px)로 맞추면 둘 다 가운데 정렬이라 아이콘과 제목 글자의 수직 중앙이 맞는다.
// 아이콘이 들어갈 왼쪽 자리는 각 영역의 headerClassName으로 비운다 (PostOutline / ContentToc).
// - 카테고리: 아이콘(0~22px) 다음에 제목. 아이콘 왼쪽이 영역의 왼쪽 끝
// - 목차: 영역 왼쪽의 세로선(2px) 바로 오른쪽에 아이콘(8~30px), 그 다음에 제목
export const OUTLINE_HEADER_CLASS = "min-h-[22px] pl-7";
export const TOC_HEADER_CLASS = "flex min-h-[22px] items-center pl-[34px]";

const OUTLINE_PANEL_ID = "post-outline-panel";
const TOC_PANEL_ID = "post-toc-panel";

// 주의: 이 컴포넌트에는 함수를 props로 넘기지 않는다. 이 레이아웃을 쓰는 PostArticle은 공개 글을 서버에서 그리는 서버 컴포넌트라서,
// 서버 → 클라이언트 경계를 함수가 못 넘는다(런타임에 "Functions cannot be passed directly to Client Components" 에러).
// 그래서 접힘 값은 render prop이 아니라 컨텍스트로 내려보내고, 슬롯(outline·toc)에는 아래 OutlinePanel·TocPanel 같은 컴포넌트를 꽂는다.
type Props = {
  // 왼쪽 카테고리 트리. 접히면 제목 줄만 남기고 목록을 가린다 (OutlinePanel이 접힘 값을 컨텍스트로 읽어 PostOutline에 전달)
  outline: ReactNode;
  // 오른쪽 목차(같은 방식, TocPanel). 항목이 없으면 null — 그러면 목차 영역(과 그 접기 버튼) 자체를 만들지 않는다
  toc: ReactNode | null;
  // 가운데 본문
  children: ReactNode;
};

// 각 영역의 헤더 줄에 겹쳐 놓는 아이콘 버튼(제목 텍스트 왼쪽). 이름은 기존 헤더("카테고리", "목차")가 이미 보여주므로
// 아이콘만 둔다(이름이 두 번 나오지 않게). 누르면 목록만 가려지고 제목 줄(아이콘 + 이름)은 그대로 남는다.
// 접힌 상태에서는 아이콘이 closedIcon으로 바뀐다. 이름은 접근성 라벨·툴팁으로도 남긴다. 배경(배지) 없이 아이콘 색만 쓴다.
function SidePanelToggle({
  label,
  open,
  icon,
  closedIcon,
  panelId,
  onClick,
}: {
  label: string;
  open: boolean;
  // 펼쳐져 있을 때 / 접혀 있을 때의 아이콘
  icon: IconComponent;
  closedIcon: IconComponent;
  panelId: string;
  onClick: () => void;
}) {
  const text = open ? `${label} 접기` : `${label} 펼치기`;
  const Icon = open ? icon : closedIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      aria-expanded={open}
      aria-controls={panelId}
      // 펼침(open=true)일 때와 접힘일 때의 아이콘 색은 여기서 정한다 (펼침 색을 바꾸려면 아래 줄의 첫 번째 색)
      className={cn("size-[22px] rounded p-1", open ? "text-zinc-600" : "text-zinc-400 hover:text-zinc-600")}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

// 이 레이아웃 안에서 해당 영역이 접혀 있는지. 레이아웃 밖에서는 항상 false(펼침).
export function useIsCollapsed(panel: "outline" | "toc"): boolean {
  const panels = useContext(PanelsContext);
  if (!panels) return false;
  return panel === "outline" ? !panels.outlineOpen : !panels.tocOpen;
}

// 슬롯에 꽂는 어댑터 — 서버 컴포넌트(PostArticle)가 함수 대신 이 컴포넌트(와 직렬화되는 props)를 넘길 수 있게 한다.
// PostOutline·ContentToc는 이 레이아웃을 몰라도 되도록 collapsed만 받게 두고, 컨텍스트 읽기는 여기서 한다.
export function OutlinePanel({
  currentPostId,
  authorId,
  headerClassName,
}: {
  currentPostId: string;
  // 이 글의 작성자 — 다른 사람의 글이면 왼쪽 카테고리가 그 작성자의 공개 카테고리로 바뀐다
  authorId?: string | null;
  headerClassName?: string;
}) {
  const collapsed = useIsCollapsed("outline");
  return (
    <PostOutline
      currentPostId={currentPostId}
      authorId={authorId}
      headerClassName={headerClassName}
      collapsed={collapsed}
    />
  );
}

export function TocPanel({ items, headerClassName }: { items: TocItem[]; headerClassName?: string }) {
  const collapsed = useIsCollapsed("toc");
  return <ContentToc items={items} headerClassName={headerClassName} collapsed={collapsed} />;
}

// 글 상세의 3열 배치(카테고리 / 본문 / 목차)와 두 사이드 영역의 접기·펼치기.
// 폭이 부족하면 목차 → 카테고리 순으로 숨기는 기존 규칙(컨테이너 쿼리)은 그대로고, 이 접기는 그보다 넓은 화면에서
// 사용자가 직접 줄이는 것이다. 접힌 상태는 저장하지 않아서 글을 열 때마다 둘 다 펼친 채로 시작한다.
export default function PostArticleLayout({ outline, toc, children }: Props) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [tocOpen, setTocOpen] = useState(true);
  const hasToc = toc !== null;

  // 어느 한쪽이라도 접히면 본문이 남는 폭을 모두 쓴다. 둘 다 펼쳐져 있으면 읽기 좋은 폭(max-w-5xl)으로 제한
  const expanded = !outlineOpen || (hasToc && !tocOpen);

  return (
    <PanelsContext.Provider value={{ outlineOpen, tocOpen }}>
      <div className="@container">
        <div className="mx-auto flex max-w-[90rem] gap-6 px-6 py-16">
          {/* 접혀도 제목("카테고리")이 들어갈 만큼 폭을 남긴다 */}
          <aside className={cn("hidden shrink-0 @4xl:block", outlineOpen ? "w-52" : "w-24")}>
            {/* 안쪽 nav들이 이미 sticky라서, 아이콘도 같이 따라다니도록 sticky 래퍼에 둔다 */}
            <div className="sticky top-6">
              {/* 아이콘은 헤더 줄에 겹쳐 놓는다(relative 안의 absolute). 목록이 없는 글처럼 패널이 비면 높이가 0이 되므로 최소 높이를 둔다 */}
              <div className="relative min-h-6">
                {/* 접고 펼 때 제자리에 있도록 영역의 바깥쪽(왼쪽) 끝에 붙인다 */}
                <div className="absolute left-0 top-0 z-10">
                  <SidePanelToggle
                    label="카테고리"
                    open={outlineOpen}
                    icon={PanelLeft}
                    closedIcon={PanelRightClose}
                    panelId={OUTLINE_PANEL_ID}
                    onClick={() => setOutlineOpen((v) => !v)}
                  />
                </div>
                {/* 접으면 제목 줄은 남기고 목록만 가린다(어댑터가 collapsed로 전달) — 언마운트하지 않아 직접 펼쳐 둔 폴더 같은 상태도 유지된다 */}
                <div id={OUTLINE_PANEL_ID}>{outline}</div>
              </div>
            </div>
          </aside>

          <article className={cn("mx-auto min-w-0 flex-1", expanded ? "max-w-none" : "max-w-5xl")}>
            {children}
          </article>

          {hasToc && (
            <aside className={cn("hidden shrink-0 @7xl:block", tocOpen ? "w-48" : "w-20")}>
              <div className="sticky top-6">
                <div className="relative min-h-6">
                  {/* 제목 왼쪽, 세로선 바로 오른쪽에 둔다. 접으면 영역이 오른쪽 끝의 좁은 폭으로 줄어서 아이콘과 제목도 그 안으로 이동한다 */}
                  <div className="absolute left-2 top-0 z-10">
                    <SidePanelToggle
                      label="목차"
                      open={tocOpen}
                      icon={PanelRight}
                      closedIcon={PanelRightClose}
                      panelId={TOC_PANEL_ID}
                      onClick={() => setTocOpen((v) => !v)}
                    />
                  </div>
                  <div id={TOC_PANEL_ID}>{toc}</div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </PanelsContext.Provider>
  );
}
