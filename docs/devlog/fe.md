# FE 개발 로그

> `inote-blog` (Next.js) 관련 작업만 기록. BE(`inote-server`)·인프라 관련 필요사항이 FE 작업 중
> 발견되면 여기 같이 적어두고, 실제 구현은 나중에 진행한다.

---

## 2026-09-03 — Next.js 뼈대 + 7개 화면 초기 UI (목업 데이터)

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | `create-next-app`으로 스캐폴드 (TypeScript, Tailwind, App Router, src 디렉터리, pnpm) — 기존 기획 문서(README/PLANNING/STRATEGY/CLAUDE.md)와 병합 | ✅ |
| 2 | 공통 레이아웃(`Nav.tsx`) — 7개 화면 진입점 네비게이션 | ✅ |
| 3 | dev-guide 페이지 — `docs/mandalart.html`을 Next.js 페이지로 이식 (CSS는 `mandalart-` 접두사로 스코프, Tailwind 유틸리티와 클래스명 충돌 방지) | ✅ |
| 4 | 메인 홈페이지 — 공개 글 리스트 + 카테고리 필터 (목업 데이터, `searchParams` 기반) | ✅ |
| 5 | 나의 글 리스트 페이지 — 목업 데이터에서 `mine: true`만 필터 | ✅ |
| 6 | 글쓰기 페이지 — 제목/카테고리/본문 폼 (저장은 미연동, 콘솔 출력만) | ✅ |
| 7 | 카테고리 수정 화면 — 목록 조회 + 추가 (로컬 state만, 저장 API 없음) | ✅ |
| 8 | 내 정보 화면 — 프로필 표시/닉네임 수정 폼 (저장 미연동) | ✅ |
| 9 | 로그인 페이지 — Google/Naver 버튼 UI만 (Better Auth 연동 전) | ✅ |
| 10 | 글 상세 페이지(`/posts/[id]`) 추가 — 목록에서 링크 연결 확인용 | ✅ |
| 11 | 로컬에서 `pnpm dev`(포트 3011) 띄우고 7개 화면 전부 브라우저로 확인 | ✅ |

### 트러블슈팅

- **Next.js 16의 `AGENTS.md`/`CLAUDE.md` 자동 관리**: `next dev`가 AI 에이전트용 규칙 블록을
  `AGENTS.md`(없으면 `CLAUDE.md`)에 자동으로 upsert함. 우리 프로젝트는 `CLAUDE.md`를 세션 간 맥락
  유지용으로 이미 쓰고 있어서, 이게 계속 덮어써지면 곤란함. 소스(`generate-agent-files.js`)를 직접
  읽어보니 **`AGENTS.md`가 존재하면 `CLAUDE.md`는 절대 건드리지 않음** — 그래서 scaffold가 만든
  `AGENTS.md`는 그대로 두고, `README.md`/`CLAUDE.md`는 병합 시 덮어쓰지 않도록 처리.
- **create-next-app이 비어있지 않은 디렉터리를 거부함**: 기획 문서(`.md` 파일들)가 이미 있어서
  스캐폴드 생성이 막힘. `/tmp`의 빈 디렉터리에 먼저 생성한 뒤, `rsync`로 필요한 파일만
  (`README.md`/`CLAUDE.md` 제외) 병합하는 방식으로 해결.
- **Next.js 16 breaking change 확인**: `AGENTS.md`의 안내대로 `node_modules/next/dist/docs/`의
  버전별 업그레이드 가이드를 먼저 읽음. 가장 관련 있는 변경: `params`/`searchParams`가 완전히
  비동기(Promise)로 바뀜 — `PageProps<"...">` 헬퍼 타입과 `await props.params` 패턴으로 작성.
- **Browser 자동화 도구의 "pane hidden" 상태에서 스크린샷이 깨져 보임**: 스크롤 후 스크린샷에
  큰 빈 공간이 보여서 CSS 버그로 의심했으나, `window.innerWidth`가 0으로 나오는 등 pane 자체가
  일시적으로 hidden 상태였던 것으로 확인 (`get_page_text`로 실제 DOM 콘텐츠는 81칸 전부 정상
  출력됨을 확인). 실제 버그 아님.

### 결과

`docs/UI_SCREENS.md`/`TODO.md`에 정리한 7개 화면 전부 목업 데이터 기준으로 첫 렌더링 완료. BE
(`inote-server`의 `blog` 모듈, Prisma 모델, Better Auth 연동)는 이 세션에서 다루지 않고 아래
"다음 할 일"에 남겨둠.

---

## 2026-09-03 (이어서) — FSD(Feature-Sliced Design) 구조로 전환 + shadcn/ui 초기화

사용자가 "화면을 먼저 만들지 말고 하나씩 의논 후 작업"으로 협업 방식을 정정 — 이후 shadcn 적용,
FSD 전환 둘 다 실행 전에 계획을 먼저 제시하고 확인받은 뒤 진행.

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | shadcn/ui 초기화 (`style: base-nova`, `baseColor: neutral`) — inote-money와 동일한 초록 테마로 CSS 변수 맞춤 | ✅ |
| 2 | `eslint-plugin-boundaries` 설치, FSD 레이어 의존성 방향(`app→pages→widgets→features→entities→shared`)을 실제로 강제하는 lint 규칙 작성 | ✅ |
| 3 | `src/lib/mock-posts.ts` → `entities/post`, `entities/category`로 분리 | ✅ |
| 4 | `src/components/Nav.tsx` → `widgets/nav`, 홈/나의글 공용 목록 UI → `widgets/post-list`, 만다라트 → `widgets/mandalart-grid` | ✅ |
| 5 | 각 화면의 상호작용 로직을 `features`로 분리 (`filter-posts-by-category`, `write-post`, `manage-categories`, `edit-profile`) | ✅ |
| 6 | 화면 조합은 `pages` 레이어(폴더명은 `src/views`), `app/*/page.tsx`는 라우팅 껍데기만 남김 | ✅ |
| 7 | `pnpm lint`/`pnpm build` 통과 확인, 일부러 레이어 위반 import를 넣어 lint가 실제로 잡는지 검증 후 원복 | ✅ |
| 8 | 브라우저로 8개 라우트 전부 재확인 (기존과 동일하게 동작) | ✅ |
| 9 | 설계 근거 문서화: `docs/FSD.md` | ✅ |

### 트러블슈팅

- **`src/pages`와 Next.js Pages Router 충돌**: FSD의 `pages` 레이어를 문자 그대로 `src/pages/`에
  두니 `next build`가 "App Router and Pages Router both match path" 에러로 실패함. Next.js는
  `src/pages/` 존재 자체를 레거시 Pages Router로 인식하기 때문. 폴더명을 `src/views`로 바꾸고
  ESLint 설정에서만 FSD 개념상 타입을 `"pages"`로 유지하는 방식으로 해결.
- **`eslint-plugin-boundaries` v7 설정 문법 변경**: 온라인에서 흔히 보이는 `element-types` +
  `rules` 문법이 v7에서 deprecated. `dependencies` 규칙 + `policies`(`from`/`to` 안에
  `element: { type }` 래핑) 문법으로 다시 작성. 설치된 버전의 README를 직접 읽고 확인.
- **의존성 강제가 "진짜" 작동하는지 검증**: `entities/post`에 일부러 `features/write-post`를
  import하는 코드를 넣어서 `pnpm lint`가 `boundaries/dependencies` 에러로 잡는 것을 확인한 뒤
  원복. 폴더 구조만 맞추고 실제로는 강제되지 않는 실수를 반복하지 않기 위함.
- **로컬 dev 서버를 완전히 못 끈 채로 "종료했다"고 잘못 보고한 적 있음**: `pnpm dev`를 `kill`할 때
  부모 프로세스(`node`/`pnpm`)만 죽이고 실제 `next-server` 자식 프로세스가 계속 떠 있었던 적이
  있음. 이후로는 `lsof -iTCP:PORT -sTCP:LISTEN`과 `ps -ef`로 실제 리스닝 프로세스를 확인하고,
  부모+자식 PID를 전부 `kill -9`한 뒤 재확인하는 방식으로 변경.

### 결과

FSD 레이어 구조 + shadcn/ui 테마 적용까지 완료, 기존 7개 화면은 동일하게 동작함(회귀 없음).
`docs/FSD.md`에 설계 근거와 한계를 남겨둠.

---

## 2026-09-03 (이어서 2) — 홈 화면 모바일 대응 (햄버거 + 오른쪽 슬라이드 드로어)

실행 전에 "inote-money에서 이미 검증된 모바일/데스크톱 분리 전략(lg 브레이크포인트, CSS로 숨기기)을
그대로 가져갈지"와 "홈 화면의 카테고리 필터를 드로어 안에 어떻게 넣을지" 두 가지를 먼저 의논하고
확인받은 뒤 진행.

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | shadcn `Sheet` 컴포넌트 설치 (`npx shadcn add sheet`) — 오른쪽 슬라이드 드로어용 | ✅ |
| 2 | `widgets/nav`를 `NavDesktop`/`NavMobile`로 분리, `Nav`는 `hidden lg:block`/`block lg:hidden`으로 CSS 분기 (inote-money 전략 그대로) | ✅ |
| 3 | `NavMobile` — 햄버거 아이콘(lucide `Menu`) + `Sheet(side="right")` 드로어, 네비 링크 목록 (처음엔 `"left"`로 만들었다가 같은 세션에서 "오른쪽으로" 정정받아 바꿈) | ✅ |
| 4 | 홈(`/`)일 때만 드로어 안에 `features/filter-posts-by-category`의 `CategoryFilter`를 그대로 재사용해서 추가 (widgets→features import는 FSD 규칙상 허용) | ✅ |
| 5 | `CategoryFilter`에 `className`/`onNavigate` prop 추가 — 데스크톱 사이드바와 드로어 양쪽에서 재사용, 드로어에서는 클릭 시 드로어 자동 닫힘 | ✅ |
| 6 | `HomePage`에서 데스크톱 사이드바는 `hidden lg:block`으로 감싸서 모바일에서 숨김 | ✅ |
| 7 | `layout.tsx`에서 `<Nav>`를 `<Suspense>`로 감쌈 (`NavMobile`이 `useSearchParams` 사용 — devlog-llm에서 겪었던 것과 같은 이유) | ✅ |

### 트러블슈팅

- **`SheetClose` + `Link`(render prop) 조합이 드로어를 안 닫음**: Base UI의 `SheetClose`에
  `render={<Link .../>}`로 합성하면 네비게이션은 되는데 드로어가 안 닫히는 버그 발견. 이미
  `Sheet`의 `open`/`onOpenChange`를 직접 들고 있었으므로, `SheetClose` 합성에 의존하지 않고
  각 `Link`에 `onClick={() => setOpen(false)}`를 직접 붙이는 방식으로 교체해서 해결.
- **Base UI Dialog는 닫혀도 DOM에서 완전히 안 사라짐**: `document.querySelector('[role="dialog"]')`
  존재 여부로 "열려있다"를 판단하려다 오판할 뻔함 — 종료 트랜지션 때문에 노드는 유지되고
  `data-open` 속성만 사라짐. 검증은 `data-open`/`aria-expanded`로 해야 정확함.
- **브라우저 자동화 도구의 클릭이 이 세션에서 계속 "pane hidden" 타임아웃남**: 실제 앱 문제가
  아니라 도구 쪽 문제로 판단 — `javascript_tool`로 DOM을 직접 클릭·검증하는 방식으로 우회해서
  실제 동작(열림/닫힘/네비게이션)을 전부 확인함.
- **stale HMR 상태로 `ReferenceError: SheetClose is not defined`가 뜬 적 있음**: 코드에서
  이미 제거한 import인데도 브라우저 콘솔에 남아있어서 진짜 버그인지 헷갈림 → 개발 서버(부모+자식
  프로세스 전부) 완전 종료 + `.next` 캐시 삭제 + 새 브라우저 탭으로 재확인하니 사라짐. 실제
  버그가 아니라 Turbopack HMR 잔여 상태였음.

### 결과

홈 화면 모바일 버전 완성 — 375px 너비에서 햄버거 아이콘 → 오른쪽 드로어(네비 링크 + 카테고리 필터)
정상 동작, 링크·카테고리 클릭 시 드로어 닫히고 정상 이동까지 확인. 데스크톱 화면은 기존과 동일.

`/write` 페이지의 모바일 레이아웃(발행 버튼과 안내 문구가 겹쳐 보임)은 이번 스코프 밖이라 발견만
해두고 다음에 처리.

---

## 2026-09-03 (이어서 3) — 로그인 화면 재디자인 (LAFTEL 참고)

사용자가 LAFTEL 로그인 화면 스크린샷을 참고로 공유. 어두운 카드 테마를 그대로 가져갈지, 우리
사이트의 밝은+초록 테마를 유지한 채 레이아웃 구조(카드 중앙 배치, 이메일 버튼 우선, "또는"
구분선, 하단 소셜 아이콘)만 가져갈지 확인 후, 후자로 진행.

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | `views/login`을 카드 레이아웃으로 재작성 — 로고 텍스트, 태그라인, `이메일로 시작` 기본 버튼(shadcn `Button` 첫 실사용), "또는" 구분선, 하단 원형 Google 아이콘 버튼 | ✅ |
| 2 | Google "G" 로고는 lucide-react에 브랜드 아이콘이 없어서 공식 4색 SVG를 직접 인라인으로 작성 | ✅ |
| 3 | Naver 버튼은 제거 — 지금은 Google 계정으로만 실제 테스트 가능해서 (사용자 요청) | ✅ |
| 4 | `pnpm lint`/`pnpm build` 통과, 데스크톱/모바일 양쪽 브라우저로 확인 | ✅ |

### 결과

로그인 화면이 LAFTEL 스타일의 "이메일 우선 + 소셜 아이콘 아래" 구조를 우리 라이트 테마로 가져감.
이메일/Google 버튼은 아직 클릭 시 안내 alert만 뜨는 상태 — 실제 연동은 inote-server Better Auth
Phase 1 작업 때 진행.

---

## 2026-09-03 (이어서 4) — 내 정보 화면에 비밀번호 변경 추가

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | `features/edit-profile`의 `ProfileForm`에 비밀번호 변경 섹션 추가 (현재/새/새 확인 3개 필드) | ✅ |
| 2 | 클라이언트 검증 — 새 비밀번호 8자 미만이거나 확인란과 불일치하면 버튼 비활성화 + 안내 문구 | ✅ |
| 3 | Google 계정 로그인 시엔 해당 없다는 안내 문구 추가 (이메일 계정 전용) | ✅ |
| 4 | `pnpm lint`/`pnpm build` 통과, 브라우저에서 검증 로직(불일치→비활성화, 일치→활성화) 실제 확인, 데스크톱/모바일 레이아웃 확인 | ✅ |

### 결과

닉네임 저장 폼 아래에 구분선으로 나뉜 비밀번호 변경 폼 추가. 아직 저장 API는 없어서 제출하면 안내
alert만 뜨는 상태 — 실제 연동은 inote-server Better Auth 비밀번호 변경 API가 필요 (이메일 계정
전용, Phase 1 이후 논의).

---

## 2026-09-03 (이어서 5) — 노션 스타일 에디터 (슬래시 커맨드 포함)

devlog-llm에 이미 만들어둔 Tiptap 에디터(툴바 방식)를 그대로 재사용할지, `/` 슬래시 명령으로 블록을
삽입하는 진짜 노션 스타일까지 갈지 먼저 확인 — 후자로 진행.

### 작업 내용

| # | 작업 | 상태 |
|---|------|------|
| 1 | `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/core`, `@tiptap/suggestion`, `@tiptap/extension-placeholder` 설치 | ✅ |
| 2 | `shared/ui/editor/PostEditor.tsx` — devlog-llm 툴바(H1/H2/B/I/목록/코드) 재사용 + `SlashCommand` 확장 + 빈 에디터 placeholder | ✅ |
| 3 | `shared/ui/editor/slash-command.ts` — `/`로 텍스트·제목1~3·글머리기호·번호매기기·인용·코드블록·구분선 9종 블록 삽입, `@tiptap/suggestion`의 `props.mount()`로 위치 계산 | ✅ |
| 4 | `shared/ui/editor/SlashCommandMenu.tsx` — 키보드(↑↓/Enter)·마우스 둘 다 지원하는 드롭다운, `forwardRef` + `useImperativeHandle`로 `onKeyDown` 노출 | ✅ |
| 5 | `features/write-post/ui/WritePostForm.tsx`에서 `<textarea>` → `<PostEditor>`로 교체, 빈 콘텐츠 판정을 `"<p></p>"` 포함하도록 수정 | ✅ |
| 6 | `pnpm lint`/`pnpm build` 통과, 브라우저에서 슬래시 메뉴 열기·필터링·마우스 클릭 선택·키보드 선택·타이핑까지 전부 실제 확인 | ✅ |

### 트러블슈팅

- **`@tiptap/suggestion` v3 API가 예전 문서/튜토리얼과 다름**: 흔한 예제는 `tippy.js`로 팝업 위치를
  수동 계산하는데, 설치된 v3.31의 타입 정의를 직접 읽어보니 `render()`의 `onStart`에서
  `props.mount(element)`를 호출하면 Floating UI 기반 위치 계산·스크롤 추적을 라이브러리가 알아서
  해줌. `tippy.js`는 아예 필요 없어서 추가했다가 다시 제거함 — 학습 안 하고 예전 기억대로 짰으면
  안 쓰는 의존성만 늘렸을 것.
- **`@tiptap/core`를 직접 import했더니 "Module not found"**: `@tiptap/react`가 내부적으로 쓰긴
  하지만, pnpm의 strict node_modules 구조에서는 간접 의존성을 직접 import할 수 없음(phantom
  dependency 방지). `@tiptap/core`를 `package.json`에 직접 추가해서 해결.
- **Placeholder 텍스트가 안 보임**: `@tiptap/extension-placeholder`는 `data-placeholder` 속성만
  달아주고, 실제로 보여주는 CSS(`::before` + `content: attr(data-placeholder)`)는 직접 넣어야 함
  (공식 문서에 있는 필수 스텝인데 처음엔 빠뜨림). `globals.css`에 추가해서 해결 — 이때 Tiptap이
  에디터 DOM에 `tiptap`과 `ProseMirror` 클래스를 둘 다 붙인다는 것도 확인.
- **브라우저 자동화 도구의 키보드(`computer` 액션 `key`) 이벤트가 슬래시 메뉴의 ↑↓/Enter를
  못 잡음**: 처음엔 내 `onKeyDown` 구현이 잘못된 줄 알았는데, `KeyboardEvent`를 JS로 직접
  `dispatchEvent`하니 정확히 동작함(선택 항목이 하이라이트되고 Enter로 블록이 실제로 바뀜) —
  이 세션의 자동화 도구가 이 페이지에서 synthetic keydown을 ProseMirror까지 못 전달하는
  도구 쪽 한계였음. 실제 버그 아님.
- **마우스 클릭 직후 곧바로 typing하면 텍스트가 새 블록으로 새는 것처럼 보였음**: 클릭→타이핑을
  텀 없이 이어붙인 테스트 스크립트의 타이밍 문제로 판명 (React 상태 반영 전에 다음 입력이 들어감).
  대기 후 타이핑하면 정확히 새로 만들어진 헤딩/블록 안에 들어감 — 실사용자는 클릭과 타이핑 사이에
  자연스러운 지연이 있어서 문제 없음.
- **헤딩·구분선 뒤에 빈 문단이 자동으로 남음**: ProseMirror/StarterKit의 표준 동작 — 마지막 블록이
  헤딩이나 `<hr>`처럼 "막다른 블록"이면 계속 쓸 수 있도록 빈 문단을 붙여줌. 버그 아니고 노션도 같은
  동작을 함.

### 결과

`/write` 페이지 에디터가 툴바 + 슬래시 커맨드 둘 다 갖춘 노션 스타일로 업그레이드됨. 9종 블록
(텍스트/제목1~3/글머리기호/번호매기기/인용/코드블록/구분선) 전부 마우스·키보드 양쪽으로 정상 동작
확인. 에디터 자체는 `Post`를 모르는 순수 재사용 컴포넌트라 `shared/ui`에 배치 (`docs/FSD.md`에
근거 기록).

### 다음 할 일 (BE·인프라 — 이번 세션 범위 밖)

- [ ] `inote-server`에 `blog` 모듈 + Prisma `Post`/`Category` 모델 추가
- [ ] `GET /blog/posts`(공개), `GET /blog/posts?mine=true`(로그인 필요), `POST /blog/posts`
- [ ] `Category` CRUD API
- [ ] 로그인 페이지 → 실제 Better Auth OAuth 플로우 연동
- [ ] 내 정보 화면 → `inote-server`의 유저 정보 API 연동 여부 확인
- [ ] 글쓰기 페이지 저장 → 실제 API 연동
