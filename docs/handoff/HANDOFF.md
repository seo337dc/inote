# HANDOFF — inote 전체 (inote · inote-server · inote-ai · inote-money)

> PC·채팅·AI 메모리가 바뀌어도 이 파일 + git이 맥락의 단일 소스다.
> **새 세션 시작 시 이 파일을 먼저 읽는다.** (레포 여러 개에 걸친 작업이라 대표 문서를 `inote`에 둔다)
> 마지막 갱신: 2026-10-29 — 낡은 항목을 정리했다. 최근 변경의 상세는 `docs/devlog/fe.md`와 git 이력, 현재 규칙은 `CLAUDE.md`. 확인하지 못한 항목은 "확인 필요"로 표시돼 있다.
> **진행 중인 작업 (2026-10-23): LLM 채팅 업데이트** — 세 레포(inote · inote-ai · inote-server)에 걸친 작업의 인수인계·프롬프트는 [`docs/handoff/chat-update/README.md`](./chat-update/README.md), 결정·API 계약은 `docs/adr/0006-chat-update.md`.

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
6. 이어서 `inote/CLAUDE.md`, 각 레포 `CLAUDE.md`의 규칙을 읽는다.

---

## 1. 지금 인프라 상태 (2026-10-02 기준)

| 구성 | 위치 | 상태 |
|---|---|---|
| FE | Vercel (`https://inote-main.vercel.app`) | 정상. `NEXT_PUBLIC_AI_API_URL`을 AI 주소로 교체·재빌드 완료(이전엔 BE 주소가 들어가 있었음) |
| AI 서버 | **Vercel** (`https://inote-ai-cyan.vercel.app`) | 정상. 새 DB로 전환 완료 (`/health/db` ok, 내부 시크릿 헤더 필요) |
| BE | **Render 무료** (`https://inote-server-5a63.onrender.com`) | 정상 (10/2 복구). 서비스 1개만 상시 유지 — 월 750시간 한도에 거의 붙어 있음 |
| BE DB | **Supabase** (Ohio `us-east-2`, 무료) | 정상. Session pooler 5432, 테이블 21개, RLS 켬, 단일 baseline 마이그레이션 |
| AI DB | **Supabase 별도 프로젝트 `inote-ai`** (Ohio, 무료) | 정상. `public` 스키마, Transaction pooler 6543, 세션 5·대화 16, RLS 켬 |
| Neon (옛 BE DB·AI DB) | | **아직 삭제하지 않음 — 롤백용**. 안정화 후 정리 |
| 슬립 방지 | cron-job.org | **Inote Server 작업(10분 간격, `/api/v1/health`)을 켜야 함 — 활성화 여부 확인 필요** |

- 결정: AI DB는 BE 프로젝트에 `ai` 스키마로 합치려다 **별도 프로젝트로 분리**했다 (AI 서버가 `postgres` 계정으로 BE의 사용자·OAuth 토큰·글까지 읽을 수 있고, 스키마 분리는 보안 경계가 아니라서). 코드는 `ai.` 접두사 없이 원래 SQL 그대로다.
- BE 프로젝트에 합치기 시도 때 복원한 **`ai` 스키마 사본이 남아 있다** → 안정화 후 삭제 대상.
- 새로 만들었다가 쓰지 않는 Supabase 프로젝트가 있으면 정리한다 (무료 프로젝트는 2개까지, 1주 미사용 시 자동 일시중지).
- 상세 기록: `docs/adr/0003-hosting-migration.md`(공통), `inote-ai/docs/adr/0001-render-to-vercel.md`, `inote-ai/docs/adr/0002-neon-to-supabase.md`, `inote-server/docs/adr/0001-neon-to-supabase.md`
- Notion `Inote-server` 페이지: 기술 스택·인프라·환경변수·API(68개)·DB 스키마(21개)·테스트·미결정 항목을 10/2에 갱신함. **하위 페이지 5개(DB 문서, API 문서, devlog, 학습 노트, planning)는 아직 낡음.**

---

## 2. 최근 한 일

상세는 [`docs/devlog/fe.md`](../devlog/fe.md)와 `git log`가 소스다. 이 절에는 옮겨 적지 않는다.

---

## 3. 다음 할 일 (순서대로)

### 0. 지금 남은 일 (2026-10-29 기준 — 아래 A~G는 대부분 10/7 기준이라 낡았을 수 있다)
- **카테고리 이동(#8) BE 운영 배포 여부는 확인 필요** (BE PR #8은 병합됨, 운영 DB 마이그레이션은 적용됨). 배포는 **BE 먼저, FE 나중**.
- **Safari 로그인 이슈 (사용자 결정 대기 — 구현하지 마라)**: 운영(vercel ↔ render)이 서로 다른 사이트라 BE 세션 쿠키가 Safari에서 서드파티 쿠키로 막혀 이메일·구글 로그인 모두 안 된다. 원인은 확정, 해결 방안은 A. Vercel rewrites 프록시 / B. 커스텀 도메인 / C. 토큰 방식 중 사용자가 고른다. 상세는 `inote-server/docs/todo/auth-follow-ups.md`. 정해지면 변경 목록·환경변수·배포 순서·롤백을 먼저 정리해 보여준다.
- 이름 중복 미리 검사로 이동 드롭 막기, 에디터 체크리스트 후속 등은 각 `docs/todo/*.md`.


### A. 사람이 확인할 것 (아직 안 한 것)
1. 로그인한 상태에서 `/write`의 **표 편집 툴바** 확인: `/`로 표 삽입 → 툴바, 행·열 추가/삭제, 드래그로 여러 칸 선택 → 병합/분할, 표 삭제. 저장 후 글 상세(`/posts/[id]`)와 다시 열기(`/write/[id]`)에서 병합 유지. 독서 기록 작성(`/reading/write`)도 같은 에디터
2. 운영 FE에서 AI 채팅: 기존 대화 이력(세션 5건) 보이는지, 새 메시지 저장되는지, Vercel AI 로그에 에러 없는지
3. **Render `INOTE_AI_URL`이 Vercel AI 주소인지 확인** (옛 Render AI 주소면 글 삭제·탈퇴 시 AI 세션 삭제가 조용히 실패)
4. Vercel(AI)에 `KAKAO_REST_API_KEY`가 있는지 확인 (없으면 책 검색이 조용히 실패)
5. cron-job.org **Inote Server** 작업 켜기 (10분, `/api/v1/health`) — Render 월 750시간 한도가 거의 차 있으니 이 작업 1개만
6. **BE(Render) 배포 후 로그인한 화면에서 확인** (10/7 작업은 비로그인으로만 화면 확인함): ① 글 상세의 `학습 > AI`가 나의 글 목록 링크인지(남의 글·비로그인은 글자만) ② 사이드바 폴더 줄 오른쪽 external-link 버튼 ③ 목록 카드 경로 배지 ④ **카테고리 관리 '글 이동' 탭이 글로 채워지고 드래그로 옮겨지는지** (드래그는 자동 테스트 불가) ⑤ 글 이동 탭의 **폴더 추가**(최상위·하위, 중복 이름 안내, 새 폴더로 글 끌어놓기) ⑥ 목록 카드에서 **작성자 클릭 → `/users/[id]`**, 제목만 클릭되는지(배지·빈 곳은 안 눌림), 그 페이지의 검색·페이지네이션 ⑦ 작성자 페이지의 **카테고리 목록**(공개 글 수, 누르면 필터, 비공개만 있는 카테고리는 안 보임) ⑧ **남의 글 상세**에서 왼쪽이 그 작성자의 카테고리로 바뀌는지, 내 글이면 내 카테고리인지, 작성자 이름 클릭(남→`/users/[id]`, 내 글→`/my-posts`) ⑨ 사이드바 이동 아이콘이 호버할 때만 나타나는지 ⑩ **표 열 너비**: `/write`에서 표를 만들어 열 경계를 끌기(막대·커서, 최소 너비) → 저장 후 글 상세에서 너비 유지, 다시 수정에서도 유지, 너비를 크게 넓히면 글 상세 카드 안에서 가로 스크롤(페이지가 안 밀림) ⑪ **콜아웃이 든 글의 수정 화면**(`/write/[id]`)을 열어 콘솔·오버레이에 flushSync 오류가 없는지

### B. `inote-money` 변경 (사용자가 변경이 필요하다고 함 — **구체 범위는 사용자가 정한다**)
- 이 레포는 같은 BE(`inote-server`)를 쓰는 자산관리 FE이고 `https://inote-money.vercel.app`로 배포돼 있다. 인프라가 바뀌었으니 최소한 아래를 점검한다
  - 배포 환경 변수의 `NEXT_PUBLIC_API_URL`이 현재 BE(Render)인지, 로그인·가계부·주식·미니게임이 새 DB(Supabase)에서 정상인지
  - `CLAUDE.md`의 **기술 스택·배포 전략 표가 낡음**: DB를 Neon으로, Render를 "영구 무료"로 적고 있다 → Supabase, 월 750시간 한도로 정정. "현재 단계"·"미결정 항목"도 갱신
  - BE의 `trustedOrigins`에 `https://inote-money.vercel.app`이 이미 들어 있다 (바꿀 일 없음)
- 모바일 앱(`apps/app`, RN+WebView)은 별도 협업 모드(사람이 코딩, Claude는 가이드)이고 `inote-money/CLAUDE.md`의 "모바일 앱" 절이 기준이다. 로그인 쿠키 교환 방식은 BE 쿠키 정책(`SameSite=None; Secure`, `NODE_ENV=production`)과 맞물린다

### C. 안정화 후 정리 (바로 하지 않는다 — 문제가 없는 것을 며칠 확인한 뒤)
- BE 프로젝트의 `ai` 스키마(합치기 시도 사본) 삭제, Neon 두 DB 삭제(백업 보관 후), 쓰지 않는 Supabase 프로젝트 삭제
- Supabase 비밀번호 로테이션 (BE 프로젝트는 한 번 노출된 적 있음). 바꾸면 Render·로컬 `.env`를 같이 갱신
- AI 프로젝트의 **1주 미사용 일시중지 방지**: cron-job으로 AI `/health/db`(내부 시크릿 헤더 필요)를 주기 호출
- `inote-ai`의 `README.md`·`CLAUDE.md`·`docs/adr/0001-render-to-vercel.md` DB 정보 최신화, `render.yaml`·`runtime.txt` 삭제

### D. 보안·설계 과제 (사람 승인 후 진행 — AI가 임의로 정하지 않는다)
- **AI 서버가 요청자를 검증하지 않는다**: FE가 보낸 `user_id`를 그대로 신뢰해서, 공개 글 API에 `userId`가 노출되는 점과 합치면 다른 사람의 대화 목록·이력을 읽을 수 있을 가능성이 크다. 후보: BE가 짧은 수명 토큰 발급 / AI가 Better Auth 세션 직접 검증
- 운영 Swagger(`/api/docs`) 공개 범위, Cloudflare R2 설정(이미지 업로드), Render 750시간 한도 대응(낮 시간대만 핑 vs 유료)


### F. 카테고리 경로 작업의 남은 것 (10/7)
- **BE 테스트를 아직 안 썼다** (사용자가 "다음에 작성"으로 미룸). 목록이 `inote-server/src/blog/blog.service.spec.ts`의 주석(`TODO(테스트)`)에 있다: 상세 `categoryPath`, 목록 `categoryPath`(`withCategoryPaths`), category 필터의 하위 포함(`categoryFilter`, 검색과 합칠 때 `AND`), 내 글 목록(`findMyOutline`), 작성자별 공개 글 목록(`findAll`의 `userId` + `author` + `categories`·`categoryCounts`), 다른 사람의 글 상세 트리(`findUserOutline`), 목록 글마다 `categoryPath`(`withCategoryPaths`)
- **내 글을 열었을 때 왼쪽 목록은 아직 '내 카테고리 + 전체 공개 글(+내 비공개 글)'** 이다. 남의 글처럼 '내 글만'으로 정리할지는 정하지 않았다(요청 없음)
- **미결정: 사이드바 개수** — 내 글 사이드바·카테고리 관리의 개수는 직속 글만 센다(**작성자 페이지·남의 글 상세는 하위 합계**라서 서로 다르다). 상위 카테고리를 하위 합계로 보여줄지(FE에서 합산, BE 변경 없음) 사용자가 정한다
- 글 상세 사이드바(카테고리·목차) 접기는 **독서 기록 상세에는 아직 없다**

### G. 그 뒤 / 보류
- Notion: `Inote-server` 하위 페이지 5개 정리(특히 devlog에 인프라 이전 기록, DB 문서의 ERD, API 문서의 엔드포인트 목록)
- 통합 테스트: dev DB가 없으니 대상 DB를 먼저 정해야 한다. Playwright 확장은 보류
- BE를 Vercel(NestJS zero-config)로 옮길지 결정 — 필요한 조정: 시작 시 migrate → 빌드 단계로, 업로드 4.5MB 제한, Prisma `binaryTargets`, 풀러
- 포트폴리오(`portfolio-site`)는 **사용자가 직접 수정 중** — 건드리지 않는다
- VS Code에서 `categories.rename.spec.ts` 빨간 밑줄 — CLI(tsc/eslint/prettier)는 오류 0개라 에디터 문제로 추정

---

## 4. 합의된 작업 규칙 (반드시 지킬 것)

- **BE 테스트는 Claude가 목록·골격을 주면 사용자가 작성** (이직 준비 목적) — 사용자가 "다 써 달라"고 하면 그때만 대신 작성. 10/7에는 사용자가 "테스트는 다음에, 주석으로 남겨 달라"고 해서 구현만 하고 목록을 spec 주석에 두었다 (확인용 임시 spec은 돌려 보고 지움)
- **개인 노트(`backend-interview-notes.*`)는 절대 커밋하지 않는다**
- 낙관적 업데이트를 쓰고 로딩 표시는 넣지 않는다 (사용자 선호)
- 무료 서비스는 **공식 요금 페이지·가입 화면으로 조건을 먼저 확인** (Koyeb 사례). **비밀번호·키·DB 주소는 채팅·문서에 붙이지 않는다.** 에러 메시지에 접속 주소가 그대로 찍히는 경우가 있어 출력도 마스킹한다 (`postgres(ql)?://\S+` → `<연결주소 생략>`)
- 이슈는 "문제 파악 → 해결 방법 검토 → 최종 결론" 순서로 답한다
- Supabase는 앱에서 `DATABASE_URL`(Prisma/psycopg)로만 접속한다. anon/service_role 키는 쓰지 않는다 (service_role은 RLS를 우회)

---

## 5. 알려진 이슈 / 주의

- ⚠️ **로컬 BE와 운영 BE가 같은 Supabase DB를 쓴다** (dev/prod 분리 없음). 로컬에서 데이터를 지우거나 스키마를 바꿀 때, `prisma migrate`·`db push`를 실행할 때 특히 주의
- **DB 주소를 바꾸기 전에 그 DB에 맞는 마이그레이션 코드를 먼저 배포한다.** 반대로 하면 `P3009`로 서버가 재시작을 반복한다 (Render 시작 명령이 `prisma migrate deploy && node dist/main`). 해결은 `_prisma_migrations`의 실패 행(`finished_at`이 null)을 지우고 재배포
- 풀러 에러 구분: `tenant/user ... not found`는 ref나 호스트가 틀린 것(비밀번호 문제 아님), `password authentication failed`는 비밀번호만 다른 것. ref는 이미지에서 읽지 말고 Copy로 복사한다
- 카테고리 관리 화면의 **드래그 동작은 자동 테스트로 재현할 수 없어** 사람이 화면에서 확인해야 한다 (BE 목록 API가 생긴 뒤 글 이동 탭이 실제로 채워진다)
- **로컬 BE를 띄우면 운영 DB에 붙는다** — Supabase Session pooler가 최대 15개라 Prisma 기본 연결 수로는 `EMAXCONNSESSION`으로 500이 난다. 로컬에서만 `DATABASE_URL` 끝에 `?connection_limit=2&pool_timeout=20`을 붙여 실행한다 (`.env`는 수정하지 않고 환경변수로 덮어쓴다)
- **FE를 로컬 BE에 붙이려면** `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev` (인라인되는 값이라 서버 재시작 필요). 확인 뒤 기본 설정으로 되돌릴 것. 공개 글 상세는 서버에서 렌더되므로 Vercel/Render에 배포되기 전에는 새 BE 필드를 이 방법으로만 볼 수 있다
- 다른 PC에서 받은 뒤 스키마가 바뀌었다면(`lastEditedAt` 등) BE에서 `npx prisma generate`를 다시 해야 `tsc`가 통과한다
- 개발 서버를 막 띄웠을 때 첫 화면은 컴파일이 느려서 클라이언트 쿼리(사이드바 등)가 한참 비어 보일 수 있다 — 하이드레이션이 끝난 뒤 다시 확인할 것
- 표 편집 툴바는 표 바로 위 문단 글자를 툴바가 떠 있는 동안 가린다. 헤더 행 삭제는 허용 상태, 분할하면 합쳐졌던 내용은 위쪽 칸에 남는다
- `PostMover`/`buildOutline`의 폴더 트리 만드는 코드가 일부 중복 (레이어 때문에 분리됨, 나중에 정리 가능)

---

## 6. 참고 문서

| 문서 | 내용 |
|---|---|
| `inote/CLAUDE.md` | 프로젝트 규칙·구조·커밋 전 체크리스트·작업 순서 |
| `inote/docs/adr/0003-hosting-migration.md` | Render 정지 원인, 선택지, 결정, 진행 상황 |
| `inote/docs/blog/hosting-migration-notion-draft.md` | Notion 게시용 초안 |
| `inote-ai/docs/adr/0001-render-to-vercel.md` | AI 서버 Vercel 이전 상세·트러블슈팅 |
| `inote-ai/docs/adr/0002-neon-to-supabase.md` | AI DB를 별도 Supabase 프로젝트로 분리한 기록·트러블슈팅 |
| `inote-server/docs/adr/0001-neon-to-supabase.md` | Neon → Supabase 이전 계획·진행 로그·트러블슈팅 |
| `inote-server/docs/handoff/HANDOFF.md` | BE 쪽 handoff (이 문서를 가리킴) |
| `inote-money/CLAUDE.md`, `inote-money/apps/app/CLAUDE.md` | 자산관리 FE·모바일 앱 규칙 |
