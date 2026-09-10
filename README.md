# iNote

> 할일 리스트 · 독서 · 글쓰기를 하나로 모으고, 그 기록을 LLM이 분석·평가·검색해주는 개인 기록 앱

`inote-money`(가계부·자산관리)와 같은 iNote 시리즈. 백엔드(`inote-server`)를 공유하는
멀티 서비스 구조로, 글쓰기(블로그) 기능부터 먼저 구현하고 할일 리스트·독서 기능을 이어서 붙일 예정.

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

- 글쓰기(노션처럼 쓰는 에디터) + 카테고리, LLM 챗 UI
- 이메일/Google 로그인·회원가입·로그아웃 (Better Auth)

## 로컬 실행

```bash
cd apps/web
pnpm install
pnpm dev   # http://localhost:3011
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
- [`PLANNING.md`](./PLANNING.md) — 왜 만드는지, 성공 기준
- [`STRATEGY.md`](./STRATEGY.md) — 전체 구조·단계별 전략
- [`docs/mandalart.html`](./docs/mandalart.html) — 핵심 목표 + 8대 축 (브라우저로 열기)

## 링크

- BE: [inote-server](https://github.com/seo337dc/inote-server)
- AI: [inote-ai](https://github.com/seo337dc/inote-ai)
- 배포: https://inote-blog.vercel.app/ _(도메인 변경 예정)_
