# TODO — FE 작업 리스트

> `docs/UI_SCREENS.md`를 FE 기준으로 재구성한 실제 작업 체크리스트. BE/인프라 등 FE가 아닌 작업이
> 발견되면 여기서 처리하지 않고 `docs/devlog/fe.md`에 기록만 하고 넘어간다 (오늘은 UI 초기 개발에만
> 집중).

## 0. FE 뼈대

- [ ] `create-next-app`으로 `inote-blog` 스캐폴드 (TypeScript, Tailwind, App Router, src 디렉터리)
- [ ] 공통 레이아웃 — 네비게이션(7개 화면 진입점), 페이지 컨테이너

## 1. dev-guide 페이지 (만다라트) — BE 의존 없음, 최우선

- [ ] `docs/mandalart.html`을 Next.js 페이지로 이식

## 2. 로그인 페이지

- [ ] 로그인 화면 UI (버튼만 — 실제 Better Auth 연동은 BE 준비 후, `docs/devlog/fe.md`에 기록)

## 3. 메인 홈페이지 — 모든 글 리스트 (공개)

- [ ] 글 목록 카드 UI (목업 데이터로 우선 구현)
- [ ] 카테고리 필터 사이드바 UI

## 4. 나의 글 리스트 페이지

- [ ] 홈과 동일한 레이아웃 재사용, "내 글만" 필터 UI (목업 데이터)

## 5. 글쓰기 페이지

- [ ] 에디터 UI (devlog-llm의 Tiptap 에디터 재사용 검토)
- [ ] 카테고리 선택, 발행 버튼 UI

## 6. 내글 카테고리 수정 화면

- [ ] 카테고리 목록/추가/수정 폼 UI (목업 데이터)

## 7. 내 정보 화면

- [ ] 프로필 표시/수정 폼 UI (목업 데이터)

---

각 화면의 목적·BE 요구사항·선행조건 상세는 [`docs/UI_SCREENS.md`](./docs/UI_SCREENS.md) 참고.
진행 기록은 [`docs/devlog/fe.md`](./docs/devlog/fe.md)에 남긴다.
