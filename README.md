# iNote

> 할일 리스트·일지·독서·글쓰기 등을 기록하고, 그 기록을 LLM이 분석·평가·검색해주는 개인 기록 앱

`inote-money`(가계부·자산관리)와 같은 iNote 시리즈. 백엔드(`inote-server`)를 공유하는
멀티 서비스 구조로, 글쓰기 기능부터 먼저 구현하고 독서·할 일 등을 이어서 붙이고 있다.
(일지·대시보드는 아직 "준비 중" 화면만 있다.)

> 맥락·규칙·현재 상태의 기준 문서는 [`CLAUDE.md`](./CLAUDE.md)다. 이 README는 소개와 실행법만 적는다.

## 레포 구조

```
inote/
├── apps/
│   ├── web/   ← Next.js 웹 서비스 (소스 구조는 apps/web/src가 소스, FSD — docs/design/FSD.md)
│   └── app/   ← React Native 앱 (예정, 미착수)
├── docs/      ← handoff · adr · design · devlog · learning · todo · blog · kure
└── CLAUDE.md  ← 세션 간 맥락 유지용 (새 세션 시작 시 docs/handoff/HANDOFF.md 다음에 읽기)
```

## 구현된 기능

글쓰기(노션처럼 쓰는 에디터, 임시저장/발행, 이미지 업로드, AI 자동 요약) · 카테고리 트리 ·
LLM 챗 · 독서 기록 · 할 일 · 만다라트(`/dev-guide`) · 관리자 · 이메일/Google 로그인.
화면 목록은 `apps/web/src/app`이, 기능별 구현 경위는 [`docs/devlog/fe.md`](./docs/devlog/fe.md)가 소스다.

## 로컬 실행

```bash
cd apps/web
pnpm install
pnpm dev   # http://localhost:3011
```

`apps/web/.env.local`에 필요한 값 (`.env.local`은 git에 없다 — 직접 만든다):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3200      # BE 주소 (끝에 /api/v1을 붙이지 않는다 — 코드가 붙임)
NEXT_PUBLIC_AI_API_URL=http://localhost:8000   # AI 서버 주소 (LLM 챗·독서 챗)
```

⚠️ **`NEXT_PUBLIC_API_URL`이 운영 BE를 가리키면 로컬에서 만든·지운 글과 사용자가 운영 데이터에 반영된다.**
로컬 BE는 `inote-server`의 `scripts/dev-db.sh start`로 띄워야 운영과 분리된 개발 DB(도커)에 연결된다
(절차: `inote-server/docs/runbooks/local-dev-db.md`). 값은 실행할 때만 덮어쓸 수도 있다:
`NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev`.

LLM 챗을 쓰려면 `inote-ai`(AI, `:8000`)도 같이 띄워야 한다.

테스트·린트·빌드 명령과 커밋 전 체크리스트는 [`CLAUDE.md`](./CLAUDE.md)를 본다.

## 기술 스택

버전은 [`apps/web/package.json`](./apps/web/package.json)이 소스다.

| 영역 | 기술 |
|------|------|
| FE | Next.js(App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · Tiptap(에디터) |
| FE 테스트 | Vitest · React Testing Library · MSW · Playwright |
| FE (App) | React Native _(예정)_ |
| BE | NestJS · Prisma (`inote-server`, 별도 레포, 공유 백엔드) — API는 Swagger(`/api/docs`)가 소스 |
| 인증 | Better Auth (이메일/비밀번호, Google) |
| DB | PostgreSQL (Supabase — BE용·AI용 프로젝트 별도) |
| AI | Python + FastAPI (`inote-ai`, 별도 레포, 별도 DB) — LLM 채팅·임베딩·RAG |
| 배포 | FE·AI: Vercel, BE: Render |

## 문서

- [`CLAUDE.md`](./CLAUDE.md) — 세션 간 맥락 유지 규칙, 현재 상태, 다음 할 일
- [`docs/handoff/HANDOFF.md`](./docs/handoff/HANDOFF.md) — 세션 인수인계 (레포 4개에 걸친 상태)
- [`docs/devlog/fe.md`](./docs/devlog/fe.md) — 기능별 개발 일지
- [`docs/adr/`](./docs/adr/) — 결정 기록·설계 계약 · [`docs/design/FSD.md`](./docs/design/FSD.md) — 구조 설계 근거
- [`docs/todo/`](./docs/todo/) — 이번에 안 하고 남긴 일
- [`docs/learning/`](./docs/learning/) — 학습 문서 (FE 테스트 등)
- [`PLANNING.md`](./PLANNING.md) — 왜 만드는지, 성공 기준
- 만다라트 — 핵심 목표 + 8대 축, `/dev-guide` 페이지에서 확인 (DB 기반, 항목 클릭 시 정리 페이지로 이동)

## 링크

- BE: [inote-server](https://github.com/seo337dc/inote-server)
- AI: [inote-ai](https://github.com/seo337dc/inote-ai)
- 배포: FE https://inote-main.vercel.app/ · AI https://inote-ai-cyan.vercel.app
- 호스팅 이전 경위: [`docs/adr/0003-hosting-migration.md`](./docs/adr/0003-hosting-migration.md), DB(Neon → Supabase): `inote-server/docs/adr/0001-neon-to-supabase.md`
