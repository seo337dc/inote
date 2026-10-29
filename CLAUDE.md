# CLAUDE.md — inote

> **새 세션 시작 시 필수:** `docs/handoff/HANDOFF.md`를 먼저 읽는다 (레포 3개에 걸친 현재 상태·내일 할 일).
> (순서: `git pull` → `HANDOFF.md` → 이 파일)

새 세션(다른 PC, 다른 AI 포함)에서 이 프로젝트를 이어받을 때 먼저 읽는 파일. 자세한 배경은
`PLANNING.md`(왜 만들고 뭘 성공으로 볼지), `STRATEGY.md`(무엇을 만들지)를 참고.

> **2026-09-10: 모노레포 구조로 전환.** 최종 목표가 "블로그"가 아니라 **할일 리스트·일지·독서·글쓰기
> 등을 기록하는 개인 기록 앱**이고 모바일(웹뷰) 앱도 예정돼 있어, `inote-money`와 동일하게
> `apps/web`(Next.js) / `apps/app`(RN 앱, 미착수)으로 분리함. 문서 곳곳의 "블로그" 표현은 이 전환
> 이전에 쓰인 것이라 점진적으로 정리 중 — 지금은 글쓰기 기능이 처음 구현된 모듈이라는 의미로 남아 있음.

---

## 프로젝트 한 줄 요약

할일 리스트·일지·독서·글쓰기(노션처럼 쓰는 기록) 등을 기록하고, 그 기록을 LLM이 분석·평가·검색해주는
iNote 시리즈의 개인 기록 앱. devlog-llm(개인 실험용 선행 프로젝트)의 후속으로, 인증·DB는 기존
`inote-server`를 재사용하고 LLM/AI 부분만 별도 Python 서비스(`inote-ai`)로 새로 만든다.

## 현재 상태 (2026-10-28 기준 — 코드로 확인한 것만)

- **구현·배포됨**: 글쓰기(Tiptap 에디터, 표·콜아웃·체크리스트·이미지 업로드, 임시저장/발행), 글 보관함(`/my-posts/archive`, main 병합 — 운영 배포는 BE 먼저라 확인 필요), 카테고리(트리,
  글이 id로 참조, 드래그 이동), LLM 챗, 이메일/Google 로그인, 독서 기록(`/reading`), 할 일 목록(`/todos`),
  만다라트(`/dev-guide`), 관리자(`/admin`), 프로필·회원 탈퇴
- **"준비 중" 표시만 있음**: 일지(`/journal`), 대시보드(`/dashboard`) — 다른 기능이 다 완성된 뒤에 진행
- **모바일 앱(`apps/app`)**: 계획만 있고 미착수
- 기능별 구현 경위·결정은 [`docs/devlog/fe.md`](./docs/devlog/fe.md), 세션 인수인계는
  [`docs/handoff/HANDOFF.md`](./docs/handoff/HANDOFF.md)(10/7 기준 + 10/8~28 변경 목록·남은 일, 운영 반영 여부는 확인 필요)

## 레포 구조

```
inote/
├── apps/
│   ├── web/   ← Next.js 웹 서비스 (소스 구조는 apps/web/src 가 진짜 소스, FSD)
│   └── app/   ← React Native 앱 (예정, 미착수 — inote-money/apps/app과 동일 패턴)
├── docs/
│   ├── handoff/   ← 세션 인수인계 (HANDOFF.md)
│   ├── adr/       ← 결정 기록·설계 계약 (번호 순)
│   ├── design/    ← 설계 근거 (FSD.md)
│   ├── devlog/    ← 개발 일지 (fe.md) — 개발 일지는 이 파일 하나
│   ├── learning/  ← 학습용 문서 전용 (README.md가 목차)
│   ├── todo/      ← 이번에 안 하고 남긴 일 (기능별 파일)
│   ├── blog/      ← 블로그 글·초안
│   └── kure/      ← KURE 임베딩 설계·인수인계 (inote-server가 이 경로를 참조 — 옮기지 말 것)
├── .claude/agents/ ← 서브에이전트 정의 (strategist · code-reviewer · debugger · test-runner)
├── .github/       ← pull_request_template.md (PR description 형식)
├── CLAUDE.md      ← 이 파일 (전체 레포 공통 컨텍스트)
├── PLANNING.md / STRATEGY.md
```

> 폴더 목록·컴포넌트 목록은 문서에 손으로 옮겨 적지 않는다 — 코드(`apps/web/src`)가 소스.
> 서버 API 엔드포인트도 여기 적지 않는다 — `inote-server`의 Swagger(`/api/docs`)가 소스.
> (손으로 유지하는 목록은 몇 달 지나면 실제와 어긋나서 낡은 정보를 사실로 믿게 됨)

## 아키텍처

```
inote (apps/web)        - Next.js — 글쓰기/노션 UI, 독서·할 일·만다라트·관리자, LLM 챗 UI
inote (apps/app)        - React Native + WebView (예정, 미착수)
inote-server(blog모듈)  - NestJS (별도 레포, 공통 백엔드) — 글 CRUD, 인증(Better Auth 재사용)
inote-ai               - Python + FastAPI (https://github.com/seo337dc/inote-ai, 별도 DB) — LLM 채팅·임베딩·RAG
```

- `inote-server`는 iNote 시리즈 공통 백엔드(`money/`, `daily/`, `goal/`과 같은 위치에 `blog/` 모듈 추가).
  인증·유저·DB를 새로 만들지 않고 그대로 재사용.
- Python 서비스는 자체 로그인이 없음 — FE가 이미 인증된 `user_id`/이메일을 파라미터로 넘기고,
  Python은 그 값을 신뢰해서 데이터만 태깅 (devlog-llm의 `session_id` 패턴과 동일). 실제 인증
  검증은 필요해지면 나중에 추가.
- Python이 RAG용으로 블로그 글 내용이 필요하면 `inote-server`의 blog API를 호출해서 가져옴
  (DB가 다르므로 직접 조인 불가).

상세 근거는 `PLANNING.md`의 "아키텍처 결정" 항목 참고.

## 코드 구조 (FSD)

`apps/web/src/`는 Feature-Sliced Design으로 구성 (`app → pages → widgets → features → entities → shared`,
상위가 하위만 import 가능, `eslint-plugin-boundaries`로 실제 강제됨). FSD의 `pages` 레이어는
Next.js Pages Router와 이름이 겹쳐서 폴더명은 `views`를 씀. 설계 근거·레이어별 내용은
[`docs/design/FSD.md`](./docs/design/FSD.md) 참고.

## 로컬 개발

```bash
cd apps/web
pnpm install
pnpm dev     # http://localhost:3011
pnpm lint    # FSD 레이어 위반도 여기서 잡힘
pnpm build
```

shadcn/ui 적용됨 (`components.json`, inote-money와 동일한 초록 테마). 새 컴포넌트는
`npx shadcn@latest add <name>`.

## 배포

- FE: Vercel (`https://inote-main.vercel.app`)
- AI 서버(`inote-ai`): **Vercel** (`https://inote-ai-cyan.vercel.app`) — Render 무료 한도 초과로 2026-09-30 이전
- BE(`inote-server`): Render 무료 (서비스 1개만 상시 → 월 750시간 안). 정지 이력과 결정은 `docs/adr/0003-hosting-migration.md`
- DB: **Supabase** (BE용, AI용 프로젝트 별도) — 2026-10-02 이전 완료. 이전 기록은 `inote-server/docs/adr/0001-neon-to-supabase.md`, Neon은 롤백용으로 남겨뒀다고 10/2 기준 HANDOFF에 적혀 있음 (현재 삭제 여부는 확인 필요)

## Git / GitHub 계정 (중요 — 새 머신에서는 재설정 필요)

이 레포는 개인 계정 `seo337dc` 전용으로 쓰도록 **로컬 전용** git 설정을 해뒀음 (`.git/config`,
커밋되지 않으므로 새로 클론하면 없음):
- `user.name`/`user.email`을 `seo337dc` 명의로 로컬 설정
- push 인증도 `seo337dc` 토큰만 쓰도록 `credential.helper` 로컬 오버라이드

> `inote-server`도 원래 이 오버라이드가 없어서 회사 이메일로 커밋되고 있었음 (2026-09-01 발견,
> 같은 방식으로 로컬 오버라이드 추가해서 해결 — 이전 커밋 이력은 그대로 둠).

## AI 협업 규칙 (Claude Code ↔ Cursor)

devlog-llm과 동일한 방식 유지.

| 도구 | 담당 |
|------|------|
| **Claude Code** | 설계·구현 — 세팅, API, 페이지, 도메인 로직 |
| **Cursor** | Task 완료 후 QA, 리뷰·리팩토링, 문서·devlog·PR 정리 |
| **사람** | 기획·UX·아키텍처 판단 및 승인 |

- 기획·UX·아키텍처는 AI가 임의로 결정하지 않는다. 대안 제시 → **사람이 승인** 후 반영.
- Task 단위로 끊어서 구현하고, Task마다 확인한다.
- **커밋·PR·push는 사람이 명시적으로 요청할 때만 한다.** Task(기능 구현, lint/build 통과, 브라우저
  검증)가 끝났다고 해서 자동으로 커밋·푸시까지 이어가지 않는다 — "구현해줘"는 커밋 요청이 아니다.
  구현이 끝나면 결과만 보고하고 멈춘다. (2026-09-03: 마크다운 붙여넣기 기능 구현 후 요청 없이
  자동으로 커밋·푸시까지 진행해서 사용자가 정정함 — 이 규칙이 이미 있었는데도 지켜지지 않았던 사례.)
- **커밋을 한 번에 몰아서 하지 않는다.** 여러 기능/파일을 한 세션에서 고쳤어도 커밋은 기능 단위로
  쪼개서 각각 따로 만든다 (2026-09-20 추가 — `inote-server`/`inote-money`/`inote` 공통 규칙).
- **작업은 항상 새 브랜치에서 한다. `main`에 직접 커밋·push하지 않는다** (2026-10-23 추가, `inote-server`/`inote-money`/`inote` 공통).
  - 커밋하기 전에 현재 브랜치를 확인한다. `main`이면 먼저 새 브랜치를 만든다. 이미 있는 브랜치가 이번 작업과 무관하거나
    **이미 main에 병합된 브랜치**면 그 위에 이어서 커밋하지 않고 **최신 `origin/main`에서 새 브랜치를 딴다**
    (`git fetch` → `git checkout -b <새 브랜치> origin/main`).
  - 브랜치 이름은 `feat/`·`fix/`·`docs/`·`chore/` + 한 줄 요약(영문 kebab-case).
  - `main`으로 가는 길은 **PR 하나뿐**이다. `git push origin main`, `main`으로의 force push, PR 없이 `main`에 병합하는 것은
    사용자가 요청해도 먼저 이 규칙을 상기시키고 확인한다. 병합 자체는 사람이 한다.
  - 사용자가 푸시를 요청했을 때도 브랜치 푸시(`git push -u origin <브랜치>`)만 한다. PR 생성은 별도 요청이 있을 때만.
- **커밋할 때는 PR description도 함께 작성한다** (2026-10-23 추가, `inote-server`와 공통) — 사용자가 커밋을
  요청하면 커밋 직후, 그 브랜치의 PR description 초안을 [`.github/pull_request_template.md`](.github/pull_request_template.md)
  형식(개요 / 변경 내용 / 배포 시 주의 / 테스트 / 문서 갱신 / 알려진 한계·후속)에 맞춰 작성해 사용자에게
  보여준다. 규칙:
  - 제목은 커밋과 같은 컨벤션(`feat:`/`fix:`/`docs:` + 한 줄 요약). 본문 끝에 시스템이 지정한 attribution 줄.
  - "테스트"에는 **실제로 실행한 것만** 체크하고, 안 돌린 것(E2E 등)은 안 돌렸다고 이유와 함께 적는다.
  - "배포 시 주의"는 서버 API 변경과 동시 배포 여부(BE 먼저/동시), inote-ai 변경, Vercel 환경변수 중 해당하는
    것을 반드시 확인해 적는다 (해당 없으면 "없음").
  - 초안은 사용자가 확인한 뒤에만 쓴다. **PR 생성·push는 사용자가 명시적으로 요청할 때만** 한다 (위
    "커밋·PR·push" 규칙 그대로 — PR description 작성은 허락 없이 PR을 만들어도 된다는 뜻이 아님).
  - 커밋을 기능 단위로 쪼갰다면 PR description의 "변경 내용"도 커밋 단위로 묶어서 적는다.
- **테스트는 작업 단위마다, 커밋 전에는 e2e까지 돌린다** (2026-09-20 추가) — 상세 체크리스트는
  아래 "✅ 커밋 전 체크리스트" 참고.
- **학습용 문서는 무조건 `docs/learning/`에 둔다** (2026-10-23 추가, `inote-server`와 공통) — 개념 설명·
  학습 노트·튜토리얼·가이드처럼 "프로젝트 사실"이 아니라 "배우기 위한" 문서는 새로 만들 때도, 학습
  내용을 정리해 달라고 할 때도 항상 `docs/learning/` 아래에 만든다. 레포 루트나 `docs/` 바로 아래에
  두지 않는다. 학습 문서가 늘면 `docs/learning/README.md` 목차에 한 줄 추가한다.
- **사실 정보는 코드가 소스** (2026-10-23 추가) — 파일·컴포넌트·라우트·서버 API 목록을 문서에 손으로
  옮겨 적지 않고 소스 위치만 링크한다. 문서는 규칙·결정·"왜"만 적는다.
- **서브에이전트 사용 원칙** (2026-10-28 추가, 정의는 `.claude/agents/*.md`: strategist·code-reviewer·debugger·test-runner)
  - 조사·점검·테스트 실행처럼 결과 요약만 필요한 일에 쓴다. 설계 결정, 사용자와 합의가 필요한 일,
    몇 번의 도구 호출로 끝나는 작은 일은 메인 세션에서 직접 한다.
  - 서브에이전트에게는 대화 맥락이 전달되지 않으므로 브리핑에 목표·범위·하지 말 것·출력 형식을 쓴다.
  - 보고서는 근거(`파일:줄`)를 확인하고 사실로 받아들인다. 설계 결정은 사용자에게 돌려준다.
  - `.claude/agents/`의 에이전트는 세션 시작 때 읽으므로, 새로 만들거나 고친 뒤에는 새 세션에서 반영된다.
  - `inote-server`에도 같은 이름의 에이전트(서버용 관점)가 있다. FE 작업 세션은 `inote` 폴더만 열어서 FE 정의를
    쓴다 (두 레포를 같이 열면 서버 정의가 대신 읽힐 수 있음).
- AI가 제안하는 기능 확장은 기본적으로 의심한다.

### FE 작업 원칙 (중요 — 2026-09-03 추가)

- **화면을 먼저 만들지 않는다.** "일단 만들어보고 보여준다"는 이 레포에서 하지 않는다.
- 화면이든 컴포넌트든, **뭐든 하나하나 먼저 의논하고 사용자 확인을 받은 뒤에만 작업한다.**
  여러 개를 한 번에 만들지 않는다 — 화면 하나, 결정 하나 단위로 끊는다.
- (배경: 2026-09-03에 7개 화면을 한 번에 목업으로 만들었는데, 사용자가 그 방식 대신 하나씩
  의논하며 진행하길 원한다고 명시적으로 정정함.)
- **버튼(및 버튼처럼 클릭되는 요소)에는 기본적으로 마우스 hover 스타일을 넣는다.** 새로
  만드는 버튼은 처음부터 `hover:` 클래스를 포함해서 작성한다. (2026-09-04 추가)

### ✅ 커밋 전 체크리스트 (매번 이 순서 그대로, 2026-09-22 추가)

기능/컴포넌트 하나를 완성했을 때 — 커밋하기 직전, 예외 없이:

- [ ] **단위/컴포넌트 테스트** — 새로 만들거나 수정한 로직/컴포넌트에 대해 Vitest + React
      Testing Library 테스트 작성/보강 후 `cd apps/web && pnpm test` 전체 통과
- [ ] **Lint** — `pnpm lint`로 FSD 레이어 위반 등 확인
- [ ] **빌드** — `pnpm build`로 타입 에러 없는지 확인
- [ ] **E2E 테스트** — `pnpm test:e2e`(Playwright, 로컬에 `inote-server`가 떠 있어야 함)로
      로그인 같은 핵심 흐름이 안 깨졌는지 확인
      ⏸ **보류 중 (2026-09-29)**: Playwright 확장은 잠시 대기 — 재개 결정 전까지 새 E2E 테스트를
      추가하지 않는다. 기존 `e2e/login.spec.ts`는 그대로 두고, 이 항목은 재개 전까지 건너뛰어도 된다.
- [ ] **CLAUDE.md 문서 최신화** — 이번 작업으로 레포 구조/현재 상태/다음 할 일 등 이 파일에
      적힌 사실 정보가 바뀌었다면, 커밋 전에 해당 섹션을 그 자리에서 갱신한다 (나중으로 미루면
      다음 세션에서 낡은 정보를 사실로 믿고 작업하게 됨)
- [ ] 다섯 가지 다 통과한 뒤에만 커밋 (커밋/푸시 자체는 사용자가 명시적으로 요청했을 때만)

> 실무에서는 이 순서를 CI(GitHub Actions 등)가 자동으로 강제해서 사람이 깜빡해도 머지가
> 막히는데, 지금은 CI가 없어서 사람이 직접 챙겨야 함. **AI도 매 기능 단위로 이 체크리스트를
> 빠짐없이 실제로 실행하고 결과를 보여줄 것** — 산문 속에 묻혀서 계속 빠뜨려지길래 체크리스트
> 형태로 바꿈. FE 테스트 개념 자체가 처음이라면 [`docs/learning/FE_TESTING.md`](./docs/learning/FE_TESTING.md) 먼저 읽을 것.

### 기능 추가·수정 작업 순서: 계약 → FE → BE → 통합 (2026-09-29 추가)

기능을 새로 만들거나 고칠 때는 아래 순서로 진행한다. **작은 수정(문구·스타일·한두 줄 버그)은
FE 유닛 테스트만으로 충분** — 전 단계는 새 기능 단위에만 적용한다.

1. **API 계약 합의** — 엔드포인트·요청·응답 모양(타입)을 짧게 적어 사람이 승인한다.
   이 계약이 FE의 MSW 목 데이터와 BE 구현의 기준이 된다. (FE부터 가도 어긋나지 않게 하는 장치)
2. **FE 먼저** (Claude가 구현 + 테스트 작성) — 같은 동작을 여러 층에서 중복 검증하지 않는다.
   - **유닛 테스트**: 순수 로직 (예: 목차 생성, 트리 조립)
   - **MSW 컴포넌트 테스트**: 화면 동작과 API 응답별 분기 (성공/실패/빈 목록)
   - **Playwright**: ⏸ 보류 (위 체크리스트 참고). 재개 시 사용자 흐름 몇 개 + jsdom으로 확인 못 하는
     것(스크롤·레이아웃·애니메이션)만 대상으로 한다.
   - 각 테스트가 **무엇을 지켜주는지 한 줄씩 사람에게 설명**한다. (테스트를 읽지 않고 요약만 받는
     상태를 막기 위해)
3. **BE** (**사람이 테스트를 직접 작성**) — Claude는 구현 전에 **테스트 목록 + 골격**만 준다.
   사람이 케이스를 채우고, 그 테스트가 통과하도록 구현/수정한다. (Nest jest + 서비스에 mock 주입 —
   Spring의 JUnit + Mockito와 같은 개념이라 이직 준비에도 연결됨)
4. **통합 테스트** — FE와 BE를 함께 띄워 계약이 어긋나지 않았는지(= MSW 목이 실제 BE와 일치하는지)
   확인한다. ⚠️ **로컬 BE의 기본 `DATABASE_URL`은 운영 Supabase DB라서, 통합 테스트는 반드시 로컬 개발 DB
   (도커 Postgres)에서만 돌린다.** BE를 `inote-server`의 `scripts/dev-db.sh start`로 띄우면 개발 DB로
   연결된다 (절차: `inote-server/docs/runbooks/local-dev-db.md`). 그렇게 띄우지 않았다면 통합 테스트를
   돌리지 않는다. FE를 개발 BE에 붙일 때는 `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev`.

- 기능 단위 완료 시 결과만 보고하고 멈춘다 — 다음 단계(FE→BE→통합) 진행 여부는 사람이 정한다.
- 버그를 발견하면 가능하면 **먼저 실패하는 테스트로 재현**한 뒤 고친다.
- **이번에 하지 않고 남긴 기능("후속")은 `docs/todo/`에 기록한다** (2026-10-21 추가). 기능마다 파일을 하나 만들고(예: `docs/todo/editor-image-upload.md`), 항목은 체크박스로 적는다. 구두로만 "나중에"라고 하고 흘려보내지 않는다.

## 알아둘 것 (겪었던 문제들)

- **`src/pages`는 쓰지 않는다**: Next.js가 레거시 Pages Router로 인식해서 App Router와 라우팅
  충돌남. FSD의 `pages` 레이어는 폴더명 `src/views`로 대신 씀 (`docs/design/FSD.md` 참고).
- **`eslint-plugin-boundaries`는 v7 문법 사용**: `element-types`+`rules`가 아니라
  `dependencies`+`policies`(`from`/`to`를 `{ element: { type } }`로 감쌈). 온라인 예시 상당수가
  구버전 문법이라 그대로 베끼면 deprecated 경고가 뜸.
- **로컬 dev 서버 종료 시 자식 프로세스까지 확인**: `next dev`를 `kill`할 때 부모만 죽이면 실제
  `next-server`/turbopack worker 자식 프로세스가 포트를 계속 점유한 채 남을 수 있음.
  `lsof -iTCP:PORT -sTCP:LISTEN`과 `ps -ef`로 실제 리스닝 PID를 확인하고 전부 종료할 것.

## 다음 할 일

> 이 절은 **열려 있는 일만** 적는다. 끝난 일의 경위는 [`docs/devlog/fe.md`](./docs/devlog/fe.md)에,
> 기능별 후속은 [`docs/todo/`](./docs/todo/)에 둔다. (2026-10-23: 완료 항목 정리)

- [ ] 일지 기능 착수 여부·순서 결정, 각 기능의 상세 기능 기획 (할 일 목록은 구현됨 — 후속 범위는 사람이 정함)
- [ ] **FE 테스트 작성 (2026-09-22 추가, 우선순위 순)** — 완료할 때마다 체크. 체크 기준은 "테스트 파일이
      있는지"만 확인한 것이라 커버리지가 충분한지는 확인 필요.
  - 1순위 (2026-09-23 완료)
    - [x] `features/mark-inote-used/MarkInoteUsed`
    - [x] `views/admin/ui/UsageBadge`
    - [x] `views/admin/ui/AdminUserDetailModal`
  - 2순위 (로직 복잡한데 테스트 파일이 없음 — `auth-errors.ts`부터 추천, mock 불필요)
    - [ ] `shared/lib/auth-errors.ts` — 에러 코드 → 한글 메시지 매핑
    - [ ] `features/write-post/WritePostForm` — draft 이어쓰기 분기, 저장/발행 분기
    - [ ] `features/edit-profile/ProfileForm` — 비밀번호 생성/변경 분기, 계정 연결 목록
    - [ ] `widgets/nav/AuthNavAction` — 로그인/로그아웃 상태 분기
    - [x] `views/admin/AdminMembersPage` — 테스트 파일 있음
  - 3순위
    - [x] `features/filter-posts-by-category` (`CategoryFilter.test.tsx`)
    - [x] `features/manage-categories/CategoryManager`
  - E2E: 글쓰기 → 발행 → 목록 노출 흐름 1개 추가 검토 (회원 삭제는 파괴적 액션이라 자동화 제외) —
    Playwright는 보류 중
  - 제외(테스트 가치 낮음): `entities/*/api/*`(순수 fetch 래퍼), 단순 조합만 하는 `views/*`,
    `shared/ui`의 서드파티 래퍼 컴포넌트
- [ ] 문서 안에 남아 있는 `src/...` 경로 표기를 `apps/web/src/...`로 정리 (2026-09-10 모노레포 전환 후
      남은 자잘한 정리, 급하지 않음 — `docs/learning/NEXTJS_ERROR_HANDLING.md` 등)
- [ ] 문서 정리 후속: `docs/kure/` 위치 정리 등 — 계획은 `docs/todo/docs-cleanup.md`
