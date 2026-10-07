# HANDOFF — inote 전체 (inote · inote-server · inote-ai · inote-money)

> PC·채팅·AI 메모리가 바뀌어도 이 파일 + git이 맥락의 단일 소스다.
> **새 세션 시작 시 이 파일을 먼저 읽는다.** (레포 여러 개에 걸친 작업이라 대표 문서를 `inote`에 둔다)
> 마지막 갱신: 2026-10-07 (작성자: Claude Code) · 다음 작업 PC: 미정

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
- 상세 기록: `docs/infra/hosting-migration.md`(공통), `inote-ai/docs/vercel-migration.md`, `inote-ai/docs/supabase-migration.md`, `inote-server/docs/supabase-migration.md`
- Notion `Inote-server` 페이지: 기술 스택·인프라·환경변수·API(68개)·DB 스키마(21개)·테스트·미결정 항목을 10/2에 갱신함. **하위 페이지 5개(DB 문서, API 문서, devlog, 학습 노트, planning)는 아직 낡음.**

---

## 2. 최근 한 일 (전부 푸시됨)

**2026-10-01~02 인프라 (Render 한도 초과 → Supabase 이전)**
- Render 서비스 정지 원인(2개 상시 유지로 750시간 초과) 정리 → BE만 남김
- Neon 백업 → Supabase 이전 (BE 195행·AI 21행, 행 수와 내용 해시 모두 동일). 어긋났던 마이그레이션 3개를 단일 baseline으로 교체
- Render 배포에서 `P3009`(옛 `init` 실패 기록이 새 마이그레이션을 막음) 발생 → `_prisma_migrations`의 실패 행을 직접 삭제하고 재배포로 해결
- `dotenv`가 `package.json`에 없던 것을 직접 의존성으로 추가 (`node dist/main`이 `Cannot find module 'dotenv/config'`로 죽을 수 있었음)
- AI DB를 별도 Supabase 프로젝트로 분리·전환, `schema.sql`에 RLS 추가

**2026-10-02~07 기능 (FE `inote` + BE `inote-server`, 전부 푸시됨)**
- **에디터**: 슬래시(/) 메뉴가 하단 고정 바에 가려지던 문제 수정, 툴바에 표 버튼, 슬래시 검색 영어 지원, 코드 블록 붙여넣기 밀림 수정, 제목 4(H4), **콜아웃** 블록(아이콘 선택, 슬래시·툴바), 제목(h1~h4) 글자 크기 축소
- **글 상세 사이드 영역**: 왼쪽 카테고리·오른쪽 목차를 아이콘으로 접고 펼침(접으면 본문이 넓어짐, 상태는 저장 안 함). 접힌 상태는 제목 줄만 남는다 (`PostArticleLayout`의 컨텍스트 + `OutlinePanel`/`TocPanel` 어댑터 — **서버 컴포넌트에서 함수를 props로 넘길 수 없어서** 컨텍스트로 만든 구조라 render prop으로 바꾸지 말 것)
- **카테고리 경로**: BE가 글 상세(`GET /blog/posts/:id`)와 목록(`/blog/posts`, `/blog/posts/mine`)의 각 글에 `categoryPath`(예: `['학습','AI']`)를 내려준다 — 작성자의 카테고리 트리에서 계산, 못 찾으면 `[category]`, 빈 카테고리면 `[]`, 같은 이름이 여러 곳이면 가장 얕고 먼저 만든 것. FE는 `getCategoryPath`(없으면 `[category]`로 대신)로 글 상세 제목 위 `CategoryBreadcrumb`(학습 > AI)와 목록 카드 배지에 표시
  - 링크: 글 상세의 경로와 사이드바 폴더 줄의 external-link 버튼은 **`/my-posts?category=`** 로 간다. 카테고리별 목록은 나의 글에만 있어서 **작성자 본인(사이드바는 로그인 상태)일 때만 링크**, 아니면 글자로만 보여준다
  - **전체 글(`/`)에는 카테고리 필터가 없다** — 주소에 `category`가 붙어 있으면 제거하고 `/`로 이동(검색어·페이지는 유지). 검색(`q`)만 동작
- **목록 category 필터는 하위 카테고리 포함**: `category=학습`이면 `학습 > AI` 등 하위의 글까지 (글 작성자의 트리 기준, BE `categoryFilter`). 내 글 사이드바의 카테고리별 개수(`categoryCounts`)는 여전히 **정확히 그 카테고리의 글만** 센다 → 상위 카테고리를 눌렀을 때 개수보다 많이 나올 수 있음 (미결정, 아래 3-F)
- **검색(q)·수정 시각(lastEditedAt)** (10/2): 목록 검색(제목·본문), 생성일/수정일 표시, 목록은 마지막 저장순. 카테고리 필터와 검색이 둘 다 최상위 `OR`이라 합칠 때 `combineWhere`로 `AND` 처리 — 새 where 조건을 더할 때 같은 키가 덮어써지지 않게 주의
- **내 글 목록 API(#7)** `GET /blog/posts/mine/outline` 구현 (카테고리 관리 '글 이동' 탭용). 글을 옮길 때 낙관적 업데이트가 옛 `categoryPath`를 지운다
- **글 이동 탭에서 폴더 추가**: 목록 위 '새 최상위 폴더' 입력 + 각 폴더 줄의 '하위 추가'(구조 탭과 같은 방식, 3단계 폴더·'목록에 없는 카테고리' 폴더에는 없음). 같은 이름·50자 초과는 요청 없이 안내(`checkNewCategoryName`). **이름 중복은 FE에서만 막는다 — BE `create`는 아직 허용**. 서버 응답 후에 목록에 나타난다(낙관적 업데이트 아님)
- **목록 카드와 작성자 페이지**: 카드 전체 링크를 없애고 **제목만 `/posts/<id>` 링크**, 작성자("이름 (이메일)")는 별도 링크로 **`/users/<userId>`** (새 페이지 `views/user-posts`, `app/users/[id]`). 그 사람의 공개 글만 '○○의 글' 제목·개수·검색(그 사람 글 안에서)·페이지네이션, 글쓰기 버튼 없음, 없는 사용자는 404 화면(상태 코드는 200 — `app/loading.tsx`의 스트리밍 때문에 `/posts/없는id`와 같음)
- **BE `userId` 필터**: `GET /blog/posts?userId=<id>`는 그 작성자의 공개 글(발행·비공개 제외)만, 이때만 응답에 `author: {id, name}`(없는 사용자면 `null`, 이메일 없음). 검색 결과가 0개여도 이름을 보여주려는 필드. 필터가 없으면 `author` 필드 자체가 없다

**FE (`inote`)**
- 글쓰기 에디터 **표 편집 플로팅 툴바**: 행·열 추가/삭제, 셀 내용 지우기, 셀 병합/분할, 표 삭제 (`shared/ui/editor/table-commands.ts`, `TableToolbar.tsx`). 활성 판정은 `editor.can()`이 아니라 아무것도 안 하는 dispatch로 명령을 돌려서 한다 (`can()`은 행이 하나뿐이어도 `deleteRow`를 true로 돌려줌). FE 테스트 305개 통과, 병합·분할은 브라우저에서 확인
- 카테고리 관리 화면: 트리 개편, 드래그 위치 이동(dnd-kit), 폴더 접기/펼치기, 이름 수정(FE), '글 이동' 탭

**BE (`inote-server`)**
- 고정 글 페이지네이션, AI 다시 요약하기 API, 카테고리 트리용 글 목록(`/blog/posts/outline`)
- ⚠️ **이름 수정 API(#6) 테스트 19개는 일부러 "빨간색"** (구현 전, 자리표시자 `rename`/DTO만 있음)

---

## 3. 다음 할 일 (순서대로)

### A. 사람이 확인할 것 (아직 안 한 것)
1. 로그인한 상태에서 `/write`의 **표 편집 툴바** 확인: `/`로 표 삽입 → 툴바, 행·열 추가/삭제, 드래그로 여러 칸 선택 → 병합/분할, 표 삭제. 저장 후 글 상세(`/posts/[id]`)와 다시 열기(`/write/[id]`)에서 병합 유지. 독서 기록 작성(`/reading/write`)도 같은 에디터
2. 운영 FE에서 AI 채팅: 기존 대화 이력(세션 5건) 보이는지, 새 메시지 저장되는지, Vercel AI 로그에 에러 없는지
3. **Render `INOTE_AI_URL`이 Vercel AI 주소인지 확인** (옛 Render AI 주소면 글 삭제·탈퇴 시 AI 세션 삭제가 조용히 실패)
4. Vercel(AI)에 `KAKAO_REST_API_KEY`가 있는지 확인 (없으면 책 검색이 조용히 실패)
5. cron-job.org **Inote Server** 작업 켜기 (10분, `/api/v1/health`) — Render 월 750시간 한도가 거의 차 있으니 이 작업 1개만
6. **BE(Render) 배포 후 로그인한 화면에서 확인** (10/7 작업은 비로그인으로만 화면 확인함): ① 글 상세의 `학습 > AI`가 나의 글 목록 링크인지(남의 글·비로그인은 글자만) ② 사이드바 폴더 줄 오른쪽 external-link 버튼 ③ 목록 카드 경로 배지 ④ **카테고리 관리 '글 이동' 탭이 글로 채워지고 드래그로 옮겨지는지** (드래그는 자동 테스트 불가) ⑤ 글 이동 탭의 **폴더 추가**(최상위·하위, 중복 이름 안내, 새 폴더로 글 끌어놓기) ⑥ 목록 카드에서 **작성자 클릭 → `/users/[id]`**, 제목만 클릭되는지(배지·빈 곳은 안 눌림), 그 페이지의 검색·페이지네이션

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
- `inote-ai`의 `README.md`·`CLAUDE.md`·`docs/vercel-migration.md` DB 정보 최신화, `render.yaml`·`runtime.txt` 삭제

### D. 보안·설계 과제 (사람 승인 후 진행 — AI가 임의로 정하지 않는다)
- **AI 서버가 요청자를 검증하지 않는다**: FE가 보낸 `user_id`를 그대로 신뢰해서, 공개 글 API에 `userId`가 노출되는 점과 합치면 다른 사람의 대화 목록·이력을 읽을 수 있을 가능성이 크다. 후보: BE가 짧은 수명 토큰 발급 / AI가 Better Auth 세션 직접 검증
- 운영 Swagger(`/api/docs`) 공개 범위, Cloudflare R2 설정(이미지 업로드), Render 750시간 한도 대응(낮 시간대만 핑 vs 유료)

### E. BE 카테고리 작업 (순서 유지)
1. **#6 이름 수정 API — 테스트를 통과하게 구현**
   - 테스트: `inote-server/src/categories/categories.rename.spec.ts`(12개), `dto/rename-category.dto.spec.ts`(7개). 각 테스트에 주석이 있고 파일 상단에 계약·구현 계획이 있다
   - 구현: `dto/rename-category.dto.ts`(공백 정리 `@Transform` + 1~50자), `categories.service.ts`의 `rename`(조회 → 남의 것 404 → 같은 이름이면 그대로 → 중복 400 → 카테고리·내 글을 한 `$transaction`으로 갱신), 컨트롤러 `PATCH /categories/:id`. `Post.category`는 이름 문자열이라 이름이 바뀌면 그 사용자의 글도 같이 갱신해야 한다
   - 사용자가 "테스트가 너무 많다"고 해서 **핵심만 남길지** 먼저 정해도 된다
2. ✅ **#7 내 글 목록 API** `GET /blog/posts/mine/outline` — **구현·푸시 완료**(10/7). 내 글(임시저장 포함, 빈 임시저장 제외) `[{id,title,category,isPrivate,publishedAt}]`, 최신순, 최대 500개. 테스트는 사용자 요청으로 미뤄서 **목록만 `blog.service.spec.ts` 주석에 있다**
3. **#8 카테고리 위치 이동 API** — `it.todo` 38개 골격이 `categories.move.spec.ts`, `dto/move-category.dto.spec.ts`에 있음. `PostCategory.position` 컬럼이 필요 → 이제 baseline이 있으니 **그 위에 새 마이그레이션**으로 추가 (옛 `db push` 방식 금지, 배포 순서 주의)
- FE는 이미 전부 준비됨: 내 글 목록(#7)은 BE가 붙었다. 이름 수정(#6)·위치 이동(#8)은 BE가 붙으면 바로 동작 (지금은 낙관적으로 바뀌었다 되돌아가고 토스트가 뜸). **#6 구현 시 이름이 바뀌면 캐시의 글 `categoryPath`도 옛 이름이라 틀려진다** — 글 `category`를 같이 바꾸는 곳에서 `categoryPath`도 비우거나 다시 받게 할 것 (글 이동은 `changePostCategory`가 이미 비움)

### F. 카테고리 경로 작업의 남은 것 (10/7)
- **BE 테스트를 아직 안 썼다** (사용자가 "다음에 작성"으로 미룸). 목록이 `inote-server/src/blog/blog.service.spec.ts`의 주석(`TODO(테스트)`)에 있다: 상세 `categoryPath`, 목록 `categoryPath`(`withCategoryPaths`), category 필터의 하위 포함(`categoryFilter`, 검색과 합칠 때 `AND`), 내 글 목록(`findMyOutline`), 작성자별 공개 글 목록(`findAll`의 `userId` + `author`)
- **미결정: 사이드바 개수** — 내 글 사이드바·카테고리 관리의 개수는 직속 글만 센다. 상위 카테고리를 하위 합계로 보여줄지(FE에서 합산, BE 변경 없음) 사용자가 정한다
- **알려진 한계**: 카테고리 이름 중복을 `create`가 막지 않아(이름 변경 쪽만 중복 검사 설계) 같은 이름이 다른 부모 아래 있으면 글의 경로가 모호해진다 → 위 규칙(가장 얕고 먼저 만든 것)으로 고름. 근본 해결은 생성 시 이름 중복 검사
- **BE `create`가 카테고리 이름 중복을 막지 않는다** — 지금은 글 이동 탭(FE)·이름 수정 설계에서만 막는다. 구조 탭의 추가에는 같은 검사를 붙일지도 정하지 않았다. BE 검증을 넣으면 이름 중복 한계가 근본적으로 해결된다
- 글 상세 사이드바(카테고리·목차) 접기는 **독서 기록 상세에는 아직 없다**

### G. 그 뒤 / 보류
- Notion: `Inote-server` 하위 페이지 5개 정리(특히 devlog에 인프라 이전 기록, DB 문서의 ERD, API 문서의 엔드포인트 목록)
- 통합 테스트: dev DB가 없으니 대상 DB를 먼저 정해야 한다. Playwright 확장은 보류
- BE를 Vercel(NestJS zero-config)로 옮길지 결정 — 필요한 조정: 시작 시 migrate → 빌드 단계로, 업로드 4.5MB 제한, Prisma `binaryTargets`, 풀러
- 포트폴리오(`portfolio-site`)는 **사용자가 직접 수정 중** — 건드리지 않는다
- VS Code에서 `categories.rename.spec.ts` 빨간 밑줄 — CLI(tsc/eslint/prettier)는 오류 0개라 에디터 문제로 추정

---

## 4. 합의된 작업 규칙 (반드시 지킬 것)

- **기능 작업 순서: 계약 → FE(유닛·MSW 테스트) → BE → 통합.** 작은 수정은 FE 유닛 테스트만. (`CLAUDE.md`에 기록됨)
- **BE 테스트는 Claude가 목록·골격을 주면 사용자가 작성** (이직 준비 목적) — 사용자가 "다 써 달라"고 하면 그때만 대신 작성. 10/7에는 사용자가 "테스트는 다음에, 주석으로 남겨 달라"고 해서 구현만 하고 목록을 spec 주석에 두었다 (확인용 임시 spec은 돌려 보고 지움)
- **작업은 하나씩**, 끝날 때마다 결과 보고 후 멈춘다. 기획·UX·아키텍처는 대안 제시 → 사용자 승인 후 반영
- **커밋·푸시는 사용자가 요청할 때만**, 기능 단위로 나눠서 커밋. 개인 노트(`backend-interview-notes.*`)는 절대 커밋하지 않는다
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
- BE 전체 `npx jest`는 지금 **이름 수정 테스트 18개 때문에 실패** (구현 전이라 정상). 구현하면 초록색
- `PostMover`/`buildOutline`의 폴더 트리 만드는 코드가 일부 중복 (레이어 때문에 분리됨, 나중에 정리 가능)
- 개발 서버를 재시작할 때 이전 프로세스가 포트를 잡고 있는지 확인 (`lsof -iTCP:3200 -sTCP:LISTEN`)

---

## 6. 참고 문서

| 문서 | 내용 |
|---|---|
| `inote/CLAUDE.md` | 프로젝트 규칙·구조·커밋 전 체크리스트·작업 순서 |
| `inote/docs/infra/hosting-migration.md` | Render 정지 원인, 선택지, 결정, 진행 상황 |
| `inote/docs/infra/notion-draft.md` | Notion 게시용 초안 |
| `inote-ai/docs/vercel-migration.md` | AI 서버 Vercel 이전 상세·트러블슈팅 |
| `inote-ai/docs/supabase-migration.md` | AI DB를 별도 Supabase 프로젝트로 분리한 기록·트러블슈팅 |
| `inote-server/docs/supabase-migration.md` | Neon → Supabase 이전 계획·진행 로그·트러블슈팅 |
| `inote-server/docs/handoff/HANDOFF.md` | BE 쪽 handoff (이 문서를 가리킴) |
| `inote-money/CLAUDE.md`, `inote-money/apps/app/CLAUDE.md` | 자산관리 FE·모바일 앱 규칙 |
