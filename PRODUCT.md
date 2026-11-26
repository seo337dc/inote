# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
공개 서비스로 확장할 계획이다. 지금은 1인이 개발·운영하고, 계정별 데이터 분리를 확인하는 단계다(`PLANNING.md`). 사용자는 글쓰기·독서·할 일 같은 개인 기록을 남기고 다시 찾아보는 사람이다. 데스크톱·태블릿·모바일을 가리지 않고 같은 기록을 이어서 쓴다. 공개한 글을 읽는 독자(`/posts/[id]`, `/users/[id]`)도 있다.

## Product Purpose
할 일 리스트·일지·독서·글쓰기(노션처럼 쓰는 기록)를 한곳에 모아 기록하고, 그 기록을 LLM이 분석·평가·검색해 준다. 이 서비스는 `inote-money`와 같은 iNote 시리즈이며, 인증·DB는 공통 백엔드(`inote-server`)를 쓴다. 모바일은 WebView 앱(`apps/app`)을 예정하고 있다(미착수).

## Positioning
- 쓴 기록을 LLM이 분석·평가·검색해 준다(요약, 챗).
- 글·독서·할 일·메모처럼 여러 종류의 기록을 한 서비스에서 다룬다.
- 기록하는 중에 바로 쓰는 도구를 곁에 둔다(글 쓰는 동안 여는 메모장, AI 챗).

## Operating Context
- 글쓰기는 Tiptap 에디터에서 임시저장·발행 흐름으로 이루어지고, 이미지 업로드와 AI 자동 요약이 붙는다.
- 로그인은 이메일/비밀번호와 Google이다(Better Auth).
- 화면은 `apps/web/src/app`이 기준이다. 일지(`/journal`)와 대시보드(`/dashboard`)는 "준비 중" 화면만 있다.
- FE는 Vercel, BE는 Render, DB는 Supabase에 배포한다.

## Capabilities and Constraints
- 스택: TypeScript, React 19, Next.js(App Router), Tailwind CSS, shadcn/ui, TanStack Query, Tiptap, dnd-kit. 구조는 Feature-Sliced Design이다.
- 테스트: Vitest, React Testing Library, MSW (Playwright는 보류 중).
- 서버 API와 LLM 기능은 별도 서비스(`inote-server`, `inote-ai`)에 있다. FE만 바꿔서는 API를 바꿀 수 없다.
- 글에는 공개/비공개가 있다.
- 접근성 기준(예: WCAG 등급)은 정해진 것이 없다. 미정이다.

## Brand Commitments
서비스 이름은 "iNote"이고 로고는 소문자 i와 이탤릭 Note의 조합이다. 초록 테마의 shadcn/ui를 쓴다(`inote-money`와 같은 계열). 그 밖의 브랜드 규칙은 아직 정해진 것이 없다.

## Evidence on Hand
- 실제 사용 중인 기능과 코드(`apps/web/src`), 개발 일지(`docs/devlog/fe.md`), 기획(`PLANNING.md`).
- 후기·고객 사례·수치·벤치마크는 없다. 만들어 쓰지 않는다.

## Product Principles
1. 기록이 먼저다. 도구는 쓰는 흐름을 가로막지 않고, 쓰는 중에 곁에서 돕는다.
2. 기록 종류가 달라도 한 서비스처럼 느껴져야 한다. 글·독서·할 일이 같은 규칙으로 동작한다.
3. AI는 쓴 기록을 분석하고 찾아 주는 기능이다. 기록 자동화(AI가 대신 써 주는 기능)는 나중에 넣을 계획이 있어서, 지금 화면은 그것이 들어올 자리를 막지 않는다.
4. 데스크톱·태블릿·모바일에서 동등하게 쓸 수 있어야 한다.
5. 공개 서비스를 전제로, 내 기록과 공개한 글의 경계가 항상 분명해야 한다.

## Accessibility & Inclusion
특정 표준은 정해지지 않았다. 세 기기에서 동등하게 쓸 수 있다는 요구가 확인된 사실이다.
