# HANDOFF — KURE 임베딩 (inote · inote-server · inote-ai · inote-embedder)

> **KURE 작업의 최신 상태·실행법·다음 할 일.** 설계와 결정은 [`PLAN.md`](PLAN.md)(특히 10절), 이 문서는 "지금 어디까지 왔고 내일 뭘 하나"다.
> 세션이 바뀔 때마다 **「2. 진행 상태」와 「6. 다음 할 일」을 덮어쓴다.** 나머지는 사실이 바뀔 때만 고친다.

| 항목 | 값 |
|---|---|
| 날짜 | 2026-10-12 |
| 작성자 | Claude Code |
| 다음 수신자 | 사람(내일 이어서) |
| 이 문서의 위치 | `inote` 레포 브랜치 **`docs/kure-handoff`**(`origin/main`에서 땀). `main`에는 아직 병합 전 — 3절 참고 |

---

## 0. 새 세션 시작 순서 (필수)

1. 이 문서 → `PLAN.md`(5.6 공개 범위 규칙, 10절 결정) → 작업할 레포의 `CLAUDE.md`와 `docs/handoff/HANDOFF.md`
2. 작업할 레포에서 `git pull`
3. 규칙(이 프로젝트에서 합의된 것):
   - **한 단계씩** 하고 끝날 때마다 결과를 보고하고 멈춘다. **커밋·푸시는 사용자가 요청할 때만.**
   - 아키텍처·UX 결정은 AI가 임의로 하지 않는다 → 대안을 제시하고 **사람이 승인**.
   - **BE 테스트는 사용자가 직접 쓴다** — Claude는 `it.todo` 목록과 골격만 준다(사용자가 미뤄 둔 상태).
   - 큰 내려받기(이미지·패키지·모델)는 출처·크기를 알리고 허락받은 뒤에. 비밀값(`.env`, `.env.dev`, 비밀번호, 키)은 출력·커밋 금지.
   - **`portfolio-site` 레포는 건드리지 않는다.** 로컬 개발 DB에는 **공개 데이터만** 둔다(비공개 글을 복사하지 않는다).
   - 이슈·에러는 「문제 파악 → 해결 방법 검토 → 최종 결론」 순서로.

---

## 1. 한눈에

한국어 임베딩(KURE-v1)으로 글 사이의 "뜻이 비슷함"을 계산해 **관련 글 추천(B) → 카테고리 제안·유사 글 알림(C) → 내 글 기반 답변 RAG(D)**를 만든다.

```
글 저장/삭제 ─▶ inote-server(BE) ──PUT/DELETE──▶ inote-ai(AI 서버) ──/embed──▶ inote-embedder(KURE 컨테이너)
                    │                                   │
                    │  "볼 수 있는 글 id 목록(후보)"      └─ 벡터는 AI DB(pgvector)에 저장
                    └──POST /embeddings/similar──────────▶ 후보 id 안에서만 순위를 매겨 돌려줌
```

- **공개 여부는 BE가 판정한다.** AI DB에는 공개 여부·작성자를 복사해 두지 않는다. BE가 후보 id를 정하고 AI는 그 안에서만 답한다. BE는 AI 응답을 한 번 더 걸러낸다(이중 방어).
- 모든 호출은 **fail-open**: AI·임베딩 서비스 장애여도 글 저장은 막히지 않고, 비슷한 글은 빈 목록이다.
- BE는 `EMBEDDINGS_ENABLED=true`일 때만 동작한다(기본 **꺼짐**). **운영에는 이 변수를 켜지 않았다.**

---

## 2. 진행 상태 (2026-10-12)

| 단계 | 상태 | 내용 |
|---|---|---|
| A. 기반 | ✅ (A7 제외) | A1~A6 완료 — 임베딩 서비스, 로컬 DB, AI DB 테이블, AI 임베딩 API, BE 훅·후보 id 함수·백필, 로컬 종단 확인 |
| **A7 평가 세트 v0** | ⏳ **사람 작업** | "비슷함/아님" 쌍 30개 라벨 → `τ_min` 확정 (PLAN 7절) |
| B1 계약 | ✅ | PLAN 6절 B, 결정 16 |
| B2 AI 호출 함수 | ✅ | `inote-server` `src/embeddings/similar-posts.ts` |
| B3 BE 엔드포인트 | ✅ | `GET /blog/posts/:id/similar` |
| **B4 FE** | ⏸ **보류** | `inote`의 다른 작업(todo 리디자인)이 끝난 뒤. 브랜치는 그때 정한다 |
| B5 통합 확인 | ⏳ | FE가 있어야 화면 확인 가능. BE 쪽은 HTTP로 확인 끝 |
| C / D | 미착수 | C는 UX 승인(결정 7), D는 요청자 검증(결정 10)이 먼저 |

### 레포별 커밋 (모두 푸시됨)

| 레포 | 브랜치 | 이번 작업의 커밋 |
|---|---|---|
| `inote-server` | `main` | `612b3a8` A6-1 개발 DB·시드 · `d06e622` A6-2·3 · `500af37` A6-4 훅 · `fe6bbe0` A6-5 백필 · `43a9524` B2 · `4e9e12d` B3 · `0c8328e` 문서(HANDOFF·CLAUDE·DEV_LOG) |
| `inote-ai` | `main` | `2cd0aaf` A4 · `b01e8cc` A5 · `7d8b2a0` 문서 |
| `inote-embedder` | `main` | `82861c7` A2 · `36b7100` A3 · `4549cc2` 문서 |
| `inote` | `docs/kure-handoff` | 이 문서와 `PLAN.md` 갱신 |

> **운영 영향 없음**: 위 커밋이 Render에 배포돼도 `EMBEDDINGS_ENABLED`가 없어 꺼져 있다. 새 엔드포인트 `GET /blog/posts/:id/similar`는 운영에서도 열려 있지만 꺼져 있으면 `200 {"items":[]}`(볼 수 없는 글은 404)만 돌려준다.

### BE에 생긴 것 (`inote-server/src/embeddings/` 등)

| 파일 | 역할 |
|---|---|
| `inote-ai-embeddings.ts` | 글 벡터 저장·삭제 호출(`upsertPostEmbedding`·`deletePostEmbedding`·`deletePostEmbeddings`). fail-open, 같은 글은 순서대로 한 줄, 스위치 `EMBEDDINGS_ENABLED`. `isEmptyPost`, 백필용 `putPostEmbedding`(던짐), `describeError`, `internalHeaders` |
| `embedding-candidates.ts` | **유출 방지의 핵심**: `readableCandidatesWhere`(B)·`ownCandidatesWhere`(C)·`publicCandidatesWhere`(D 임시)·`findCandidateIds`(5000개 상한). 비로그인·빈 id를 `userId: undefined/null`로 흘리지 않는다 |
| `similar-posts.ts` | `findSimilarPosts`: AI 유사 조회(3초 제한, 던지지 않음, 후보 밖·자기·기준 미달·중복을 BE에서 재필터), `SIMILAR_MIN_SCORE`(기본 0.6, 임시) |
| `embedding-backfill.ts` + `scripts/backfill-embeddings.ts` | 기존 글 일괄 임베딩. 사용법 `docs/embeddings-backfill.md` |
| `blog.service.ts` | `update`(publish 때 임베딩, 기다리지 않음) · `remove` · `findSimilar` · 빈 글 처리(이전 벡터 삭제) |
| `admin-users.service.ts` | 사용자 삭제 때 글 id를 먼저 모으고 트랜잭션 뒤 하나씩 벡터 삭제 |
| `blog.controller.ts` | `GET :id/similar` — `Cache-Control: private, no-store`, `res.vary('Cookie')` |

---

## 3. 이 문서가 `main`이 아닌 브랜치에 있는 이유

`inote` 레포는 지금 `feat/todo-redesign`("main에 머지 금지" 브랜치)에서 작업 중이고, **로컬 `main`이 `origin/main`보다 사용자의 커밋 4개 앞서 있다.** `main`에서 그냥 푸시하면 그 커밋까지 같이 올라가고, feature 브랜치에 커밋하면 문서가 머지 금지 브랜치에 갇힌다. 그래서 **`origin/main`에서 딴 `docs/kure-handoff` 브랜치**에 문서만 올렸다. 사용자의 작업 폴더·로컬 `main`은 건드리지 않았다.

- 읽기: `git fetch && git show origin/docs/kure-handoff:docs/kure/HANDOFF.md`
- `main`에 반영하려면(원하면): `docs/kure-handoff`를 `main`에 병합하면 된다(문서 2개뿐이라 충돌 없음).
- 아직 안 한 것: `inote`의 기존 `docs/handoff/HANDOFF.md`·`CLAUDE.md`에 아래 한 줄 추가(사용자의 작업 중 변경이 섞여 있어 건드리지 않았다):
  > `KURE 임베딩(관련 글 추천·카테고리 제안·RAG) 작업은 docs/kure/HANDOFF.md(브랜치 docs/kure-handoff)를 먼저 읽는다.`

---

## 4. 로컬 스택 띄우기

`docker`가 PATH에 없으면 `export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"`. **비밀값은 모두 gitignore된 `.env`/`.env.dev`에 있다**(값을 문서·채팅에 쓰지 않는다).

| 구성 | 포트 | 띄우기 | 비밀값 위치 |
|---|---|---|---|
| 임베딩 서비스(KURE) | 8100 | `cd inote-embedder && docker compose up -d` (모델 로드에 시간이 걸림) | `inote-embedder/.env`의 `INTERNAL_SECRET` |
| 실험 DB(공개 글 22개) | 5433 | 위와 같은 compose | 같은 `.env` |
| AI 개발 DB | 5434 | `cd inote-ai && docker compose -f docker-compose.dev.yml --env-file .env.dev up -d` | `inote-ai/.env.dev` |
| BE 개발 DB | 5435 | `cd inote-server && scripts/dev-db.sh up` (그다음 `migrate`, `seed`) | `inote-server/.env.dev` |

**AI 서버**(8010 예시): `inote-ai/.env`는 **운영** `DATABASE_URL`을 갖고 있고 `load_dotenv()`는 이미 설정된 환경변수를 덮어쓰지 않으므로 **항상 명시적으로 덮어쓴다.**
```bash
cd inote-ai
DATABASE_URL="postgresql://ai:<.env.dev의 비밀번호>@127.0.0.1:5434/inote_ai_dev" \
INTERNAL_SECRET=<임의 값> EMBEDDER_URL=http://127.0.0.1:8100 EMBEDDER_SECRET=<inote-embedder/.env의 값> \
EMBEDDER_MODEL=nlpai-lab/KURE-v1 venv/bin/uvicorn app.main:app --port 8010
```
(`inote-ai/.env`의 Groq 키는 그대로 읽히므로 저장 때 요약 호출이 실제 Groq로 나간다. 개발 데이터라 괜찮다.)

**BE**: 사용자가 평소 쓰는 BE(3200, `nest start --watch`, 대개 `.env`의 **운영** DB)와 겹치지 않게 **다른 포트에 ts-node로** 띄운다(`dist/`를 같이 쓰지 않기 위해).
```bash
cd inote-server
DATABASE_URL=<scripts/dev-db.sh url 이 보여 주는 개발 주소(비밀번호는 .env.dev)> PORT=3210 NODE_ENV=development \
BETTER_AUTH_SECRET=<테스트용 임의 값> BETTER_AUTH_URL=http://localhost:3210 SENTRY_DSN= GOOGLE_CLIENT_ID=x GOOGLE_CLIENT_SECRET=x \
INTERNAL_SECRET=<AI와 같은 값> EMBEDDINGS_ENABLED=true INOTE_AI_URL=http://127.0.0.1:8010 \
npx ts-node --transpile-only src/main.ts
```
`SENTRY_DSN=`을 비우지 않으면 `.env`의 운영 값이 쓰인다.

**로그인이 필요한 API 호출**: 개발 DB에 세션 행을 넣고 Better Auth와 같은 방식으로 서명한 쿠키를 만든다.
```sql
insert into session(id, token, "expiresAt", "updatedAt", "userId")
values ('e2e-sess-a', '<임의 토큰>', now() + interval '1 day', now(), 'dev-user-a');
```
```js
// node mkcookie.js <토큰> <BETTER_AUTH_SECRET> → "better-auth.session_token=…" (inote-server 폴더에서 실행)
const path = require('path');
const bc = require(require.resolve('better-call', { paths: [path.dirname(require.resolve('better-auth', { paths: [process.cwd()] }))] }));
bc.serializeSignedCookie('better-auth.session_token', process.argv[2], process.argv[3]).then((c) => console.log(c.split(';')[0]));
```
`curl -H "Cookie: <출력>"`로 호출한다. 시험이 끝나면 `session`의 e2e 행을 지운다. **시드 사용자**: `dev-user-a`(공개 글 대부분 + 비공개 2 + 임시저장 1), `dev-user-b`(공개 1 + 비공개 1). 테스트 글 id는 `dev-seed-…`로 시작.

**백필**: `scripts/dev-db.sh backfill [--dry-run|--limit N|--only ID]` (`INOTE_AI_URL`·`INTERNAL_SECRET`은 로컬 AI와 맞춘다). BE DB와 AI 서버의 짝이 어긋나면(운영→로컬, 로컬→운영) **항상 거절**하고 둘 다 원격이면 `--allow-remote`가 있어야 한다.

---

## 5. 확인된 것 (로컬, 2026-10-12)

- **개발 DB 정합성**: 발행 글 26개 = AI 벡터 26개, 고아·누락 0, 임시저장 글 벡터 0.
- **저장·삭제 훅**: 응답은 임베딩을 기다리지 않음(응답 ~1초, 벡터 ~8초 뒤), 같은 내용 재저장은 재계산 없음, 연속 3번 저장은 마지막 내용이 남음, 비공개 전환·임시저장은 벡터 불변, 공백 제목+`<p></p>` 저장은 이전 벡터 삭제, 글 삭제·관리자 사용자 삭제는 벡터도 삭제(다른 글 불변, 요청은 하나씩).
- **장애**: 스위치 꺼짐 / AI 서버 꺼짐 / 임베딩 서비스 꺼짐(AI가 503) / 비밀키 불일치 → 모두 저장은 성공, 비슷한 글은 `{items: []}`. 임베딩 서비스를 복구한 뒤 같은 글을 다시 저장하면 벡터가 생긴다.
- **비공개 유출 없음**: 같은 기준 글(공개 도커 글)에서 작성자 a에게만 자기 비공개 도커 글이 나오고(0.551, 기준 0.5일 때), 비로그인·b에게는 후보·결과·응답 원문 어디에도 없다. AI에 후보 밖 id를 요구해도 돌려주지 않고, 후보가 비면 결과도 빈다.
- **API 모양**: 이메일·본문 없음, `limit` 0·11·abc·2.5 → 400, 비공개·draft·없는 글 → 같은 404, 헤더 `Cache-Control: private, no-store`·`Vary: Origin, Cookie`.
- **유사도 참고(공개 도커 글 기준)**: 같은 주제 0.66~0.78, 무관 0.53~0.57 → 임시 기준 **0.6**. 이 기준에서는 a 자신의 비공개 도커 글(0.551)이 빠진다 → A7에서 기준을 정할 때 같이 본다.

### 테스트 상태 (`inote-server`)

- 전체 `npx jest`: **20 실패 / 172 통과 / 149 todo**. 실패 20건은 이번 작업과 무관한 **기존** 것이다:
  - 18건: `categories.rename.spec.ts`(11)·`rename-category.dto.spec.ts`(7) — 구현 전에 일부러 먼저 쓴 TDD 테스트(카테고리 이름 수정 API #6, 사용자 작업).
  - 2건: `blog.service.spec.ts`의 `findOutline` 2개 — `ed11399` 이후 기대값이 낡음. **누가 고칠지 미정.**
- 이번 작업의 테스트는 **`it.todo` 목록**이다(사용자가 직접 작성): `inote-ai-embeddings.spec.ts` 17 · `embedding-candidates.spec.ts` 15 · `embedding-backfill.spec.ts` 24 · `similar-posts.spec.ts` 19 · `similar-posts-query.dto.spec.ts` 4 · `blog.service.spec.ts` 24(임베딩 연동 10 + 비슷한 글 14) · `admin-users.service.spec.ts` 7. 각 파일 맨 위 주석에 준비 방법·지킬 약속·함정이 있다. **가장 먼저 쓸 것: `embedding-candidates.spec.ts`(유출 방지 핵심)**.
- 일회용 변이 검사(구현을 일부러 망가뜨려 테스트가 잡는지)로 목록의 항목들이 실제로 필요한 것임을 확인했다. 각 spec 주석의 "함정"을 참고.
- `inote-ai`: `unittest` 59개(실제 pgvector DB 통합 13개는 `TEST_DATABASE_URL`이 있을 때만).

---

## 6. 다음 할 일 (제안 순서)

1. **(사람) BE 테스트 작성** — `it.todo` 목록에서 골라 채운다. `embedding-candidates` → `similar-posts` → 블로그 훅·비슷한 글 순. 필요하면 Claude가 골격·모의 객체 준비를 돕는다.
2. **A7 평가 세트** — Claude가 개발 AI DB에서 **후보 쌍과 점수 목록**(공개 글만)을 뽑아 주면, 사람이 "비슷함/아님"을 30쌍 표시 → `τ_min`(그리고 이후 `τ_dup`) 확정. 결과는 `docs/kure/eval/`에.
3. **B4 FE** — `inote`의 todo 리디자인이 끝난 뒤. 브랜치 결정 필요. PLAN 6절 B의 FE 항목: 글 상세 본문 아래 "비슷한 글"(제목+카테고리 경로, 남의 글이면 작성자명, 내 비공개 글이면 비공개 표시), 비면 영역 자체를 그리지 않음, 실패해도 상세 화면은 정상, **react-query 키에 요청자를 포함하거나 로그인·로그아웃 때 비움**. 그다음 B5로 화면 확인(비로그인 화면에 비공개 글이 절대 안 나오는지).
4. **운영 선행 작업(결정 필요)** — 운영 AI DB(Supabase) `vector` 확장 사용 가능 여부와 `search_path` 확인(결정 5), **임베딩 서비스 호스팅**(결정 9: Hugging Face Spaces / Cloud Run / Fly.io 등 — **무료 조건은 공식 가격 페이지로 먼저 확인**). 이게 정해져야 PLAN 8절 순서대로 운영에 켤 수 있다.
5. **C 설계** — UX(칩 위치·알림 모양·자동/수동 호출) **사람 승인**(결정 7)이 먼저. 그 전에 계약 확정.
6. **D 선행 과제** — AI 서버가 FE의 `user_id`를 그대로 믿는 문제(결정 10): 본인 비공개 글을 검색하기 전에 요청자 검증 방식을 정한다(**사람 승인**). 풀기 전에는 공개 글만 검색.

**이월 사항**: 두 `findOutline` 테스트 담당 · 고아 벡터 정리(뒤로 미룸, 후보 id로 제한돼 노출 안 됨) · 포트폴리오 문구는 별도 AI에게 전달할 프롬프트를 이미 사용자에게 드렸다(`portfolio-site`는 건드리지 않음).

---

## 7. 함정 모음 (겪은 것)

- **`inote-ai/.env`·`inote-server/.env`는 운영 값**이다. `@prisma/client`·`load_dotenv()`·`dotenv/config`가 자동으로 읽으므로 DB 주소를 **항상 명시적으로 덮어쓴다**(`scripts/dev-db.sh`는 이를 대신한다). 백필 스크립트는 연결 전에 대상 짝을 검사한다.
- 사용자의 BE(3200, `nest start --watch`)는 켜져 있을 수 있다. 같은 포트·`dist/`를 쓰지 말고, 소스 파일을 일시적으로 망가뜨리는 실험(변이 검사)을 하면 그 서버가 다시 컴파일한다 → 변이 검사는 **항상 복원하는 스크립트**로 하고 끝나면 `diff`로 원본과 같은지 확인한다.
- **zsh**: 변수는 단어로 나뉘지 않는다(복합 명령은 함수로), `?`는 글로빙에 걸린다(URL은 따옴표), `echo =====`는 오류. macOS에는 `timeout` 명령이 없다. `cat >> 파일`에 입력을 안 주면 영원히 멈춘다.
- `pnpm 스크립트 -- --옵션`은 `--`가 그대로 넘어온다(백필 파서는 단독 `--`를 무시한다).
- jest는 컨트롤러를 import하면 `better-auth`(ESM) 때문에 실패한다 → `jest.mock('../auth/…guard')`로 가드를 대체한다.
- `eslint src --fix`를 통째로 돌리면 무관한 파일의 서식이 바뀐다 → **변경한 파일만** 돌린다. `tsconfig.build.json`은 `prisma/seed-dev.ts`·`scripts/backfill-embeddings.ts`를 제외한다(없으면 `nest build`가 깨진다).
- 응답이 요청자마다 다른 API에는 **`Vary`를 `setHeader`로 덮어쓰지 않는다**(CORS의 `Origin`이 사라진다) → `res.vary`.
- Prisma에서 `userId: undefined`는 "조건 없음"이다. 비로그인·빈 id를 where에 그대로 넣지 않는다(`embedding-candidates.ts` 주석). 작성자가 탈퇴하면 `userId`가 null로 남는 비공개 글도 있다.

---

## 8. 참고

- 설계·결정: [`PLAN.md`](PLAN.md) — 5.6(공개 범위 규칙), 6절 B(계약·구현 결과), 7절(평가 계획), 8절(배포 순서), 10절(결정과 미결정)
- 각 레포: `inote-server/docs/handoff/HANDOFF.md`(BE 관점), `inote-server/docs/embeddings-backfill.md`, `inote-server/docs/local-dev-db.md`, `inote-ai/DEV_LOG.md`(A4·A5), `inote-embedder/docs/a2-results.md`·`a3-results.md`
