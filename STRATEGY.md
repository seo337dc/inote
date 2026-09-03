# inote-blog — 전략 문서

## 목표

큰 틀: **노션 + 블로그 + LLM**. 왜 만들고 무엇을 성공으로 볼지는 `PLANNING.md` 참고.

---

## 전체 흐름

```
inote-blog (FE, Next.js)
  ├─→ inote-server의 blog 모듈 (NestJS·Prisma·Better Auth 재사용) — 글 CRUD, 인증
  └─→ inote-ai (별도 DB)                                        — LLM 채팅, 임베딩, RAG

inote-ai가 RAG에 글 내용이 필요하면
  → inote-server의 blog API를 호출해서 가져옴 (DB 직접 조인 안 함)
```

---

## 레포 구조

```
inote-blog/            ← 이 레포. FE만 (Next.js)
inote-server/          ← 기존 레포. blog/ 모듈 추가 예정 (기존 auth/money/daily/goal과 같은 위치)
inote-ai/              ← 신규 레포 (https://github.com/seo337dc/inote-ai). LLM/AI 전용, 별도 DB, 로그인 없음
```

> devlog-llm처럼 BE+AI를 하나로 합치지 않는 이유: `inote-server`가 이미 존재하는 서비스라서, 나눠도
> "서비스 두 개 유지 비용"이 새로 생기지 않음. 오히려 Better Auth·유저·DB를 다시 만들 필요가 없어짐.

---

## 역할 분담

| 레포 | 스택 | 역할 |
|---|---|---|
| `inote-blog` | Next.js + React + TS | 노션 스타일 에디터, 글 목록/상세, LLM 챗 UI |
| `inote-server`의 `blog` 모듈 | NestJS + Prisma | 글 CRUD API, 인증(Better Auth 재사용) |
| `inote-ai` | Python + FastAPI | LLM 채팅, 임베딩 생성, RAG 검색, 분석·평가 |

### 의존 방향

```
inote-blog → inote-server(blog 모듈)
inote-blog → inote-ai
inote-ai → inote-server(blog 모듈)  (RAG 인덱싱 시 글 내용 조회용)
```

---

## 단계별 전략

### Phase 0 — 인프라 정리 (지금 여기)

- `inote-blog` 레포 뼈대 (Next.js 세팅) — 이 레포
- `inote-server`에 `blog` 모듈 자리 만들기 (Prisma에 `Post` 모델 추가)
- `inote-ai` 레포 생성 완료 (https://github.com/seo337dc/inote-ai) — 별도 DB 프로비저닝은 아직
- 무료 티어 기준으로 배포 계획 확정 (Vercel + Render + Neon, devlog-llm/inote-money와 동일 조합)

### Phase 1 — 블로그 뼈대

- `inote-server`: `blog` 모듈에 글 CRUD API
- `inote-blog`: 글 목록/작성/상세 화면, `inote-server` 인증 연동
- 화면 단위로 쪼갠 세부 작업 리스트: [`docs/UI_SCREENS.md`](./docs/UI_SCREENS.md)

### Phase 2 — LLM 채팅 연동

- `inote-ai`에 Groq 기반 `/chat` (devlog-llm 패턴 재사용, SSE 스트리밍)
- `inote-blog` 에디터 페이지에 챗 UI 연결

### Phase 3 — 대화 기록 + RAG

- `inote-ai` DB에 `conversations`, `embeddings` 테이블 (devlog-llm의 스키마/설계안 A·B 재사용)
- 임베딩 모델 최종 확정 (Voyage AI `voyage-4-lite` 등 devlog-llm에서 조사한 후보 중)

### Phase 4 — 분석·평가·리서치 기능

- 목표 3번 "LLM이 작성 내용을 자동 분석·평가" — LLM-as-a-Judge 패턴으로 글 품질 피드백
- RAG 기반 리서치 보조 (질문하면 내 기록 + 필요시 외부 조사 결과를 같이 제공)

### Phase 5 — 실제 AWS 인프라 적용

- 무료 티어(Vercel/Render/Neon)로 먼저 돌려보고, 필요해지면 AWS로 이전 (만다라트 7번 축)

---

## 데이터 소스

| 소스 | 저장 위치 | 수집 방식 |
|---|---|---|
| 블로그 포스팅 | `inote-server` DB (`blog` 모듈) | `inote-blog` 에디터에서 작성 |
| LLM과 나눈 대화 | `inote-ai` DB | 채팅 중 자동 저장 |
| 임베딩(RAG용) | `inote-ai` DB | 포스팅(API로 가져옴) + 대화를 배치/실시간으로 임베딩 |

---

## 기술 스택

| 역할 | 기술 | 비고 |
|---|---|---|
| FE | Next.js + React + TS | inote-money와 동일 스택 |
| BE (블로그) | NestJS + Prisma (`inote-server` 확장) | 기존 인증·DB 재사용 |
| BE (AI) | Python + FastAPI | devlog-llm에서 검증된 스택 |
| DB (블로그) | PostgreSQL (Neon, `inote-server`와 공유) | |
| DB (AI) | PostgreSQL + pgvector (신규, 별도) | |
| LLM | Groq | devlog-llm에서 검증됨 |
| 임베딩 | 미정 (Voyage AI `voyage-4-lite` 유력) | |
| 배포 | Vercel(FE) + Render(BE 2종) | 무료 티어 우선, 이후 AWS 검토 |

---

## 우선순위

1. ✅ 큰 틀·목표·아키텍처 확정 (현재)
2. ⬜ Phase 0 — 인프라 정리
3. ⬜ Phase 1 — 블로그 뼈대
4. ⬜ Phase 2 — LLM 채팅 연동
5. ⬜ Phase 3 — 대화 기록 + RAG
6. ⬜ Phase 4 — 분석·평가·리서치 기능
7. ⬜ Phase 5 — 실제 AWS 인프라 적용

---

## 미정 사항 (진행하면서 결정)

- [ ] 만다라트 9번 축 (8번은 Playwright E2E 테스트로 확정)
- [ ] 임베딩 모델 최종 확정
- [ ] `inote-server`의 Neon DB를 그대로 확장할지, 별도 브랜치를 팔지
- [ ] `inote-ai` ↔ `inote-server` 간 API 인증(내부 호출용 토큰 등) 방식
