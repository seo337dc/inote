# CLAUDE.md — inote-blog

새 세션(다른 PC, 다른 AI 포함)에서 이 프로젝트를 이어받을 때 먼저 읽는 파일. 자세한 배경은
`PLANNING.md`(왜 만들고 뭘 성공으로 볼지), `STRATEGY.md`(무엇을 만들지)를 참고.

---

## 프로젝트 한 줄 요약

노션처럼 쓰는 블로그 + 그 기록을 LLM이 분석·평가·검색해주는 iNote 시리즈의 블로그 서비스.
devlog-llm(개인 실험용 선행 프로젝트)의 후속으로, 인증·DB는 기존 `inote-server`를 재사용하고
LLM/AI 부분만 별도 Python 서비스로 새로 만든다.

## 현재 상태 (2026-09-01 기준)

- **기획 단계**: 큰 틀·목표·아키텍처만 확정, 코드는 아직 없음
- 다음 단계는 인프라 정리(Phase 0) — `STRATEGY.md` 참고

## 아키텍처

```
inote-blog             - Next.js (이 레포) — 블로그/노션 UI + LLM 챗 UI
inote-server(blog모듈)  - NestJS (기존 레포 확장) — 글 CRUD, 인증(Better Auth 재사용)
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

`src/`는 Feature-Sliced Design으로 구성 (`app → pages → widgets → features → entities → shared`,
상위가 하위만 import 가능, `eslint-plugin-boundaries`로 실제 강제됨). FSD의 `pages` 레이어는
Next.js Pages Router와 이름이 겹쳐서 폴더명은 `src/views`를 씀. 설계 근거·레이어별 내용은
[`docs/FSD.md`](./docs/FSD.md) 참고.

## 로컬 개발

```bash
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
