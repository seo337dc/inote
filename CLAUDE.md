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
- AI가 제안하는 기능 확장은 기본적으로 의심한다.

### FE 작업 원칙 (중요 — 2026-09-03 추가)

- **화면을 먼저 만들지 않는다.** "일단 만들어보고 보여준다"는 이 레포에서 하지 않는다.
- 화면이든 컴포넌트든, **뭐든 하나하나 먼저 의논하고 사용자 확인을 받은 뒤에만 작업한다.**
  여러 개를 한 번에 만들지 않는다 — 화면 하나, 결정 하나 단위로 끊는다.
- (배경: 2026-09-03에 7개 화면을 한 번에 목업으로 만들었는데, 사용자가 그 방식 대신 하나씩
  의논하며 진행하길 원한다고 명시적으로 정정함.)
- **버튼(및 버튼처럼 클릭되는 요소)에는 기본적으로 마우스 hover 스타일을 넣는다.** 새로
  만드는 버튼은 처음부터 `hover:` 클래스를 포함해서 작성한다. (2026-09-04 추가)

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

- [ ] **(진행 중, 2026-09-11) 글 상세 페이지 진입 시 기존 대화 세션 자동 전환** — 로그인 상태로
      `/posts/[id]` 글 상세 페이지에 들어갔을 때, 그 글에 이미 나눈 LLM 대화가 있으면 자동으로
      그 세션으로 전환. **없으면 그대로 둠**(현재 활성 세션을 강제로 새로 만들지 않음 — 그냥
      글 읽으러 들어갔을 뿐인데 채팅 중이던 세션이 날아가면 안 되니까).
      지금 `/write?id=X`(글쓰기 페이지)는 이미 이 강제 전환이 있음 —
      `apps/web/src/widgets/chat-dock/model/useChatMessages.ts`의 `routePostId` +
      `lastRoutePostId` ref 로직. 이번 건 그 옆에 같은 패턴으로 `detailPostId`를 추가하되,
      **조건부**(세션이 실제로 존재할 때만)라는 게 다름. 세션 존재 여부는 이미 로드해둔
      `sessions` 배열에서 `sessions.find(s => s.post_id === detailPostId)`로 확인 가능
      (글쓰기 세션 id === post_id라서 별도 API 호출 불필요). 구현 착수했다가 중간에 멈춰서
      되돌려놓음(빌드 깨는 미완성 코드 커밋 안 하려고) — 아래가 세션에서 잡았던 계획:
      ```ts
      const detailPostId = pathname.match(/^\/posts\/([^/]+)$/)?.[1] ?? null;

      // 기존 routePostId 처리 useEffect 안에, else 브랜치로 추가:
      if (detailPostId) {
        if (lastRoutePostId.current === detailPostId) return;
        const existing = sessions.find((s) => s.post_id === detailPostId);
        if (!existing) return;
        lastRoutePostId.current = detailPostId;
        setSessionId(existing.id);
        setSessionPostId(existing.post_id);
        return;
      }
      ```
      주의할 점: `sessions`는 비동기로 로드되니 useEffect의 deps에 `sessions` 추가 필요 — 처음
      마운트 시엔 빈 배열이라 못 찾고, 로드 끝나면 재실행돼서 그때 전환됨(짧은 순간 일반 세션이
      먼저 뜨는 flash가 있을 수 있는데 사소해서 감수하기로 함).
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
- [ ] 만다라트 9번 축 확정 (8번은 Playwright E2E 테스트로 확정, `docs/mandalart.html` 참고)
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
