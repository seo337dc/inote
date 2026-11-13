# HANDOFF — inote 전체 (inote · inote-server · inote-ai · inote-money)

> **이 파일은 "새 PC 시작 순서"와 "지금 인프라 상태", 오래 가는 규칙·주의만 담는다.** 진행 중인 작업은 `docs/todo/<기능>.md`(작업 지시서), 미룬 일은 [`docs/todo/backlog.md`](../todo/backlog.md), 규칙은 `CLAUDE.md`가 맡는다([ADR 0008](../adr/0008-direction-and-working-model.md)). 최근 변경은 [`docs/devlog/fe.md`](../devlog/fe.md)와 `git log`가 소스다.
> **새 세션 시작 시**: `git pull` → 이 파일 → `inote/CLAUDE.md` → 진행 중인 작업이 있으면 그 작업 지시서.
> 마지막 갱신: 2026-11-13. 아래 인프라 표는 **2026-10-02 기준**이고 그 뒤 바뀐 것은 "확인 필요"다.
> **계획만 있고 아직 구현하지 않은 작업**: LLM 채팅 업데이트 — 인수인계·프롬프트 [`docs/handoff/chat-update/README.md`](./chat-update/README.md), 결정·API 계약 `docs/adr/0006-chat-update.md`. 구현 미착수(2026-11-13 코드로 확인, 백로그 6절).

---

## 0. 새 PC에서 시작하는 순서 (필수)

1. 레포를 같은 부모 폴더에 받는다 (경로는 문서에 나오는 대로 형제 폴더여야 편함)
   - `inote` (FE, Next.js) — https://github.com/seo337dc/inote
   - `inote-server` (BE, NestJS) — https://github.com/seo337dc/inote-server
   - `inote-ai` (AI, FastAPI) — https://github.com/seo337dc/inote-ai
   - `inote-money` (자산관리 FE) — https://github.com/seo337dc/inote-money
2. 각 레포에서 `git pull`
3. **환경 변수 파일은 git에 없다.** 각자 안전한 방법(비밀번호 관리자 등)으로 옮기거나 다시 만든다. **채팅·문서에 값을 붙이지 않는다.**
   - `inote/apps/web/.env.local`: `NEXT_PUBLIC_API_URL`(BE 주소), `NEXT_PUBLIC_AI_API_URL`(**AI 서버 주소 `https://inote-ai-cyan.vercel.app`** — BE 주소를 넣으면 `/chat/stream`이 404)
   - `inote-server/.env`: `DATABASE_URL`(**Supabase Session pooler 5432**), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `INTERNAL_SECRET`, `INOTE_AI_URL`, `AUTH_ERROR_FALLBACK_URL`, `CF_*`(R2, 아직 미설정), `PORT`
   - `inote-ai/.env`: `GROQ_API_KEY`, `DATABASE_URL`(**AI 전용 Supabase 프로젝트, Transaction pooler 6543**), `INTERNAL_SECRET`(BE와 같은 값), `INOTE_SERVER_URL`(끝에 `/api/v1`), `ALLOWED_ORIGINS`, `KAKAO_REST_API_KEY`
   - **`DATABASE_URL` 형식 주의**: 값 앞뒤 따옴표 금지(Vercel·Render 입력란), `?pgbouncer=true` 금지(psycopg는 오류, Session pooler는 불필요). 사용자명은 `postgres.<프로젝트ref>`. 로컬 `.env` 파일은 따옴표가 있어도 파이썬(dotenv)이 벗겨주지만 배포 환경 변수에는 넣지 않는다
   - 예시 키 목록은 각 레포의 `.env.example`
   - **이 PC에만 있는 파일**(다른 PC에는 없음, 필요하면 안전하게 옮길 것): `inote-server/.env.supabase.local`, `inote-server/.env.supabase-ai.local`(gitignore 적용), Neon 백업 `~/inote-backups/2026-10-02/`
4. 의존성 설치: 각 레포에서 `pnpm install` (inote는 `apps/web`), inote-ai는 `python3 -m venv venv && venv/bin/pip install -r requirements.txt`
5. 로컬 실행
   - FE: `cd apps/web && pnpm dev` → http://localhost:3011
   - BE: `cd inote-server && pnpm run start:dev` → http://localhost:3200 (Swagger `/api/docs`)
   - AI: `cd inote-ai && venv/bin/uvicorn app.main:app --port 8000` (AI 기능을 시험할 때만)
6. 이어서 `inote/CLAUDE.md`, 각 레포 `CLAUDE.md`의 규칙을 읽는다. 진행 중이던 작업은 `docs/todo/`의 작업 지시서에서 이어 간다.

---

## 1. 지금 인프라 상태 (2026-10-02 기준)

| 구성 | 위치 | 상태 |
|---|---|---|
| FE | Vercel (`https://inote-main.vercel.app`) | 정상. `NEXT_PUBLIC_AI_API_URL`을 AI 주소로 교체·재빌드 완료(이전엔 BE 주소가 들어가 있었음) |
| AI 서버 | **Vercel** (`https://inote-ai-cyan.vercel.app`) | 정상. 새 DB로 전환 완료 (`/health/db` ok, 내부 시크릿 헤더 필요) |
| BE | **Render 무료** (`https://inote-server-5a63.onrender.com`) | 정상 (10/2 복구). 서비스 1개만 상시 유지 — 월 750시간 한도에 거의 붙어 있음 |
| BE DB | **Supabase** (Ohio `us-east-2`, 무료) | 정상. Session pooler 5432, 테이블 21개, RLS 켬, 단일 baseline 마이그레이션 |
| AI DB | **Supabase 별도 프로젝트 `inote-ai`** (Ohio, 무료) | 정상. `public` 스키마, Transaction pooler 6543, 세션 5·대화 16, RLS 켬 |
| Neon (옛 BE DB·AI DB) | | **아직 삭제하지 않음 — 롤백용**. 안정화 후 정리(백로그 10절) |
| 슬립 방지 | cron-job.org | **Inote Server 작업(10분 간격, `/api/v1/health`)을 켜야 함 — 활성화 여부 확인 필요** |

- 결정: AI DB는 BE 프로젝트에 `ai` 스키마로 합치려다 **별도 프로젝트로 분리**했다 (AI 서버가 `postgres` 계정으로 BE의 사용자·OAuth 토큰·글까지 읽을 수 있고, 스키마 분리는 보안 경계가 아니라서). 코드는 `ai.` 접두사 없이 원래 SQL 그대로다.
- BE 프로젝트에 합치기 시도 때 복원한 **`ai` 스키마 사본이 남아 있다** → 안정화 후 삭제 대상. 새로 만들었다가 쓰지 않는 Supabase 프로젝트가 있으면 정리한다 (무료 프로젝트는 2개까지, 1주 미사용 시 자동 일시중지).
- 상세 기록: `docs/adr/0003-hosting-migration.md`(공통)와 사이트에 올린 글(`docs/blog/README.md` 표에 주소). 운영 확인·안정화 후 정리·`inote-money` 점검 같은 해야 할 일은 모두 [`docs/todo/backlog.md`](../todo/backlog.md) 10절에 있다.

---

## 2. 합의된 작업 규칙 (반드시 지킬 것)

- **BE 테스트는 Claude가 목록·골격을 주면 사용자가 작성** (이직 준비 목적) — 사용자가 "다 써 달라"고 하면 그때만 대신 작성. 미룬 테스트 목록은 백로그 10절.
- **개인 노트(`backend-interview-notes.*`)는 절대 커밋하지 않는다**
- 낙관적 업데이트를 쓰고 로딩 표시는 넣지 않는다 (사용자 선호)
- 무료 서비스는 **공식 요금 페이지·가입 화면으로 조건을 먼저 확인** (Koyeb 사례). **비밀번호·키·DB 주소는 채팅·문서에 붙이지 않는다.** 에러 메시지에 접속 주소가 그대로 찍히는 경우가 있어 출력도 마스킹한다 (`postgres(ql)?://\S+` → `<연결주소 생략>`)
- 이슈는 "문제 파악 → 해결 방법 검토 → 최종 결론" 순서로 답한다
- Supabase는 앱에서 `DATABASE_URL`(Prisma/psycopg)로만 접속한다. anon/service_role 키는 쓰지 않는다 (service_role은 RLS를 우회)

---

## 3. 알려진 주의 (오래 가는 것)

- ⚠️ **로컬 BE와 운영 BE가 같은 Supabase DB를 쓴다** (dev/prod 분리 없음). 로컬에서 데이터를 지우거나 스키마를 바꿀 때, `prisma migrate`·`db push`를 실행할 때 특히 주의
- **DB 주소를 바꾸기 전에 그 DB에 맞는 마이그레이션 코드를 먼저 배포한다.** 반대로 하면 `P3009`로 서버가 재시작을 반복한다 (Render 시작 명령이 `prisma migrate deploy && node dist/main`). 해결은 `_prisma_migrations`의 실패 행(`finished_at`이 null)을 지우고 재배포
- 풀러 에러 구분: `tenant/user ... not found`는 ref나 호스트가 틀린 것(비밀번호 문제 아님), `password authentication failed`는 비밀번호만 다른 것. ref는 이미지에서 읽지 말고 Copy로 복사한다
- **로컬 BE를 띄우면 운영 DB에 붙는다** — Supabase Session pooler가 최대 15개라 Prisma 기본 연결 수로는 `EMAXCONNSESSION`으로 500이 난다. 로컬에서만 `DATABASE_URL` 끝에 `?connection_limit=2&pool_timeout=20`을 붙여 실행한다 (`.env`는 수정하지 않고 환경변수로 덮어쓴다)
- **FE를 로컬 BE에 붙이려면** `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev` (인라인되는 값이라 서버 재시작 필요). 확인 뒤 기본 설정으로 되돌릴 것. 공개 글 상세는 서버에서 렌더되므로 Vercel/Render에 배포되기 전에는 새 BE 필드를 이 방법으로만 볼 수 있다
- 다른 PC에서 받은 뒤 스키마가 바뀌었다면(`lastEditedAt` 등) BE에서 `npx prisma generate`를 다시 해야 `tsc`가 통과한다
- 카테고리 관리 화면의 **드래그 동작은 자동 테스트로 재현할 수 없어** 사람이 화면에서 확인해야 한다

---

## 4. 참고 문서

| 문서 | 내용 |
|---|---|
| `inote/CLAUDE.md` | 프로젝트 규칙·구조·커밋 전 체크리스트·작업 순서 |
| `docs/adr/0008-direction-and-working-model.md` | 프로젝트 방향과 작업 방식(문서 종류·수명) |
| `docs/todo/backlog.md` | 미룬 일 전체 (대상 레포·출처 포함) |
| `docs/blog/README.md` | 사이트에 올린 글 목록과 주소 |
| `docs/adr/0003-hosting-migration.md` | Render 정지 원인, 선택지, 결정, 진행 상황 |
| `inote-server/docs/handoff/HANDOFF.md` | BE 쪽 handoff (Claude↔Cursor 인수인계 규칙 포함, 이 문서를 가리킴) |
| `inote-money/CLAUDE.md`, `inote-money/apps/app/CLAUDE.md` | 자산관리 FE·모바일 앱 규칙 |
