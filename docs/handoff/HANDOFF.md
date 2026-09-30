# HANDOFF — inote 전체 (inote · inote-server · inote-ai)

> PC·채팅·AI 메모리가 바뀌어도 이 파일 + git이 맥락의 단일 소스다.
> **새 세션 시작 시 이 파일을 먼저 읽는다.** (레포 3개에 걸친 작업이라 대표 문서를 `inote`에 둔다)
> 마지막 갱신: 2026-09-30 (작성자: Claude Code) · 다음 작업 PC: 다른 PC

---

## 0. 새 PC에서 시작하는 순서 (필수)

1. 세 레포를 같은 부모 폴더에 받는다 (경로는 문서에 나오는 대로 형제 폴더여야 편함)
   - `inote` (FE, Next.js) — https://github.com/seo337dc/inote
   - `inote-server` (BE, NestJS) — https://github.com/seo337dc/inote-server
   - `inote-ai` (AI, FastAPI) — https://github.com/seo337dc/inote-ai
2. 각 레포에서 `git pull`
3. **환경 변수 파일은 git에 없다.** 각자 안전한 방법(비밀번호 관리자 등)으로 옮기거나 다시 만든다. **채팅·문서에 값을 붙이지 않는다.**
   - `inote/apps/web/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_API_URL`
   - `inote-server/.env`: `DATABASE_URL`(Neon pooled, **비밀번호를 9/30에 재설정함 — 새 값 사용**), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `INTERNAL_SECRET`, `INOTE_AI_URL`, `CF_*`(R2), `SENTRY_DSN`(선택), `PORT`
   - `inote-ai/.env`: `GROQ_API_KEY`, `DATABASE_URL`(AI 전용 Neon DB), `INTERNAL_SECRET`(BE와 같은 값), `INOTE_SERVER_URL`(끝에 `/api/v1`), `ALLOWED_ORIGINS`, `KAKAO_REST_API_KEY`
   - 예시 키 목록은 각 레포의 `.env.example`
4. 의존성 설치: 각 레포에서 `pnpm install` (inote는 `apps/web`), inote-ai는 `python3 -m venv venv && venv/bin/pip install -r requirements.txt`
5. 로컬 실행
   - FE: `cd apps/web && pnpm dev` → http://localhost:3011
   - BE: `cd inote-server && pnpm run start:dev` → http://localhost:3200 (Swagger `/api/docs`)
   - AI: `cd inote-ai && venv/bin/uvicorn app.main:app --port 8000` (AI 기능을 시험할 때만)
6. 이어서 `inote/CLAUDE.md`, 각 레포 `CLAUDE.md`의 규칙을 읽는다.

---

## 1. 지금 인프라 상태 (2026-09-30 기준)

| 구성 | 위치 | 상태 |
|---|---|---|
| FE | Vercel (`https://inote-main.vercel.app`) | 정상 |
| AI 서버 | **Vercel** (`https://inote-ai-cyan.vercel.app`) | 정상 (요약·스트리밍·CORS·DB 저장 확인, `/health/db` 진단 엔드포인트 있음) |
| BE | **Render 무료** (`https://inote-server-5a63.onrender.com`) | ⛔ **정지(Suspended)** — 무료 750시간 초과, 다음 달 시작에 재개 예상 |
| BE DB | Neon `ep-fancy-bar` (us-east-1) | 무료 한도 초과 일시정지 경고 있음, 접속은 됨. 비밀번호 재설정 완료 |
| AI DB | Neon `ep-wispy-moon` (us-east-2) | 정상 |
| 슬립 방지 | cron-job.org | AI 작업 삭제함. **Inote Server 작업은 비활성화 상태** — BE 재개를 확인한 뒤 켠다 |

- Koyeb 이전은 **취소**했다 (Mistral 인수 후 신규 무료 플랜 없음). BE는 Render 무료에 남긴다 (서비스 1개라 월 744시간 < 750시간).
- Render의 `inote-ai` 서비스는 삭제했다. Render 환경 변수 `DATABASE_URL`(새 비밀번호)·`INOTE_AI_URL`(Vercel AI 주소)은 이미 교체했다.
- 상세 기록: `docs/infra/hosting-migration.md`(공통), `inote-ai/docs/vercel-migration.md`, `inote-server/docs/supabase-migration.md`, `inote-ai/docs/supabase-migration.md`, Notion용 초안 `docs/infra/notion-draft.md`

---

## 2. 오늘(9/30) 한 일 (전부 푸시됨, 아래 ⚠️ 제외)

**AI/인프라**
- AI 서버를 Render → Vercel로 이전·배포, DB 주소 오류(BE DB를 가리킴) 수정, 에러 로그 정책(`request_id`)과 `/health/db` 진단 추가
- Koyeb 시도 후 중단, Neon 비밀번호 재설정, Render 환경 변수·cron 정리

**FE (`inote`)**
- 글 저장 설정 화면(썸네일·카테고리·공개), 링크 편집 팝업·hover, 인라인 코드, `/write/{id}` 주소, 고정 글 별도 페이지네이션, `useSession` hydration 수정, 글 상세 본문 폭
- 카테고리 관리 화면: 트리 개편, 드래그 위치 이동(dnd-kit), 폴더 접기/펼치기, **이름 수정(FE)**, **'글 이동' 탭(폴더 안 글 표시 + 글 드래그 이동)**

**BE (`inote-server`)**
- `thumbnailUrl`, 고정 글 페이지네이션(`pinnedPage`), AI 다시 요약하기 API, 카테고리 트리용 글 목록(`/blog/posts/outline`)
- ⚠️ **이름 수정 API(#6) 테스트 19개를 작성했고 지금 일부러 "빨간색"이다** (구현 전, 자리표시자 `rename`/DTO만 있음)

---

## 3. 내일 할 일 (순서대로)

### A. 아침: 서비스 복구 확인
1. Render 대시보드에서 `inote-server`가 재개됐는지 확인 (Suspended 배지가 사라졌는지)
   - 자동 재개가 안 되면: Resume/Manual Deploy를 시도, 급하면 유료 플랜(월 약 $7)
2. `GET https://inote-server-5a63.onrender.com/api/v1/health` = 200 확인
3. 운영 확인: 로그인(Google), 글 목록·상세, 글 작성/저장, 이미지 업로드
4. AI 연동 확인: FE 채팅이 **Vercel AI**를 부르는지
   - Vercel(FE) 환경 변수 `NEXT_PUBLIC_AI_API_URL`이 `https://inote-ai-cyan.vercel.app`인지 확인, 아니면 교체 후 재배포
   - Vercel(AI)에 `KAKAO_REST_API_KEY`가 있는지 확인 (없으면 책 검색이 조용히 실패)
   - 글에 연결된 채팅(BE 작성자 확인), 독서 채팅, AI 다시 요약하기
5. 정상이면 cron-job.org의 **Inote Server** 작업을 켠다 (주기 10분, 이 작업 1개만)

### B. Neon 백업 (Supabase 이전 전, 최우선)
- BE DB(`ep-fancy-bar`)와 AI DB(`ep-wispy-moon`)를 로컬로 백업 (저장소에 커밋 금지 — 개인 데이터)
- 로컬에 `pg_dump`가 없다: `brew install libpq` (서버 버전이 **18**이라 pg_dump도 18 이상 필요) 또는 Python(psycopg)으로 테이블별 내보내기
- 행 수를 기록해 이전 후 대조

### C. Neon → Supabase 이전 (`inote-server/docs/supabase-migration.md` 체크리스트 순서)
- 프로젝트 2개(`inote-prod`, `inote-dev`, 리전 us-east-1), Prisma용 사용자
- **스키마 기준선 마이그레이션 재생성** (기존 3개로는 최신 스키마가 안 만들어짐 — `db push`로 반영해 왔음)
- 데이터 이전 → 행 수 대조 → AI 테이블은 별도 스키마 `ai`로 합치기 (AI 코드 SQL에 `ai.` 접두사)
- 보안: Data API 노출 끄기/RLS, 연결은 풀러 주소 (BE는 Session pooler 5432, AI는 Transaction pooler 6543)
- 환경 변수 교체 (Render BE, Vercel AI, 로컬 `.env`) → 검증 → **Neon은 안정화될 때까지 삭제하지 않는다** (롤백용)
- ⚠️ 이 단계는 반나절 예상. A(복구)와 B(백업)가 끝난 뒤에 시작

### D. BE 카테고리 작업 (Supabase와 별개로 진행 가능, 순서 유지)
1. **#6 이름 수정 API — 테스트를 통과하게 구현**
   - 테스트: `inote-server/src/categories/categories.rename.spec.ts`(12개), `dto/rename-category.dto.spec.ts`(7개). 각 테스트에 주석이 있고 파일 상단에 계약·구현 계획이 있다
   - 구현: `dto/rename-category.dto.ts`(공백 정리 `@Transform` + 1~50자), `categories.service.ts`의 `rename`(조회 → 남의 것 404 → 같은 이름이면 그대로 → 중복 400 → 카테고리·내 글을 한 `$transaction`으로 갱신), 컨트롤러 `PATCH /categories/:id`
   - 사용자가 "테스트가 너무 많다"고 해서 **핵심만 남길지** 먼저 정해도 된다 (핵심: 남의 카테고리 404, 이름 중복 400, 글 category를 같은 트랜잭션에서 함께 변경, 내 글만 갱신, DTO 빈 값/51자/공백 정리)
2. **#7 내 글 목록 API** `GET /blog/posts/mine/outline` — 내 글(임시저장 포함, 빈 임시저장 제외) `[{id,title,category,isPrivate,publishedAt}]`, 최신순, 최대 500개. 규칙: **테스트 목록·골격은 Claude가 주고 사용자가 채운 뒤 구현**
3. **#8 카테고리 위치 이동 API** — `it.todo` 38개 골격이 `categories.move.spec.ts`, `dto/move-category.dto.spec.ts`에 있음. `PostCategory.position` 컬럼이 필요 → **Supabase 기준선(C)과 함께** 하는 것이 안전
- FE는 이미 전부 준비됨: 이름 수정·내 글 목록·위치 이동은 BE가 붙으면 바로 동작 (지금은 낙관적으로 바뀌었다 되돌아가고 토스트가 뜸)

### E. 그 뒤 / 보류
- 통합 테스트: Supabase `inote-dev` 프로젝트가 생긴 뒤 (로컬과 운영이 같은 DB라 지금은 위험). Playwright 확장은 보류
- BE를 Vercel(NestJS zero-config)로 옮길지 결정 — 필요한 조정: 시작 시 migrate → 빌드 단계로, 업로드 4.5MB 제한, Prisma `binaryTargets`, 풀러
- 정리: `inote-ai/render.yaml`·`runtime.txt` 삭제, 각 README·CLAUDE.md 배포 정보 최신화, Notion 정리(`docs/infra/notion-draft.md` 기준)
- 사용자 확인 대기: VS Code에서 `categories.rename.spec.ts` 빨간 밑줄 — CLI(tsc/eslint/prettier)는 오류 0개라 에디터 문제로 추정. `ESLint: Restart ESLint Server` → `TypeScript: Restart TS Server` → 그래도 남으면 Problems 패널의 메시지 확인

---

## 4. 합의된 작업 규칙 (반드시 지킬 것)

- **기능 작업 순서: 계약 → FE(유닛·MSW 테스트) → BE → 통합.** 작은 수정은 FE 유닛 테스트만. (`CLAUDE.md`에 기록됨)
- **BE 테스트는 Claude가 목록·골격을 주면 사용자가 작성** (이직 준비 목적) — 사용자가 "다 써 달라"고 하면 그때만 대신 작성
- **작업은 하나씩**, 끝날 때마다 결과 보고 후 멈춘다. 기획·UX·아키텍처는 대안 제시 → 사용자 승인 후 반영
- **커밋·푸시는 사용자가 요청할 때만**, 기능 단위로 나눠서 커밋. 개인 노트(`backend-interview-notes.*`)는 절대 커밋하지 않는다
- 낙관적 업데이트를 쓰고 로딩 표시는 넣지 않는다 (사용자 선호)
- 무료 서비스는 **공식 요금 페이지·가입 화면으로 조건을 먼저 확인** (Koyeb 사례). 비밀번호·키는 채팅에 붙이지 않는다
- 이슈는 "문제 파악 → 해결 방법 검토 → 최종 결론" 순서로 답한다

---

## 5. 알려진 이슈 / 주의

- **BE(Render)가 정지 중이라 운영 데이터 화면이 안 열린다** (9/30 밤 기준). 내일 재개 예정
- 카테고리 관리 화면의 **드래그 동작은 자동 테스트로 재현할 수 없어** 사람이 화면에서 확인해야 한다 (BE 목록 API가 생긴 뒤 글 이동 탭이 실제로 채워진다)
- BE 전체 `npx jest`는 지금 **이름 수정 테스트 18개 때문에 실패** (구현 전이라 정상). 구현하면 초록색
- `PostMover`/`buildOutline`의 폴더 트리 만드는 코드가 일부 중복 (레이어 때문에 분리됨, 나중에 정리 가능)
- 개발 서버를 재시작할 때 이전 프로세스가 포트를 잡고 있는지 확인 (`lsof -iTCP:3200 -sTCP:LISTEN`)
- 로컬 BE와 운영 BE가 **같은 Neon DB**를 쓴다 (Supabase 이전으로 분리 예정) — 로컬에서 데이터를 지우거나 스키마를 바꿀 때 주의

---

## 6. 참고 문서

| 문서 | 내용 |
|---|---|
| `inote/CLAUDE.md` | 프로젝트 규칙·구조·커밋 전 체크리스트·작업 순서 |
| `inote/docs/infra/hosting-migration.md` | Render 정지 원인, 선택지, 결정, 진행 상황 |
| `inote/docs/infra/notion-draft.md` | Notion 게시용 초안 |
| `inote-ai/docs/vercel-migration.md` | AI 서버 Vercel 이전 상세·트러블슈팅 |
| `inote-server/docs/supabase-migration.md` | Neon → Supabase 이전 계획·체크리스트 |
| `inote-ai/docs/supabase-migration.md` | AI DB 합치기(`ai` 스키마) 계획 |
| `inote-server/docs/handoff/HANDOFF.md` | BE 쪽 handoff (이 문서를 가리킴) |
