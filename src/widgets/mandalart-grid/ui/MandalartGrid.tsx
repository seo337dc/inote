import "./mandalart.css";

type CellVariant = "item" | "theme" | "goal" | "empty" | "empty-theme";

type Cell = {
  text?: string;
  variant: CellVariant;
  blk?: string;
};

const item = (text: string, blk: string): Cell => ({ text, variant: "item", blk });
const theme = (text: string, blk: string): Cell => ({ text, variant: "theme", blk });
const emptyTheme = (text: string, blk: string): Cell => ({
  text,
  variant: "empty-theme",
  blk,
});
const empty = (blk: string): Cell => ({ variant: "empty", blk });
const goal = (text: string): Cell => ({ text, variant: "goal" });

// 9x9 grid, row-major. Mirrors docs/mandalart.html exactly.
const CELLS: Cell[] = [
  // Row 1
  item("노션 스타일 에디터 만들기", "t2"),
  item("글 목록·상세·카테고리 필터", "t2"),
  item("inote-server에 blog 모듈 추가", "t2"),
  item("NestJS 모듈 구조 복습", "t3"),
  item("Prisma 마이그레이션 연습", "t3"),
  item("Better Auth 동작 이해", "t3"),
  item("Groq 채팅 연동 (devlog 재사용)", "t4"),
  item("MCP 개념 익히기", "t4"),
  item("블로그 데이터 MCP로 노출", "t4"),
  // Row 2
  item("Prisma Post 모델 설계", "t2"),
  theme("UI·BE 개발", "t2"),
  item("Better Auth 로그인 재사용", "t2"),
  item("기존 코드 컨벤션 파악", "t3"),
  theme("BE 기술학습", "t3"),
  item("REST API 설계 원칙 복습", "t3"),
  item("Claude Code와 MCP 연동해보기", "t4"),
  theme("LLM+MCP", "t4"),
  item("LLM 함수 호출(tool use) 실습", "t4"),
  // Row 3
  item("글 CRUD API 만들기", "t2"),
  item("LLM 챗 UI 에디터 옆에 붙이기", "t2"),
  item("여러 계정으로 실제 테스트", "t2"),
  item("인증 토큰·세션 흐름 이해", "t3"),
  item("money·daily 모듈 구조 참고", "t3"),
  item("새 모듈 영향범위 파악", "t3"),
  item("LLM 제공자 전환 가능하게 설계", "t4"),
  item("스트리밍 응답 패턴 재사용", "t4"),
  item("시스템 프롬프트 관리", "t4"),
  // Row 4
  item("RAG 파이프라인 구현", "t5"),
  item("임베딩 모델 최종 확정", "t5"),
  item("pgvector 실전 적용", "t5"),
  theme("UI·BE 개발", "t2"),
  theme("BE 기술학습", "t3"),
  theme("LLM+MCP", "t4"),
  item("만다라트 9번 채우기", "t6"),
  item("성공 지표 정기 점검", "t6"),
  item("실제 필요할 때만 기능 추가", "t6"),
  // Row 5 (center row)
  item("LLM-as-a-Judge로 글 평가", "t5"),
  theme("AI 기술학습", "t5"),
  item("Agent AI vs Workflow 계속 학습", "t5"),
  theme("AI 기술학습", "t5"),
  goal("노션 + 블로그 + LLM"),
  theme("프로덕트 기획", "t6"),
  item("대안 제시→사람 승인 지키기", "t6"),
  theme("프로덕트 기획", "t6"),
  item("Task 단위로 끊어서 진행", "t6"),
  // Row 6
  item("프롬프트 엔지니어링 정리", "t5"),
  item("벡터 검색 top-k·임계값 튜닝", "t5"),
  item("배운 개념은 docs/study에", "t5"),
  theme("Infra·DevOps", "t7"),
  theme("테스트(E2E)", "t8"),
  emptyTheme("미정", "t9"),
  item("학습·이직·일기 우선순위 정하기", "t6"),
  item("멀티유저 확장 로드맵 그리기", "t6"),
  item("devlog-llm 교훈 반영하기", "t6"),
  // Row 7
  item("Vercel+Render+Neon 무료 조합", "t7"),
  item("Python 서비스 별도 DB 준비", "t7"),
  item("CI(lint·빌드) 파이프라인 구축", "t7"),
  item("Playwright 기본 세팅", "t8"),
  item("로그인 플로우 E2E 테스트", "t8"),
  item("글 작성→발행 흐름 테스트", "t8"),
  empty("t9"),
  empty("t9"),
  empty("t9"),
  // Row 8
  item("GitHub 연동 배포 자동화", "t7"),
  theme("Infra·DevOps", "t7"),
  item("이후 AWS 이전 계획 수립", "t7"),
  item("LLM 챗 스트리밍 흐름 테스트", "t8"),
  theme("테스트(E2E)", "t8"),
  item("CI에 E2E 테스트 통합", "t8"),
  empty("t9"),
  emptyTheme("미정", "t9"),
  empty("t9"),
  // Row 9
  item("비용 모니터링 습관", "t7"),
  item("콜드스타트·슬립 이슈 대응", "t7"),
  item("환경변수·시크릿 체계화", "t7"),
  item("여러 계정 시나리오 테스트", "t8"),
  item("회귀 테스트 습관 들이기", "t8"),
  item("배포 전 자동 확인 습관화", "t8"),
  empty("t9"),
  empty("t9"),
  empty("t9"),
];

function cellClassName(cell: Cell) {
  const classes = ["mandalart-cell", `mandalart-cell--${cell.variant}`];
  if (cell.blk) classes.push(`blk-${cell.blk}`);
  return classes.join(" ");
}

export default function MandalartGrid() {
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
            노션 + 블로그 + LLM. 8대 축 중 7개 확정, 9번은 아직 비워둠 — 점선 칸은 나중에
            채울 자리.
          </p>
        </header>

        <div className="mandalart-grid-scroll">
          <div className="mandalart-grid">
            {CELLS.map((cell, i) => (
              <div key={i} className={cellClassName(cell)}>
                {cell.text}
              </div>
            ))}
          </div>
        </div>

        <div className="mandalart-legend">
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch goal" />
            핵심 목표
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch theme" />
            8대 축 (7개 확정)
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch item" />
            실천 항목
          </span>
          <span className="mandalart-legend-item">
            <span className="mandalart-legend-swatch empty" />
            9번 — 아직 미정
          </span>
        </div>

        <p className="mandalart-footnote">
          2026-09-01 확정 — PLANNING.md·STRATEGY.md 기반. 9번 축 정해지면 이 페이지도 마저
          채울 것. (원본: <code>docs/mandalart.html</code>)
        </p>
      </div>
    </div>
  );
}
