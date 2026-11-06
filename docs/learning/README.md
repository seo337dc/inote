# 학습 문서

> 프로젝트 사실이 아니라 **배우기 위한** 문서는 모두 여기에 둔다 (`CLAUDE.md` 작업 원칙).
> 새 학습 문서를 만들면 아래 표에 한 줄 추가한다.

| 문서 | 내용 |
|------|------|
| [FE_TESTING.md](./FE_TESTING.md) | FE 테스트 — 단위/컴포넌트/E2E 차이, 왜 Vitest인지, React Testing Library·MSW·Playwright 세팅과 쓰는 상황 |
| [NEXTJS_ERROR_HANDLING.md](./NEXTJS_ERROR_HANDLING.md) | Next.js App Router 에러 처리 — `not-found.tsx`·`error.tsx`·`global-error.tsx`가 각각 언제 뜨는지와 재현 방법 |
| [PROSEMIRROR.md](./PROSEMIRROR.md) | ProseMirror — 에디터를 직접 만들 때 왜 이게 나오는지, Tiptap과의 관계, 핵심 개념(State·Transaction·View), 에디터 스크롤 옵션 |
| [SEARCH_EVALUATION.md](./SEARCH_EVALUATION.md) | 검색(RAG) 평가 — Recall@k·MRR·기준 점수(오탐/놓침)가 무엇이고 왜 필요한지, 글 찾기 평가에서 볼 것만 |
| [SSE.md](./SSE.md) | SSE(Server-Sent Events) — 전송 형식, EventSource vs fetch 스트림, 재연결·스냅샷, 프록시 버퍼링·하트비트, NestJS `@Sse()` (임베딩 진행률 기능용) |
| [FINE_TUNING.md](./FINE_TUNING.md) | 파인튜닝 — 프롬프트·검색과 뭐가 다른지, LoRA 등 종류, 이 프로젝트에서 할 수 있는 방법 3가지(오픈 모델 LoRA·Groq 어댑터·임베딩+분류기)와 시작 전 준비 체크리스트 |

백엔드 학습 문서(NestJS·Prisma·테스트·모니터링)는 `inote-server` 레포의 `docs/learning/README.md`에 있다.
