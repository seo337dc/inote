# iNote

> 할일 리스트·일지·독서·글쓰기 등을 기록하고, 그 기록을 LLM이 분석·평가·검색해주는 개인 기록 앱

`inote-money`(가계부·자산관리)와 같은 iNote 시리즈. 백엔드(`inote-server`)를 공유하는
멀티 서비스 구조로, 글쓰기(블로그) 기능부터 먼저 구현하고 할일 리스트·일지·독서 기능을 이어서 붙일 예정.

---

## 레포 구조

```
inote/
├── apps/
│   ├── web/   ← Next.js 웹 서비스 (지금 여기서 개발 중)
│   └── app/   ← React Native 앱 (예정, 미착수)
├── docs/
└── CLAUDE.md  ← 세션 간 맥락 유지용 (새 세션 시작 시 먼저 읽기)
```

## 현재 구현된 것

- 글쓰기(노션처럼 쓰는 에디터) + 카테고리, draft(임시저장)/발행 구분, 자동저장
- 저장(발행) 시 AI가 자동으로 요약해서 글 상세 페이지에 노출
- LLM 챗 어시스턴트 — 지금 쓰고 있는 글을 인지하는 "글쓰기 세션"과 자유 대화용 "일반 세션"을
  구분해서 저장, 세션 목록/검색, 채팅 위에 슬라이드로 겹쳐지는 오버레이 패널(데스크탑 80%+딤,
  모바일 전체)
- 카테고리 관리 페이지(`/categories`) — 나의 글 페이지 사이드바에서 진입
- 이메일/Google 로그인·회원가입·로그아웃 (Better Auth)

## 로컬 실행

```bash
cd apps/web
pnpm install
pnpm dev   # http://localhost:3011
```

LLM 챗을 쓰려면 `inote-server`(BE, `:3200`)와 `inote-ai`(AI, `:8000`)도 같이 띄워야 하고,
`apps/web/.env.local`에 아래 값이 필요하다:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3200/api/v1
NEXT_PUBLIC_AI_API_URL=http://localhost:8000
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| FE | Next.js · TypeScript · Tailwind CSS · shadcn/ui |
| FE (App) | React Native _(예정)_ |
| BE | NestJS · Prisma (`inote-server`, 별도 레포, 공유 백엔드) |
| 인증 | Better Auth (이메일/비밀번호, Google) |
| DB | PostgreSQL (Neon) |
| AI | Python + FastAPI (`inote-ai`, 별도 레포, 별도 DB) — LLM 채팅·임베딩·RAG |

## 문서

- [`CLAUDE.md`](./CLAUDE.md) — 세션 간 맥락 유지 규칙, 현재 상태, 다음 할 일
- [`DEV_LOG.md`](./DEV_LOG.md) — 세션별 작업 기록
- [`LEARNING.md`](./LEARNING.md) — 학습 정리 (테스트 종류, 세팅 이유 등)
- [`PLANNING.md`](./PLANNING.md) — 왜 만드는지, 성공 기준
- [`STRATEGY.md`](./STRATEGY.md) — 전체 구조·단계별 전략
- 만다라트 — 핵심 목표 + 8대 축, `/dev-guide` 페이지에서 확인 (DB 기반, 항목 클릭 시 정리 페이지로 이동)

## 링크

- BE: [inote-server](https://github.com/seo337dc/inote-server)
- AI: [inote-ai](https://github.com/seo337dc/inote-ai)
- 배포: https://inote-blog.vercel.app/ _(도메인 변경 예정)_
