# CLAUDE.md — inote

새 세션(다른 PC, 다른 AI 포함)에서 이 프로젝트를 이어받을 때 먼저 읽는 파일. 자세한 배경은
`PLANNING.md`(왜 만들고 뭘 성공으로 볼지), `STRATEGY.md`(무엇을 만들지)를 참고.

> **2026-09-10: 레포명 `inote-blog` → `inote`로 변경 + 모노레포 구조로 전환.**
> 최종 목표가 "블로그"가 아니라 **할일 리스트·일지·독서·글쓰기 등을 기록하는 개인 기록 앱**이라
> 이름을 바꿨고, 모바일(웹뷰) 앱 개발도 예정돼 있어 `inote-money`와 동일하게
> `apps/web`(기존 Next.js 앱) / `apps/app`(RN 앱, 미착수)으로 분리함. 아래 문서 내용 중
> "블로그" 표현은 이 전환 이전에 쓰인 것들이라 점진적으로 정리 예정 — 지금은 글쓰기 기능이
> 처음 구현된 모듈이라는 의미로 남겨둠.

---

## 프로젝트 한 줄 요약

할일 리스트·일지·독서·글쓰기(노션처럼 쓰는 기록) 등을 기록하고, 그 기록을 LLM이 분석·평가·검색해주는
iNote 시리즈의 개인 기록 앱. devlog-llm(개인 실험용 선행 프로젝트)의 후속으로, 인증·DB는 기존
`inote-server`를 재사용하고 LLM/AI 부분만 별도 Python 서비스(`inote-ai`)로 새로 만든다.

## 현재 상태 (2026-09-10 기준)

- 글쓰기(블로그) 기능부터 먼저 구현 완료: 글 CRUD, 카테고리, LLM 챗 UI, 이메일/Google
  로그인·회원가입·로그아웃까지 실서비스 배포됨
- 할일 리스트·일지·독서 기능은 아직 미착수 — 메뉴/페이지는 만들어뒀고(`/todos`, `/journal`,
  `/reading`, 전부 "준비 중" 표시만) **실제 기능 구현은 보류, 다음에 진행 예정** (2026-09-10)
- 대시보드(`/dashboard`, 로그인 후 첫 화면 예정)도 페이지만 있고 "준비 중" — 다른 기능들 다 완성된
  뒤에 꾸미기로 함
- 모바일 앱(`apps/app`)은 계획만 있고 미착수

## 레포 구조

```
inote/
├── apps/
│   ├── web/   ← Next.js 웹 서비스 (기존 inote-blog 코드 전체 이동)
│   └── app/   ← React Native 앱 (예정, 미착수 — inote-money/apps/app과 동일 패턴)
├── docs/
├── CLAUDE.md  ← 이 파일 (전체 레포 공통 컨텍스트)
├── PLANNING.md / STRATEGY.md / TODO.md
```

## 아키텍처

```
inote (apps/web)        - Next.js — 글쓰기/노션 UI + LLM 챗 UI (할일·일지·독서는 추후 추가)
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
[`docs/FSD.md`](./docs/FSD.md) 참고.

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

아직 배포 전. devlog-llm/inote-money와 동일하게 Vercel(FE)+Render(BE)+Neon(DB) 무료 티어 조합
예정, 이후 AWS 검토 (만다라트 7번 축).

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
- **테스트는 작업 단위마다, 커밋 전에는 e2e까지 돌린다** (2026-09-20 추가) — 상세 체크리스트는
  아래 "✅ 커밋 전 체크리스트" 참고.
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
- [ ] **CLAUDE.md 문서 최신화** — 이번 작업으로 레포 구조/현재 상태/다음 할 일 등 이 파일에
      적힌 사실 정보가 바뀌었다면, 커밋 전에 해당 섹션을 그 자리에서 갱신한다 (나중으로 미루면
      다음 세션에서 낡은 정보를 사실로 믿고 작업하게 됨)
- [ ] 다섯 가지 다 통과한 뒤에만 커밋 (커밋/푸시 자체는 사용자가 명시적으로 요청했을 때만)

> 실무에서는 이 순서를 CI(GitHub Actions 등)가 자동으로 강제해서 사람이 깜빡해도 머지가
> 막히는데, 지금은 CI가 없어서 사람이 직접 챙겨야 함. **AI도 매 기능 단위로 이 체크리스트를
> 빠짐없이 실제로 실행하고 결과를 보여줄 것** — 산문 속에 묻혀서 계속 빠뜨려지길래 체크리스트
> 형태로 바꿈. FE 테스트 개념 자체가 처음이라면 [`LEARNING.md`](./LEARNING.md) 먼저 읽을 것.

## 알아둘 것 (겪었던 문제들)

- **`src/pages`는 쓰지 않는다**: Next.js가 레거시 Pages Router로 인식해서 App Router와 라우팅
  충돌남. FSD의 `pages` 레이어는 폴더명 `src/views`로 대신 씀 (`docs/FSD.md` 참고).
- **`eslint-plugin-boundaries`는 v7 문법 사용**: `element-types`+`rules`가 아니라
  `dependencies`+`policies`(`from`/`to`를 `{ element: { type } }`로 감쌈). 온라인 예시 상당수가
  구버전 문법이라 그대로 베끼면 deprecated 경고가 뜸.
- **로컬 dev 서버 종료 시 자식 프로세스까지 확인**: `next dev`를 `kill`할 때 부모만 죽이면 실제
  `next-server`/turbopack worker 자식 프로세스가 포트를 계속 점유한 채 남을 수 있음.
  `lsof -iTCP:PORT -sTCP:LISTEN`과 `ps -ef`로 실제 리스닝 PID를 확인하고 전부 종료할 것.

## 다음 할 일

### 다음 세션 우선순위 (2026-09-23 예정, 순서대로)

1. **테스트 세팅** — 아래 "FE 테스트 작성" 1순위(`MarkInoteUsed` 등)부터 시작하면 훅 mock이
   이 프로젝트에서 처음이라, 본격적으로 쓰기 전에 공통 mock 패턴/test-utils 먼저 정리
2. **만다라트 "E2E 테스트" 항목 수정** — 지금 만다라트에 "E2E 테스트"로만 적혀있는 항목을
   "테스트"로 이름 변경하고, 내용을 FE/BE 테스트 항목 + 테스트 세팅 + 테스트 학습까지
   포괄하도록 확장 (지금 이름이 범위를 너무 좁게 표현하고 있음)
3. **독서 기능** (2026-09-22 분석 완료, 요구사항: 제목/저자/기간/카테고리, 책 이미지, 메모(선택),
   독후감(선택), 저장 후 AI 설명, 옆에서 LLM으로 책 관련 대화)
   - 재사용 가능: `widgets/chat-dock`+`useChatMessages`가 이미 거의 같은 걸 함 — 근데 `post_id`/
     `post_title`/`post_category`로 완전히 post 전용 하드코딩돼 있어서, book도 쓰려면 일반화
     필요. `blog.service.ts`의 `summarize()`(저장 시 inote-ai `/summarize` 호출 → `PostSummary`
     upsert) 패턴도 그대로 복제 가능
   - 새로 필요: 이미지 업로드 인프라가 이 프로젝트에 전혀 없음(S3/Cloudinary 등 없음, `user.image`는
     구글이 준 외부 URL 문자열일 뿐). DB 모델명 `Book`/`BookLike`는 `inote-money`가 이미 선점 —
     충돌 안 나게 `ReadingBook` 등 다른 이름 필요
   - 열린 질문: (1) 이미지 실제 업로드 vs URL만 입력 (2) 카테고리 고정 목록 vs 커스텀 트리 기능
     기다리기 (3) AI 설명 자동 생성 vs 버튼 트리거 (4) 채팅 진입이 글쓰기처럼 자동 전환인지
     (5) `inote-ai`는 로컬 미클론 상태라 그쪽 작업 주체를 정해야 함
   - 범위 제안: 1~4(CRUD, 이미지는 우선 URL 방식) 먼저 하나로 끝내고, 5~6(AI 설명·채팅)은
     `inote-ai` 일반화 작업과 묶어서 별도 단계로 — 아래 4·5번과 자연스럽게 맞물림
4. 이미지 업로드 관련 준비
5. 3개 기능 LLM 세팅
6. 각 기능의 상세 기능 기획

- [ ] **FE 테스트 작성 (2026-09-22 추가, 우선순위 순)** — 전부 한 번에 하지 않고 체크된 만큼만
      진행. 완료할 때마다 체크만 해도 진행 상황이 보임.
  - 1순위 (이번 세션에 만든 신규 코드) — 2026-09-23 완료, 커밋 `f46190c`/`77ee1ec`
    - [x] `features/mark-inote-used/MarkInoteUsed` — 세션 감지 → 1회성 api 호출 로직
    - [x] `views/admin/ui/UsageBadge` — 사용/미사용 뱃지 분기
    - [x] `views/admin/ui/AdminUserDetailModal` — 앱 이용 현황 테이블 + 삭제 확인 팝업(변경분만)
  - 2순위 (기존 기능, 로직 복잡한데 테스트 0개 — `auth-errors.ts`부터 추천, mock 불필요)
    - [ ] `shared/lib/auth-errors.ts` — 에러 코드 → 한글 메시지 매핑
    - [ ] `features/write-post/WritePostForm` — draft 이어쓰기 분기, 저장/발행 분기
    - [ ] `features/edit-profile/ProfileForm` — 비밀번호 생성/변경 분기, 계정 연결 목록
    - [ ] `widgets/nav/AuthNavAction` — 로그인/로그아웃 상태 분기
    - [ ] `views/admin/AdminMembersPage` — 페이지네이션 경계값
  - 3순위 (여유 있을 때)
    - [ ] `features/filter-posts-by-category`
    - [ ] `features/manage-categories/CategoryManager`
  - E2E: 글쓰기 → 발행 → 목록 노출 흐름 1개 추가 검토 (회원 삭제는 파괴적 액션이라 자동화 제외)
  - 제외(테스트 가치 낮음): `entities/*/api/*`(순수 fetch 래퍼), 단순 조합만 하는 `views/*`,
    `shared/ui`의 서드파티 래퍼 컴포넌트
- [x] **글 상세 페이지 진입 시 기존 대화 세션 자동 전환** — 2026-09-14 완료.
      `/posts/[id]`에 그 글에 묶인 세션이 있으면 자동 전환, 없으면 활성 세션 그대로 둠.
      `useChatMessages.ts`의 `routePostId` 강제 전환 로직 옆에 `detailPostId`(조건부 전환)
      추가. 브라우저로 두 케이스(세션 있음/없음) 다 확인.
- [ ] `docs/`(FSD.md, UI_SCREENS.md, NEXTJS_ERROR_HANDLING.md 등) 안에 남아있는 `src/...` 경로
      표기를 `apps/web/src/...`로 정리 (2026-09-10 모노레포 전환 후 남은 자잘한 정리, 급하지 않음)
- [ ] **카테고리 기능 (회원가입 연계, 스펙만 확정 — 2026-09-07)**: 가입 시 원하는 카테고리를
      선택하도록 함. 기본 제공 4개(운동/공부/기록/여행) + 이후 유저가 자유롭게 카테고리 추가
      가능. **유저별 개인 카테고리**(다른 사람 카테고리와 독립, 공용 풀 아님)로 결정. **하위
      카테고리(폴더 안 폴더) 지원, 최대 3단계**까지 — self-referential `parentId` 트리 구조 필요
      (예: 최상위 → 하위 → 하위의 하위, 4단계는 막아야 함). 지금 `Post` 모델의 자유 텍스트
      `category` 필드를 유저 소유 `Category` 모델(3단계 트리)로 바꾸는 작업이 필요할 것.
      실제 스키마·가입 화면 구현은 인증(Better Auth, JWT 여부 등) 학습이 끝난 뒤 착수
      (`inote-server/LEARNING.md` Chapter 25 참고) — 오늘은 기록만.
- [x] 만다라트 9번 축 확정 — "기능 고도화"로 명명, 세부 항목 채우는 중 (`/dev-guide` 페이지, DB 기반으로 참고)
- [x] `inote-server`에 `blog` 모듈 자리 만들기 (Prisma `Post` 모델) — 2026-09-04 완료, 로그인 없는 CRUD로 FE까지 연동됨
- [ ] `inote-ai`용 별도 Neon DB 프로비저닝
- [x] **렌더링된 소스에서 복사해도 코드블록이 안 깨지게 붙여넣기 개선** — 2026-09-04 완료.
      브라우저 콘솔로 실제 클립보드 내용을 직접 찍어서 진단해본 결과, 처음 추측(html이 있으면
      무조건 우리 로직을 건너뛰는 게 문제)은 틀렸었음 — 실제 원인은 코드 뷰어가 `<pre>` 없이
      줄마다 `<div style="color:...">`로 문법 강조만 흉내 낸 HTML을 주는데, 이때도 `text/plain`
      쪽엔 트리플 백틱이 그대로 남아있다는 것. `markdown-paste.ts`에 `STRUCTURAL_HTML_TAG`
      정규식(`h1-6/ul/ol/li/table/pre/code/blockquote` 존재 여부)을 추가해서, html에 진짜
      의미있는 블록 태그가 없으면 html을 무시하고 `text/plain`을 `marked`로 파싱하도록 수정.
      브라우저에서 이 실제 케이스 + 기존 케이스(순수 텍스트, 잘 만들어진 html) 전부 재검증 완료.
      (참고: 트리플 백틱 자체가 없는 순수 텍스트 — 예: 파일 미리보기에서 문법 강조 없는 일반
      코드 펜스를 복사했을 때 — 는 여전히 해결 안 됨. 이건 "코드처럼 생긴 텍스트인지" 휴리스틱
      판단이 필요한 별개 문제라 필요해지면 그때 다시 다룸.)
