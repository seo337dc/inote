# 백로그 — 일부러 미룬 일 (워크스페이스 전체)

> 이번에 하지 않고 남긴 일을 **여기 한 곳**에 모은다. 레포 3개(`inote`·`inote-server`·`inote-ai`)에 걸친 항목이 섞여 있어서 항목마다 대상 레포를 적었다.
> 2026-11-13 정리: 기능마다 흩어져 있던 후속 파일 17개와 `inote-ai/CLAUDE.md`의 "다음 할 일"을 이 파일로 합쳤다(합친 내용은 `git log`로 복구 가능 — 맨 아래 "정리하며 지운 것" 참고).

## 다른 PC에서 이어갈 때
1. 세 레포를 **같은 부모 폴더**에 받는다 (`inote`, `inote-server`, `inote-ai`). 환경변수 파일은 git에 없다 — 안전한 방법으로 따로 옮긴다(`docs/handoff/HANDOFF.md` 0절).
2. 각 레포에서 `git pull` → `inote/CLAUDE.md` → `inote/docs/handoff/HANDOFF.md` → **이 파일** 순서로 읽는다.
3. 지금 진행 중인 기능은 `docs/todo/` 안의 작업 지시서(아래 목록)에서 이어 간다. 이 백로그는 "당장 안 하는 일"이다.

**표기**: `[FE]` = `inote`, `[BE]` = `inote-server`, `[AI]` = `inote-ai`. `(출처: …)`는 그 항목이 나온 기능·PR·문서다. 사이트 글 주소는 `docs/blog/README.md` 표에 있다.

**규칙**
- 항목을 시작하면 `docs/todo/<기능>.md` 작업 지시서로 **옮기고** 여기서는 지운다. 끝나면 지시서도 지운다(포트폴리오로 건질 것은 건진 뒤).
- 새로 미루는 일은 **이 파일에만** 적는다. 기능마다 후속 파일을 만들지 않는다.
- 가치가 없어진 항목(사소한 리팩토링, 착수 조건이 없는 아이디어)은 쌓지 않고 지운다.

**살아 있는 작업 지시서**: [`admin-embeddings.md`](./admin-embeddings.md)(임베딩 관리 화면 2·3단계), [`memo.md`](./memo.md)(메모장), [`post-unpublish.md`](./post-unpublish.md)(글 임시저장 되돌리기), [`editor-tablet-check.md`](./editor-tablet-check.md)(태블릿 폭 수동 확인 — 현재 분기 표 포함)

---

## 1. 켜기 전에·배포 전에 (조건이 걸린 것)
- [ ] ⚠️ [BE] **임베딩을 켜기 전에: 보관한 글을 비슷한 글 후보에서 제외** — `embedding-candidates.ts`의 `publicCandidatesWhere`·`readableCandidatesWhere`·`ownCandidatesWhere`와 `findSimilar`가 후보 글을 다시 읽는 조회에 `archivedAt: null`을 넣는다. 지금은 운영에서 임베딩이 꺼져 있어(`EMBEDDINGS_ENABLED=false`) 보류했지만 **켜기 전에 안 하면 보관한 글이 남에게 추천될 수 있다.** 벡터는 지우지 않고 후보에서만 뺀다. 보관·해제 때 벡터를 다시 만들지 않는 정책도 이때 확인한다. (이미 한 것: `findSimilar`의 원본 글 검사와 `public-ids` 목록 제외) (출처: 글 보관함 `docs/adr/0007-archive-posts.md` 10절, PR #13·`inote-server` #7)
- [ ] ⚠️ [AI] **채팅 API 인증** — `inote-ai`는 FE가 보낸 `user_id`를 그대로 신뢰한다. 채팅 삭제·이름 수정·연결 변경 API가 생겨서 `user_id`를 위조하면 남의 채팅을 지울 수 있다. 세션 토큰 확인 같은 검증을 별건으로 도입한다. (출처: 채팅 업데이트 `docs/adr/0006-chat-update.md`)
- [ ] ⚠️ [FE] **LLM 답변을 에디터에 넣을 때 sanitize** — 지금은 Tiptap 스키마를 거치는 것만 믿는다. 글 상세(`PostArticle`)는 `dangerouslySetInnerHTML`로 sanitize 없이 출력하므로, LLM 출력이 HTML로 저장되는 경로가 생긴 만큼 별도 sanitize가 필요한지 검토한다. (출처: 채팅 업데이트)
- [ ] [BE] **Render 환경변수 `DATABASE_URL` 끝에 `?connection_limit=3` 적용** — PrismaClient가 2개라 BE 하나가 최대 6개 → 운영 6 + 로컬 4 = 10 ≤ 15(Supabase 세션 풀러 슬롯). 환경변수를 바꾸면 서비스가 재시작된다. 적용 뒤 Supabase SQL Editor에서 `select usename, state, count(*) from pg_stat_activity group by 1, 2`로 운영 BE의 연결 수가 줄었는지 센다(로컬을 껐을 때 9개였음, Render의 코어 수가 다르니 다시 센다). 풀이 모자라 요청이 줄 서는 일(`P2024`)이 없는지 보고 값을 조정한다. 로컬 `.env`에는 `connection_limit=2`를 이미 적용했다. (출처: DB 연결 분석 2026-10-27, 사이트 글 "고아 파일이 생겼다"의 `EMAXCONNSESSION` 절)

## 2. 인증·인프라·운영 [BE]
**빌드·배포**
- [ ] **Render 대시보드 빌드 명령을 pnpm으로 바꿀지 결정** — 지금은 `npm install --include=dev && npx prisma generate && npm run build`라서 `pnpm-lock.yaml`을 무시하고 **모든 의존성이 배포 때마다 범위 안 최신으로** 설치된다(better-auth만 정확히 고정한 상태). lockfile을 따르게 하려면 Build Command를 `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm exec prisma generate && pnpm run build`로(`render.yaml`과 같게) 바꾸고 Start Command도 확인한다. 처음 배포에서 버전이 한꺼번에 바뀔 수 있으니 로컬 lock 기준으로 올라가는지 확인한다.
- [ ] **배포 빌드 로그에서 `[deps] better-auth 1.7.12 -> 1.7.12` 확인** — `prebuild`의 `scripts/print-deps.js`가 찍는 줄. 사이트 글의 "정확한 설치 버전은 확인하지 못했다" 문장을 사실로 바꿀 근거가 된다.
- [ ] **`render.yaml`이 실제로 쓰이는지 정리** — 대시보드 설정이 우선이라 파일과 서비스 설정이 어긋나 있다. Blueprint로 연결하거나, 파일을 지우거나, 내용을 대시보드와 맞춘다.
- [ ] **고정 배포 후 구글 로그인 확인** — 새로 로그인하는 사용자와 기존 사용자 모두. `select "accountId", count(*) from account where "providerId"='google' group by 1 having count(*) > 1`로 중복 행이 또 생기지 않았는지 본다.
- [ ] **better-auth 업그레이드 절차 정하기** — 올릴 때 릴리스 노트·가이드에서 DB 컬럼 의미(예: `account.issuer`) 변경을 확인하고, 로컬에서 구글·이메일 로그인을 해 본 뒤 올린다.
- [ ] **`account.issuer` 컬럼 정리 검토** — 1.7.3 이상은 쓰지 않는다. nullable이라 해롭지 않지만 남길지 마이그레이션으로 뺄지 정한다.

**로그인 문제**
- [ ] ⚠️ **Safari에서 로그인이 안 됨 — 사용자 결정 대기, 구현하지 말 것** (2026-10-27 확인, `docs/handoff/HANDOFF.md` 66행 기준) — 운영(vercel ↔ render)이 서로 다른 사이트라 BE 세션 쿠키가 Safari에서 서드파티 쿠키로 막혀 **이메일·구글 로그인이 모두** 안 된다. 원인은 확정이다. 해결 방안은 A. Vercel rewrites 프록시 / B. 커스텀 도메인 / C. 토큰 방식 중 사용자가 고른다. 정해지면 변경 목록·환경변수·배포 순서·롤백을 먼저 정리해 보여준다.
- [ ] **`state_security_mismatch`("State not persisted correctly") 별도 확인** — 구글 로그인이 연달아 재시도될 때 한 번 찍힌 다른 에러. 중복 문제 해결 후 재현되는지 본다.

**로컬 환경**
- [ ] **로컬 개발 DB 컨테이너가 깨져 있음** — `docker compose up` 시 `RWLayer of container … is unexpectedly nil`. 데이터 볼륨을 건드리지 않고 컨테이너만 다시 만드는 방법을 정해 고친다.

**DB 연결 구조** (출처: DB 연결 분석 2026-10-27)
- [ ] **PrismaClient를 1개로 합치기** — `src/auth/auth.ts`(모듈 로드 시 생성)와 `PrismaService`(Nest DI)가 따로 만든다. `main.ts`가 `auth`를 먼저 import하는 순서와 DI 순서를 함께 정리해야 해서 범위가 크다. 합치면 풀 요구량이 절반이 된다. 합친 뒤 `auth` 쪽도 `$connect()`/종료 처리를 같이 한다.
- [ ] **트랜잭션 모드 풀러(6543)로 전환** — `DATABASE_URL`을 6543 + `?pgbouncer=true&connection_limit=N`으로, 마이그레이션용 `DIRECT_URL`(지금의 5432 풀러 주소)을 `schema.prisma`의 `directUrl`로 추가한다. Supabase 직접 연결 주소는 IPv6 전용이라 Render에서 안 붙을 수 있어 5432 풀러를 쓴다. 서버가 3개 이상이거나 BE를 여러 개 띄울 때 필요하다. **배포 순서**: ① Render에 `DIRECT_URL` 먼저 추가(현재 코드는 무시) → ② `directUrl`이 들어간 코드 배포 → ③ `DATABASE_URL`을 6543으로 변경(`start:prod`의 `migrate deploy`는 6543에서 동작하지 않으므로 ②가 먼저).
- [ ] **`start:prod`의 `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` 유지 여부 확인** — Neon 풀러 시절(2026-09-29, `1d7f34e`)에 `migrate deploy`가 락 타임아웃(P1002)으로 죽던 것을 피하려던 우회책. 지금은 Supabase 5432 풀러라 둬도 해가 없다. `directUrl` 도입 뒤 필요 없는지 확인한다.
- [ ] **개발 환경 분리** — 지금은 운영 DB가 개발 DB를 겸한다(혼자 쓰는 프로젝트라 의도한 선택). 여럿이 쓰거나 로컬 DB에 쓰기 부담이 생기면 로컬→로컬 DB, 개발 서버→개발 DB, 운영 서버→운영 DB로 나눈다. Supabase 무료 프로젝트 수 한도(BE·AI가 이미 사용)를 먼저 확인한다.
- [ ] **better-auth `session.cookieCache` 검토** — 지금은 인증이 필요한 요청마다 세션을 DB에서 조회한다(`AuthGuard` → `getSession` → `prisma.session.findFirst`). 쿠키 캐시를 켜면 조회와 연결 사용이 줄지만 세션 취소 반영이 늦어지는 부작용을 먼저 정한다.

## 3. 임베딩·검색 [BE][AI]
- [ ] [AI] **KURE 모델을 도커 이미지에 포함(굽기)** — 지금 `inote-embedder/Dockerfile`은 모델을 이미지에 넣지 않고 시작할 때 `HF_HOME=/models`로 내려받는다(로컬 측정: 새로 받는 첫 시작 약 2분, 모델이 있을 때 재시작 약 15초). `inote-ai`의 임베딩 호출 상한이 40초라 그동안 들어온 임베딩은 빠진다. 디스크가 초기화되는 호스트(Hugging Face Spaces 등)에서는 필요하고, 디스크가 유지되는 VM(Oracle 계획)이면 우선순위가 낮을 것으로 **추측**한다(배포 후 확인). 이미지 크기 한도는 확인 못 했다. 호스트가 정해진 뒤에 결정한다. 배경: 운영 호스팅 후보는 Oracle Cloud Always Free이고 배포는 아직 시작하지 않았으며 지금은 임베딩을 로컬 전용으로 돌린다(운영은 작업 큐에 남기고 로컬 워커가 처리). 비교는 `docs/kure/PLAN.md` 8절. (출처: KURE 호스팅 2026-11-03)
- [ ] [BE] **`totalPages` 계산 공통화** — `Math.max(1, Math.ceil(total / pageSize))`가 `admin-users.service.ts`와 `admin-embeddings.service.ts`에 있다. **세 번째 목록 API가 생기면 그 자리에서 공통 헬퍼로 뽑는다**(프로젝트 규칙).
- [ ] [BE] **`AdminEmbeddingsService.list` 분해** — 한 함수가 조회·AI 호출·판정·행 조립·정렬·필터·페이지·응답 조립을 한다(약 60줄). 행 조립(`NO_EMBEDDING` 폴백 포함)과 `summarize`를 순수 함수로 빼면 Prisma·AI mock 없이 테스트할 수 있다. 다음에 이 파일을 크게 고칠 때 같이 판단한다.
- [ ] [BE] **spec 3개의 `beforeEach/afterEach` 공통화** — `inote-ai-embeddings.spec.ts`·`similar-posts.spec.ts`의 `it.todo`가 채워지면 같은 fetch spy·env 복원이 spec 3개에 생긴다. 그때 공통 헬퍼로 모은다(세 번째 반복).
- 알려진 한계: 대상 글(비공개·보관·임시저장 제외)이 하나도 없으면 상태 조회를 건너뛰어 `aiAvailable`이 `true`로 나온다(실제 AI 응답 여부는 확인하지 않은 값).

## 4. 글·보관함
- [ ] [BE] **사용자 삭제·탈퇴 때 보관한 글 처리 확인** — 사용자 삭제/탈퇴 때 보관 글도 함께 지워지는지 확인한다. (출처: 글 보관함)
- [ ] [BE] **보관한 글의 이미지·AI 요약 정책** — 보관 중인 글의 R2 이미지를 어떻게 둘지, 요약을 다시 만들지. (출처: 글 보관함)
- [ ] [FE][BE] **보관 해제 시 고정 복원** — 지금은 보관하면 고정이 풀리고 복원하지 않는다. (출처: 글 보관함)

## 5. 에디터 [FE]
**이미지 업로드** (출처: 에디터 이미지 업로드 `docs/adr/0002-editor-image-upload.md`, PR #8; 설계 글은 사이트 "R2 업로드 정리 전략 설계기")
- [ ] **고아 파일 정리 배치(우선순위 높음)** — 저장 안 하고 나간 업로드, 글에서 지운 이미지, 삭제된 글의 이미지가 R2에 남는다. 설계 글 5-3(참조 기반: DB 어디에서도 참조하지 않고 24시간 지난 `tmp/`·`post/` 파일 삭제)을 글 이미지에도 적용한다. 참조 판단은 **모든 글(`Post.content`)의 `<img src>`** 기준. 글 삭제 때의 이미지 삭제(`BlogService.remove`)는 2026-10-21에 끝났다.
- [ ] **관리자 사용자 삭제·회원 탈퇴 때 이미지 정리** — 위 정리는 글 삭제(`remove`)에서만 한다. 관리자가 사용자를 지울 때(글 id를 모아 일괄 삭제)와 탈퇴 때도 `post/<userId>/` 폴더(와 tmp) 삭제가 필요하다. [BE]
- [ ] **승격 실패 재시도·알림** — 복사가 실패하면 tmp 주소로 남는다(fail-open). 정리 배치가 "참조 중인 tmp"는 지우지 않지만, 영구 폴더로 옮기는 재시도 경로와 실패 건수 보고가 필요하다.
- [ ] **업로드 중 자동저장 시 이미지 유실** — 올리는 중 이미지가 있는 상태에서 자동저장이 돌면 그 자리는 저장 HTML에서 빠진다(업로드 끝나기 전 이탈 시 유실). 저장 전 업로드 완료 대기 또는 경고를 검토한다.
- [ ] **비공개 글의 이미지 접근 제어** — 공개 URL이라 주소를 아는 사람은 볼 수 있다. 서명 URL 등을 검토한다.
- [ ] **공개 URL을 커스텀 도메인으로, 본문에는 URL 전체가 아니라 키만 저장** — 개발용 `r2.dev`는 운영에 권장되지 않는다(공식 문서 확인 필요).
- [ ] **외부 이미지 URL 허용 정책** — 지금은 건드리지 않고 그대로 둔다. 허용 목록 또는 우리 R2만 허용.
- 필요해지면 (착수 조건 없음): 이미지 정렬(가운데 정렬 때 왼쪽 핸들도 검토)·캡션·alt 편집·키보드 크기 조절(접근성)·확대 보기·여러 장 동시 업로드/진행률·드래그 이동 / 독서 기록 에디터에도 이미지 삽입(`reading/` 폴더 규칙과 함께 설계)·글 썸네일을 tmp→승격 구조로 통일 / 업로드 전 리사이즈·WebP 변환·`srcset`·레이아웃 밀림 방지(원본 가로세로 크기 저장)

**체크리스트(할 일 목록)** (출처: 에디터 체크리스트 1단계, PR #15)
- [ ] **마크다운 붙여넣기 `- [ ] 할 일` 변환 확인** — `markdown-paste`(marked)가 만드는 `<li><input disabled type="checkbox">`는 TaskItem이 읽는 모양(`li[data-type="taskItem"]`)이 아니라 일반 글머리로 붙고 체크박스가 사라질 것으로 **추정**한다(실제로 붙여 확인하지 않음). 확인 후 붙여넣기 변환 규칙을 추가한다.
- [ ] **체크리스트 → 글머리 목록으로 되돌리기 동작 확인** — 글머리 → 체크리스트는 툴바 버튼으로 된다(테스트 확인). 반대로 체크리스트 안에서 툴바 "목록"을 눌렀을 때의 동작은 확인하지 않았다.
- [ ] **스크린리더용 숨김 글자 한국어화** — Tiptap이 영어 문구("Task item checkbox for …")를 넣는다. TaskItem의 `a11y.checkboxLabel` 옵션으로 바꾼다.

**스크롤** (출처: 에디터 스크롤 수정 2026-10-28, `docs/devlog/fe.md`)
- [ ] **붙여넣기 직후 화면이 커서를 따라가지 않음** — 원래 코드에서도 같다. 합성 `ClipboardEvent`(text/plain 20줄, 마크다운 목록 20줄)로 재현했고 `scrollTop`이 그대로였다. 붙여넣기 처리는 `shared/ui/editor/markdown-paste.ts`(plain은 `scrollIntoView` 있음, 그 외는 `editor.chain().focus().insertContent()`). 실제 붙여넣기로 다시 확인한 뒤 원인을 조사한다.
- [ ] **모바일 키보드가 올라올 때의 동작** — 키보드가 가리는 영역과 하단 저장 바·`pb-[40vh]`의 상호작용 확인이 필요하다.
- [ ] **실제 글쓰기 화면(`/write`, `/reading` 기록 화면`)에서 직접 확인** — 로그인이 필요해 임시 페이지에서만 측정했다.
- [ ] **툴바가 더 많이 줄바꿈되는 폭에서 top 80이 충분한지** — 1280px(툴바 아래 끝 약 65px)에서만 측정했다. `sm`~`md` 폭에서 툴바가 여러 줄이면 커서가 가려질 수 있다. (`editor-tablet-check.md`와 함께 본다)

**단축키 말풍선** (출처: 에디터 단축키 말풍선 2026-11-13, PR #36)
- [ ] **H1~H4 단축키 동작 맞추기** — 단축키(Mod-Alt-1~4)는 Tiptap 기본 동작이고, 툴바 버튼은 줄바꿈으로 이어진 문단에서 누른 줄만 제목으로 바꾸는 `toggleHeadingOnLine`을 쓴다. 둘이 다르다. 단축키도 같은 동작으로 맞춘 뒤(에디터 확장에 키 바인딩 추가) 말풍선을 붙인다. 지금은 일부러 표시하지 않는다.
- [ ] **링크에 ⌘K를 추가할지** — 단축키가 없는 버튼(링크·표·콜아웃·이미지)은 기존 브라우저 툴팁만 있다. 기능 추가라 사용자가 결정한다.
- [ ] **다른 메뉴에도 말풍선** — 텍스트 선택 시 버블 메뉴(`SelectionBubbleMenu`)·표 편집 툴바(`TableToolbar`). 툴바에 버튼이 없는 단축키(번호 목록 Mod-Shift-7, 밑줄 Mod-u)는 버튼을 만들 때 같이 표시한다. 좁은 화면 `…` 팝오버와 터치 기기는 hover가 없어 붙이지 않았다.
- [ ] **브라우저에서 말풍선 모양·위치·지연(0.4초) 직접 확인** — jsdom으로는 확인할 수 없다.
- [ ] **구조**: `ToolbarButton`의 `hint={{ label, shortcut }}`와 `label`이 같은 문자열을 두 번 받는다. `hint`를 `shortcut?: string`으로 줄이면 B·I·취소선 버튼의 접근 가능한 이름이 "B" → "굵게"로 바뀌어 기존 테스트(`getByRole("button", { name: "B" })`)를 고쳐야 한다. 이름 접근성 개선과 함께 한다. 단축키 정보가 세 곳(`toolbar-shortcuts.ts`·`PostEditor.tsx`·`toolbar-items.ts`)에 나뉘어 있어 앞쪽 그룹(H1~H4·B·I·취소선)을 배열로 바꿀 때 함께 정리한다. `navigator.platform` mock이 두 테스트 파일에 방식이 다르게 있으니 세 번째가 생기면 `src/test/`로 모은다.

**글쓰기·메모 화면** (출처: 에디터 업데이트 2026-11-05, `refactor-advisor` 점검)
- [ ] **입력 없이 나가는 임시 저장 PATCH** (2026-11-05 발견, 보류, 기존 동작) — `/write`로 새 글을 열면 `POST /blog/posts/draft` 직후 아무것도 입력하지 않았는데 약 1.5초 뒤 `PATCH /blog/posts/:id`가 한 번 더 나가고 "임시 저장됨"이 뜬다. 원인(코드 추정, 네트워크 탭 미확인): `WritePostForm.tsx`의 `skipNextAutosave`가 effect를 한 번만 건너뛰는데, draft 로드 커밋에서 그 플래그가 먼저 소비되고 이어서 `setTitle/setCategoryId/setContent` 반영으로 재실행되면 값이 바뀐 경우 타이머가 걸린다. 바뀌는 후보: ① 새 글의 `categoryId`가 `""` → 첫 카테고리 id, ② 에디터가 빈 내용을 `<p></p>`로 정규화. 데이터 손상은 없고 호출 1회 낭비다. 순서: PATCH body의 `categoryId`·`content` 확인 → 실패하는 테스트로 재현(MSW) → "마지막 저장/불러온 body"와 같으면 PATCH 생략.
- [ ] **`shared/lib/slot-actions.ts` 모듈 레벨 가변 상태** — 테스트 간 상태가 샐 수 있다. (A) 테스트용 reset 함수, 또는 (B) `app` 레이어 Context Provider로 이동(구조 변경이라 사람이 정한다). 사용처 5곳이라 당장은 유지.
- [ ] **오른쪽 헤더 버튼(알림 벨·☰) 테두리** — 왼쪽 ghost 아이콘 버튼과 모양이 다르다. 맞출지 사용자가 정한다(`DraftNotificationBell`).
- [ ] **공용 시트 닫기 버튼의 스크린리더 이름이 영어 "Close"** (`shared/ui/sheet.tsx`), **`ToolbarMoreMenu` 팝오버의 키보드 이동·포커스 관리**는 점검하지 않았다.
- [ ] **`useMemoDraft`의 `status`·`loadFailed`와 `MemoSaveStatus` 공개 export가 UI에서 안 쓰인다**(테스트만 사용) — 저장 상태 표시·불러오기 실패 안내를 만들지 정하고, 안 만들면 걷어낸다(`docs/todo/memo.md`).
- [ ] **`useMemoDraft`는 `target`이 마운트 동안 바뀌지 않는다고 가정**(effect 의존성에서 뺌, eslint-disable) — 독서 기록 메모를 붙일 때 같은 컴포넌트가 target만 바꿔 재사용되면 `target.type/id`를 의존성에 넣는 방식으로 다시 검토한다.
- [ ] JS 미디어쿼리 문자열이 Tailwind 분기점과 따로 적혀 있다(`MemoPad.tsx`의 `(min-width: 1024px)`, `PostEditor.tsx`의 `(max-width: 639px)`). 세 번째가 생기면 `shared/lib`에 모은다.

## 6. 채팅·AI [FE][AI]
**채팅 업데이트 후속** (출처: 채팅 업데이트 기획 2026-10-23 — 1차 범위에서 일부러 뺀 것, `docs/adr/0006-chat-update.md`)
- [ ] **채팅 이미지 첨부 + AI 이미지 분석** — 비전 모델 가용성·품질(특히 한국어)이 가장 큰 변수라 마지막으로 미룬다. 착수 전 Groq 문서로 비전 모델부터 확인한다. 이미지는 `inote-server`의 `/uploads/image`(R2)로 올리고 URL만 AI에 전달(Vercel 요청 본문 4.5MB 제한), 메시지에 URL을 jsonb로 저장해 다시 열어도 보이게 한다. 이미지 첨부 요청에서만 비전 모델을 쓰고 평소엔 기존 모델을 유지한다. 한도(안): 메시지당 3장·장당 5MB, 모델 한도 확인 후 확정.
- [ ] **채팅에서 "넣어줘"라고 말하면 AI가 글에 넣기** — 1차는 답변마다 "글에 넣기" 버튼(글 맨 아래 추가). 말로 하는 방식은 `inote-ai`가 에디터 조작 명령(도구 호출)을 돌려주는 구조가 필요하고 1차의 삽입 동작을 호출하는 형태로 얹는다. (`inote-ai` 이전 계획의 "7. 에디터에 삽입 tool-call"과 같은 일)
- [ ] **선택 영역 AI 수정** — 글에서 문단을 선택하고 "이 부분 간결하게" 요청 → 제안을 보여주고 "적용/취소"로 승인. 전체 재작성 없이 선택 영역만 대상. 제안 표시를 diff로 할지 미리보기로 할지 미정.
- [ ] **채팅을 글 외 대상에 연결** — 할 일·독서·일지. 1차는 글만. 서버 모델은 `대상 종류 + 대상 id` 범용 구조라 UI만 추가하면 된다(일지는 "준비 중").
- [ ] **채팅 패널에서 글을 검색해 연결** — 1차는 글 화면에서 "이 글에 연결/해제"만. 임의의 글을 고르려면 글 선택 UI와 권한 처리(남의 글 포함)가 필요하다. 한 채팅을 여러 대상에 연결(N:M)은 필요가 생기면 확장한다.
- [ ] **`inote-ai`의 "초안 작성" 기능 정리 또는 활성화** — `/chat/stream`에 `can_draft=true`일 때 `start_draft` 도구로 AI가 글 초안을 스트리밍하는 서버 코드(`draft_start`/`draft_text`/`draft_done`/`draft_failed` 이벤트)가 있으나 FE는 호출하지 않는다(2026-10-23 검색 기준). 살려서 "AI가 글 써주기"로 확장할지, 쓰지 않으면 서버 코드를 정리할지 결정한다. 과거에 쓰다 뺀 이력인지는 git 로그로 확인 필요.
- [ ] **글 본문 전송 비용 최적화** — 1차는 매 메시지마다 최신 본문을 전송한다(길이 상한만 있음).

**"넣어줘" 자동 흐름** (목표: 채팅에서 "넣어줘" → "글을 새로 작성해드릴까요?" → 새 글 화면으로 자동 이동(채팅 유지) → 제목·본문이 채워짐. 2026-10-28 조사, ADR 0006 확인 전의 분석이라 채팅 개편 이후 재확인 필요)
- 조사한 사실: AI 서버의 `start_draft`·`draft_*` 이벤트는 구현돼 있으나 FE가 `can_draft`를 보내지 않고 `{text}` 이벤트만 읽는다. 에디터에 값을 넘기는 통로가 없다(FSD상 채팅 위젯과 글쓰기 기능은 서로 import 불가 → `shared`의 중간 매개체 필요). `/write`는 이어 쓸 draft가 있으면 선택 모달이 먼저 떠서, 자동 흐름은 FE가 draft를 직접 만들고(`POST /blog/posts/draft`) `/write/{id}`로 바로 이동해야 한다(`WritePostForm.tsx`). 서버 도구가 글쓰기 화면 전용 설계(`can_draft`)라 다른 화면에서 받으려면 설계 확장이 필요하다.
- 미결정(사용자가 답하지 않음) — 제안: ① 확인 질문은 FE 확인 카드 [새 글로 작성][취소] ② 서버가 제안만 보내고 수락 후 본문 생성(`inote-ai` 변경 필요) ③ 새 글 세션 전환을 건너뛰고 현재 대화 유지 ④ 에디터 반영은 완료 후 한 번에(실시간 채우기는 미완성 마크다운을 Tiptap에 계속 넣어야 해서 어려움) ⑤ 이미 `/write`에 있을 때 항상 새 글인지 편집 중인 글에 넣을지 ⑥ 로그인 사용자에게만 제공할지.
- 단계 제안: 1단계(서버 변경 없음) `/write` 화면에서만 `can_draft`를 켜고 `draft_*`를 에디터에 반영 → 2단계 다른 화면에서 확인 카드·자동 이동·대화 유지.

**할 일·독서·글쓰기 자동 구별** (새로 정할 것)
- "학습"이 아니라 **도구 설계 + 예문 평가**로 푼다: `create_todo`·`start_reading_log`·`start_draft` 같은 도구를 모델이 고르게 하고(function calling) 예문 평가 세트로 정확도를 잰다(`start_draft`·`scripts/eval_draft_intent.py`가 이미 같은 구조). 순서: 도구 정의(설명·인자) → 평가 세트(애매한 경우 포함) → 정확도 확인 → 확신이 낮으면 되묻기 → **사용자 확인 후 실행**. 주의: 독서 기록과 글쓰기는 경계가 겹침(책 감상문), 필수 인자(기한·책 제목) 환각 방지, 비공개 글을 외부 LLM(Groq)에 보낼 때의 정책. 파인튜닝은 예문·도구 설명을 다듬어도 안 될 때만 검토한다.

**`inote-ai` 기능 순서 중 남은 것** (출처: `inote-ai/CLAUDE.md` "다음 할 일 — 블로그 LLM 기능 진행 순서" 2026-09-11, 1~5·3.5번은 완료)
- [ ] [AI] **웹 검색 도구 추가** — Groq `compound-beta` 연동.
- [ ] [BE][AI] **오래된 draft 정리 배치** — `inote-server`에 매일 00시 크론(`@nestjs/schedule`, 인프로세스 크론으로 충분): `publishedAt IS NULL`이고 `createdAt` 기준 2일 지난 `Post` 삭제 → 삭제된 postId 목록으로 `inote-ai`를 호출(고정 시크릿 헤더)해 그 글들의 대화 기록도 삭제. 2026-09-11 재검토 결론: 빈 draft가 DB에 쌓이는 문제는 draft를 없애지 않고 **이 배치로 오래된 draft를 주기적으로 정리**하는 것으로 풀기로 했다(저장 전 채팅을 로컬에만 두는 대안은 새로고침 때 글 내용과 채팅이 함께 날아가서 기각). 즉 이 항목이 그 결론의 후속이다. 코드에 이미 구현됐는지는 확인 필요하고, 이미지 고아 파일 정리 배치(5절)와 하나로 합칠지도 그때 정한다.

**스트리밍 품질·측정** (출처: 진로·기능 정리 2026-10-28)
- [ ] [FE] **스트림 끊김·부분 청크 파싱 테스트 보강** — `useChatMessages`는 테스트가 거의 없었다(세션별 동시 진행 작업으로 일부 늘었는지 확인 필요).
- [ ] [AI][BE] **측정·평가 수치를 표로 남기기** — 도구 선택 정확도, 검색 정확도(recall@k 등)를 표로(KURE 평가 세트 A7·`docs/learning/SEARCH_EVALUATION.md`와 연결), 응답 지연·토큰 사용량 로그(BE 모니터링 계획 `inote-server` ADR 0002와 연결). 지금은 스트림 취소·끊김 복구 없음, 평가 결과 수치 정리 없음, 검색 품질 평가 세트 없음, 지연·토큰 비용 측정 없음이다. 과정은 `docs/portfolio/`와 사이트 글로 남긴다.
- 서버리스 제약으로 지금 못 하는 것: 새로고침·탭 닫기 때 진행 중이던 답변 이어받기(서버가 생성을 연결과 분리해 들고 있어야 함), 백그라운드 생성·재시도 큐. `inote-ai`를 상시 서버로 옮기거나 별도 워커를 둘 때 다시 검토한다.

## 7. 메모 [BE][FE]
(출처: 메모 `docs/todo/memo.md`의 2~4차, `inote-server` PR #12·#18·#20)
- [ ] [BE] **동시에 `POST`하면 10장 상한을 넘을 수 있다** — `count`와 `create`를 한 트랜잭션에 묶었지만 기본 격리 수준(Read Committed)이라 같은 대상에 거의 동시에 두 요청이 오면 둘 다 9장으로 읽어 11장이 된다. 개인 앱의 UX 상한이라 허용했다. **실측(2026-11-10)**: 같은 대상에 POST 14개를 동시에 보내면 201이 12개(실제 12장 저장), 409가 2개였다. 보장이 필요해지면 `Serializable`(실패 시 재시도·409 매핑) 또는 대상 행 잠금(`SELECT ... FOR UPDATE`/advisory lock)을 사람이 정한다.
- [ ] [BE] **general 판정 한 곳으로** — `=== 'general'` → `GENERAL_TARGET_ID` 판정이 서비스 `create`·`targetWhere` 두 곳과 DTO 검증에 있다. 세 번째 사용처가 생기면 `memo-target.ts`에 `resolveTargetId(type, id?)`로 모은다. `targetTitles`·`assertOwnTarget`·`findGroups`의 SQL 문자열 키(`CASE ... || ':' ||`)·`groupConditions`가 post/reading 두 종류를 하드코딩하는 것도 같은 뿌리라, 메모 종류가 세 번째로 늘 때 종류 → (조회 delegate, 오류 문구) 테이블로 묶고 함께 고친다.
- [ ] [BE] **`memos.service.spec.ts`가 800줄에 가깝다** — 다음에 크게 고칠 때 메서드별 파일로 나눈다.
- [ ] [BE] **그룹 조회 인덱스** — `GROUP BY`·`MAX(updatedAt)`로 정렬하는데 지금 인덱스는 `@@index([userId, targetType, targetId])`뿐이라 사용자당 메모가 수천 장이 되면 느려질 수 있다. 개인 앱 규모에서는 문제없다고 보고 두었고, 느려지면 `(userId, updatedAt)` 인덱스나 그룹 요약 컬럼을 검토한다(스키마 변경 → 마이그레이션, 사람이 정한다).
- [ ] [BE][FE] **한 그룹의 메모는 최대 10장이라 응답에 전부 담는다** — 상한이 늘면 그룹 안 페이지네이션이 필요하다.

## 8. 문서·정리
- [ ] **`docs/handoff/HANDOFF.md` 현행화** — 10/7 기준 본문이 낡았다(헤더가 스스로 "낡았을 수 있다"고 적는다). 운영(Vercel·Render) 반영 여부, "다음 할 일" 각 항목의 현재 상태를 확인한다. `inote-server/docs/handoff/HANDOFF.md`도 날짜·카테고리 이름 수정·`Post.categoryId`·이미지 업로드·글 삭제 이미지 정리가 빠져 있다. 진행 중 문서는 끝나면 지우는 원칙(ADR 0008)에 맞춰 최소화하는 것이 다음 정리 단계다.
- [ ] **`docs/kure/` 위치 정리** — `PLAN.md`(설계)·`HANDOFF.md`(인수인계)·`DOCKER-SETUP-GUIDE.md`(세팅)가 한 폴더에 섞여 있다. `adr/`·`handoff/`·`runbooks/`로 나눌 수 있지만 **`inote-server/CLAUDE.md`가 `inote/docs/kure/HANDOFF.md`·`PLAN.md` 경로를 가리키므로** 옮길 때 그 링크도 같이 고친다. `docs/kure/HANDOFF.md`의 "브랜치 `docs/kure-handoff`, main 병합 전"은 이미 PR #3으로 병합돼 낡았다.
- [ ] [FE] **코드 안의 `inote-blog` 문자열** — `DesktopChatPanel.tsx`의 localStorage 키(`inote-blog:llm-panel-width` 등)와 `MandalartGrid.tsx` 화면 문구. 키를 바꾸면 저장된 패널 너비가 초기화된다.
- [ ] **문서 안의 `src/...` 경로를 `apps/web/src/...`로 통일** (2026-09-10 모노레포 전환 후 남은 정리).
- [ ] [BE] **`DEV_LOG.md` 전체를 레포에 둘지** — `docs/devlog/be.md`로 이름이 바뀐 개발 로그를 레포에 둘지, `docs/archive/`로 보낼지, 사이트에만 둘지(최근 항목만 남기고 앞부분을 archive하는 절충도 가능). `docs/learning/LEARNING.md`(1,764줄)가 이전 Notion 원본과 같은지도 확인해 같다면 레포에서 뺀다(학습 문서의 사이트 이전은 별도 단계).
- [ ] [FE] **README의 "구현된 기능" 한 줄**은 기능이 늘면 같이 고쳐야 한다 — 길어지기 전에 devlog 링크로만 두는 것도 고려한다.

## 9. 하지 않기로 한 것 (다시 꺼내지 않기 위한 기록)
- **글 상세 화면에서 작성자가 바로 체크하고 저장(체크리스트 2단계)** — 2026-10-27 사용자 결정으로 하지 않는다. 상세의 체크박스는 보기 전용이고 체크는 수정 화면에서 한다. 다시 하게 되면: 본문 HTML에서 n번째 체크 항목의 `data-checked`·`checked`만 바꾼 새 HTML을 `PATCH /blog/posts/:id`에 `{ content }`만 보낸다(`publish` 없이 — `lastEditedAt`·AI 요약은 안 바뀌어 BE 변경은 필요 없을 가능성이 크지만 실제로 확인한 적은 없다). 다른 탭의 오래된 자동 저장이 체크 상태를 덮어쓸 위험이 있다.
- **에디터 체크리스트 드래그 순서 변경** — 사용자 결정으로 제외(별도 드래그 핸들 확장이 필요).
- **채팅 답변 도중 새 대화 시 MQ(큐) 도입** — 2026-10-28 검토 후 도입하지 않기로 했다. (가) 다음 질문 대기는 브라우저 배열로 충분, (나) 이전 답변을 백그라운드에서 완성하려면 생성과 연결을 분리하는 큐·워커가 필요한데 `inote-ai`가 Vercel(서버리스)이라 상시 워커를 둘 수 없다. 대신 세션별 동시 진행(PR #21)으로 풀었다. 응답을 기다릴 필요가 없는 진짜 비동기 작업이 생길 때 다시 꺼낸다.

## 정리하며 지운 것 (2026-11-13) — 추적용
합친 파일: `inote/docs/todo/`의 `archive-posts`·`chat-update`·`editor-image-upload`·`editor-scroll`·`editor-shortcut-tooltip`·`editor-task-list`·`kure-hosting`·`write-autosave-redundant-patch`·`write-editor-refactor-followups`·`readme-update`·`docs-cleanup`·`feature-backlog-and-direction`·`chat-concurrent-streams-qa`, `inote-server/docs/todo/`의 6개 전부, `inote-ai/CLAUDE.md`의 "다음 할 일" 미완료 항목. 이 정리 커밋 **직전**에 원문이 있다(`git log -- docs/todo/<파일>`로 찾는다).

일부러 옮기지 않은 항목과 이유:
- 글 보관함 "후보": 휴지통, 자동 보관 규칙, 보관함 개수 뱃지, 일반 검색에 보관 글 포함 옵션, 일괄 처리 상한(100개) 조정 — 착수 조건이 없는 아이디어. 필요해지면 다시 쓴다.
- 사소한 P2 리팩토링: 필터 값 한 곳 정의, spec 주석의 "구현 예정" 표현, `shortcut.ts` 상수 정리, `FloatingPanel`·`MemoBottomSheet` 헤더 마크업 중복, `MEMO_AUTOSAVE_MS` export 위치, 메모 캐시 prefix 상수, `GENERAL_TARGET_ID`가 빈 문자열인 점(DTO가 `@IsNotEmpty`로 막아 문제 없음).
- 이미 끝났거나 무효가 된 것: FE `.env.local`이 운영 BE를 가리키는 점의 README 안내(README에 반영됨), cron-job·AI 서버 위치 확인(2026-10-29 확인 완료), 보관함 "배포 순서 지키기"(배포 완료), `inote-ai` README의 cron-job.org 등록 TODO(Render → Vercel 이전으로 무효), 체크리스트 "진행률 표시"·"독서 상세 화면 테스트", 채팅 업데이트 1차(PR로 병합됨).
- 방향 문서(`feature-backlog-and-direction`)의 결정 부분은 `docs/adr/0008-direction-and-working-model.md`로 옮겼다.
