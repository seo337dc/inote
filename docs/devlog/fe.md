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

### 다음 할 일 (BE·인프라 — 이번 세션 범위 밖)

- [ ] `inote-server`에 `blog` 모듈 + Prisma `Post`/`Category` 모델 추가
- [ ] `GET /blog/posts`(공개), `GET /blog/posts?mine=true`(로그인 필요), `POST /blog/posts`
- [ ] `Category` CRUD API
- [ ] 로그인 페이지 → 실제 Better Auth OAuth 플로우 연동
- [ ] 내 정보 화면 → `inote-server`의 유저 정보 API 연동 여부 확인
- [ ] 글쓰기 페이지 저장 → 실제 API 연동
