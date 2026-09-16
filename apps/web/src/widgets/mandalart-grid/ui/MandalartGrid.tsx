import Link from "next/link";
import type { MandalartItem } from "@/entities/mandalart";
import "./mandalart.css";

type SkeletonCell =
  | { variant: "goal"; text: string }
  | { variant: "theme"; text: string; blk: string }
  | { variant: "slot"; blk: string };

const theme = (text: string, blk: string): SkeletonCell => ({ variant: "theme", text, blk });
const slot = (blk: string): SkeletonCell => ({ variant: "slot", blk });
const goal = (text: string): SkeletonCell => ({ variant: "goal", text });

// 9x9 그리드 뼈대(row-major). 각 축(t2~t9)은 항목 8칸 + 테마 라벨 1칸으로 구성되고,
// 항목 칸(slot)의 실제 내용은 DB에서 불러온 MandalartItem을 축별로 순서대로 채워 넣는다 —
// 그 축에 아직 없는 슬롯은 빈 칸으로 표시됨. 구조 자체(뼈대)는 docs/mandalart.html 원본과 동일.
const SKELETON: SkeletonCell[] = [
  // Row 1
  slot("t2"), slot("t2"), slot("t2"), slot("t3"), slot("t3"), slot("t3"), slot("t4"), slot("t4"), slot("t4"),
  // Row 2
  slot("t2"), theme("UI·BE 개발", "t2"), slot("t2"), slot("t3"), theme("BE 기술학습", "t3"), slot("t3"), slot("t4"), theme("LLM+MCP", "t4"), slot("t4"),
  // Row 3
  slot("t2"), slot("t2"), slot("t2"), slot("t3"), slot("t3"), slot("t3"), slot("t4"), slot("t4"), slot("t4"),
  // Row 4
  slot("t5"), slot("t5"), slot("t5"), theme("UI·BE 개발", "t2"), theme("BE 기술학습", "t3"), theme("LLM+MCP", "t4"), slot("t6"), slot("t6"), slot("t6"),
  // Row 5 (center row)
  slot("t5"), theme("AI 기술학습", "t5"), slot("t5"), theme("AI 기술학습", "t5"), goal("노션 + 블로그 + LLM"), theme("프로덕트 기획", "t6"), slot("t6"), theme("프로덕트 기획", "t6"), slot("t6"),
  // Row 6
  slot("t5"), slot("t5"), slot("t5"), theme("Infra·DevOps", "t7"), theme("테스트(E2E)", "t8"), theme("기능 고도화", "t9"), slot("t6"), slot("t6"), slot("t6"),
  // Row 7
  slot("t7"), slot("t7"), slot("t7"), slot("t8"), slot("t8"), slot("t8"), slot("t9"), slot("t9"), slot("t9"),
  // Row 8
  slot("t7"), theme("Infra·DevOps", "t7"), slot("t7"), slot("t8"), theme("테스트(E2E)", "t8"), slot("t8"), slot("t9"), theme("기능 고도화", "t9"), slot("t9"),
  // Row 9
  slot("t7"), slot("t7"), slot("t7"), slot("t8"), slot("t8"), slot("t8"), slot("t9"), slot("t9"), slot("t9"),
];

type Props = {
  items: MandalartItem[];
};

export default function MandalartGrid({ items }: Props) {
  const itemsByTheme = new Map<string, MandalartItem[]>();
  for (const item of items) {
    const list = itemsByTheme.get(item.theme) ?? [];
    list.push(item);
    itemsByTheme.set(item.theme, list);
  }
  for (const list of itemsByTheme.values()) list.sort((a, b) => a.position - b.position);

  // slot 칸을 순서대로 지나가면서, 그 축에 남은 실제 아이템을 하나씩 꺼내 채운다.
  const slotCursor = new Map<string, number>();
  function nextSlotItem(blk: string): MandalartItem | undefined {
    const list = itemsByTheme.get(blk) ?? [];
    const i = slotCursor.get(blk) ?? 0;
    slotCursor.set(blk, i + 1);
    return list[i];
  }

  return (
    <div className="mandalart">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- one-off styled widget, ported from docs/mandalart.html */}
      <link
        href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <div className="mandalart-page">
        <header className="mandalart-masthead">
          <p className="mandalart-eyebrow">inote-blog · dev-guide</p>
          <h1 className="mandalart-title">만다라트</h1>
          <p className="mandalart-dek">
            노션 + 블로그 + LLM. 8대 축 모두 확정 — 9번(기능 고도화)은 세부 항목을 채우는
            중, 점선 칸은 나중에 채울 자리. 항목을 누르면 정리 페이지로 이동.
          </p>
        </header>

        <div className="mandalart-grid-scroll">
          <div className="mandalart-grid">
            {SKELETON.map((cell, i) => {
              if (cell.variant === "goal") {
                return (
                  <div key={i} className="mandalart-cell mandalart-cell--goal">
                    {cell.text}
                  </div>
                );
              }
              if (cell.variant === "theme") {
                return (
                  <div key={i} className={`mandalart-cell mandalart-cell--theme blk-${cell.blk}`}>
                    {cell.text}
                  </div>
                );
              }
              const found = nextSlotItem(cell.blk);
              if (!found) {
                return (
                  <div
                    key={i}
                    className={`mandalart-cell mandalart-cell--empty blk-${cell.blk}`}
                  />
                );
              }
              return (
                <Link
                  key={i}
                  href={`/mandalart/${found.id}`}
                  className={`mandalart-cell mandalart-cell--item blk-${cell.blk} ${
                    found.done ? "mandalart-cell--done" : ""
                  }`}
                >
                  {found.done && <span className="mandalart-done-badge">(완료)</span>}
                  {found.title}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mandalart-legend">
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch goal" />
            핵심 목표
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch theme" />
            8대 축 (모두 확정)
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch item" />
            실천 항목 (클릭 시 정리 페이지로 이동)
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch empty" />
            9번 세부 항목 — 채우는 중
          </span>
        </div>

        <p className="mandalart-footnote">
          2026-09-01 확정 — PLANNING.md·STRATEGY.md 기반. 이제 데이터는 DB(MandalartItem)에서
          불러오며, 항목 클릭 시 상세 페이지로 이동한다.
        </p>
      </div>
    </div>
  );
}
