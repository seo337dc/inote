# Impeccable 디자인 점검 후속 수정

> 시작 2026-11-19. 이 파일은 세션·PC가 바뀌어도 이어 갈 수 있게 하는 작업 지시서다. 끝나면 삭제한다(포트폴리오로 건질 것은 건진 뒤 — `/wrap`).

## 목표
디자인 스킬 [Impeccable](https://github.com/pbakaus/impeccable)을 적용해 FE 전체를 `/impeccable audit`(기술 점검)한 뒤, 사람이 승인한 순서대로 고친다. 점검 점수는 **13/20 (Acceptable)** — 접근성 2, 성능 3, 테마 2, 반응형 3, 구현 일관성 3. 이슈는 P0 0 / P1 2 / P2 4 / P3 1.

## 영향받는 레포·브랜치
| 레포 | 브랜치 | PR |
|---|---|---|
| inote | `chore/impeccable` | 아직 없음 (푸시 전) |

inote-server·inote-ai 변경 없음. Vercel 환경변수 변경 없음.

## 작업 목록 (점검 이슈별)
| # | 이슈 | 명령 | 상태 |
|---|---|---|---|
| 1 | [P1] 낮은 대비 글자 (WCAG 1.4.3) | colorize | 수정 완료, **사람 확인 대기** |
| 2 | [P1] 포커스 표시 없는 입력 (WCAG 2.4.7) | harden | 수정 완료, **사람 확인 대기** |
| 3 | [P2] 작은 터치 대상 (WCAG 2.5.8) | adapt | **A안만** 수정 완료, **사람 확인 대기** |
| 4 | [P2] 이미지 로딩 | optimize | 수정 완료, **사람 확인 대기** |
| 5 | [P2] 하드코딩 팔레트·접근 불가한 다크 모드 | colorize | **보류** (다크 모드 도입 여부가 먼저 정해져야 함) |
| 6 | [P2] `md` 분기점 없음 (태블릿) | adapt | **시작 안 함** — `editor-tablet-check`와 묶어 따로 의논 |
| 7 | 마무리 점검 | polish | 시작 안 함 |

## 한 일 (무엇을 바꿨나)
1. **낮은 대비 글자**: `text-zinc-400`을 `text-zinc-500`으로 일괄 치환(tsx 46개 파일, 97곳; 대비 2.56:1에서 4.83:1). `bg-zinc-100` 위 배지 4곳은 `text-zinc-600`(`TodosPage.tsx`, `CategoryBreadcrumb.tsx`, `ReadingLogDetailPage.tsx`, `MandalartDetailPage.tsx`). `globals.css`의 에디터 플레이스홀더·체크한 할 일 글자도 zinc-500.
2. **포커스 표시**: 테두리 있는 입력 14곳에 `focus:border-zinc-500` 추가(`ProfileForm` 6, `WriteReadingLogForm` 4, `WritePostForm` 제목 1, `MandalartContent` 1, `ChatComposer` 1, `ChatSessionPanel` 1). 기존 `PostMover`·`CategoryManager`의 패턴과 같다. 메모 입력(`MemoPad`, `MemoTabs`)은 테두리 없는 의도된 디자인이라 제외.
3. **터치 대상**:
   - `TodosPage.tsx` 삭제 버튼: `opacity-0`이라 터치 기기에서 보이지 않던 것을 `[@media(hover:hover)]:opacity-0` + `focus-visible:opacity-100`으로 수정. 테스트 `TodosPage.test.tsx` 신규.
   - 22px 토글 버튼 → 24px: `WriteSidePanel.tsx`, `PostArticleLayout.tsx`(헤더 줄 높이·여백도 맞춤: `OUTLINE_HEADER_CLASS` `pl-[30px]`, `TOC_HEADER_CLASS` `pl-9`, `PostArticleLayout.test.tsx` 갱신).
   - `MemoGroupCard.tsx` 링크 아이콘 `p-0.5` → `p-1`.
   - **메모 탭 닫기(`MemoTabs.tsx`, 16px)는 요청에 따라 제외.**
4. **이미지 로딩**: `PostList`(썸네일), `ReadingLogList`(표지)에 `loading="lazy"` `decoding="async"` 추가. 테스트 `PostList.test.tsx` 추가, `ReadingLogList.test.tsx` 신규. 상세 화면 대표 이미지(LCP)·에디터 이미지·아바타는 일부러 제외.
5. 기타: `PRODUCT.md` 작성(Impeccable `init`), `.claude/skills/impeccable/`·`.claude/agents/impeccable-*.md` 설치.

## 다시 시작하는 법
```bash
git fetch && git checkout chore/impeccable && git pull
cd apps/web && pnpm install
pnpm dev            # http://localhost:3011 (로그인 화면은 inote-server 필요)
pnpm test && pnpm lint && pnpm build
```
- 전체 `pnpm test`는 느린 환경(약 3~4분)에서 에디터 테스트가 5초 타임아웃으로 간헐 실패한 적이 있다. 그럴 땐 해당 파일만 단독 실행해 본다(`pnpm exec vitest run <파일>`).
- 로컬 BE의 기본 `DATABASE_URL`은 운영 DB다. 삭제·저장 테스트는 조심하고, 통합 테스트는 `scripts/dev-db.sh start`로 개발 DB를 쓴다(루트 CLAUDE.md).
- `.impeccable/`는 커밋하지 않는다(점검 보고서·로컬 설정이 들어 있음). 점검 보고서는 `.impeccable/audit/` 아래에 있고 다른 PC에는 없다 — 위 작업 목록이 그 요약이다.

## 사람이 직접 확인할 목록 (아직 하지 않음 — 다른 PC에서 확인)
> 코드 변경은 클래스·속성 수준이고 테스트(전체 통과)로는 jsdom 한계상 실제 화면을 못 본다. 아래는 눈으로 봐야 하는 것이다.

**1번 — 글자 대비**
- [ ] 할 일: 마감 배지(회색)가 읽히는지, 완료 항목의 취소선 글자
- [ ] 글 상세: 카테고리 경로 배지와 보조 문구
- [ ] 내 글 목록·임시저장 목록의 안내 문구
- [ ] 글쓰기: 에디터 빈 화면 플레이스홀더
- [ ] 채팅 패널 아이콘 버튼·보조 글자, 프로필 이메일 줄
- [ ] 기존에 구분되던 보조 글자 두 단계가 한 색으로 합쳐져 어색한 곳이 없는지

**2번 — 포커스 표시 (키보드 Tab으로 이동)**
- [ ] 프로필 입력 6곳, 독서 기록 작성(제목 밑줄·저자·날짜), 글쓰기 제목 밑줄, 채팅 입력창·세션 검색창에서 포커스 시 테두리가 진해지는지
- [ ] 마우스로 클릭해도 테두리가 진해지는 것이 거슬리지 않는지

**3번 — 터치 대상**
- [ ] **할 일 삭제 버튼(가장 중요)**: 개발자 도구 터치 모드에서 항상 보이는지. 마우스 모드에서는 행에 올릴 때만 보이고, Tab 이동 시 나타나야 한다. (삭제는 누르지 말고 보이는지만 — 운영 DB일 수 있음)
- [ ] 글쓰기(1280px 이상) 오른쪽 "글 설정" 패널 토글 아이콘과 제목 정렬 (펼침·접힘)
- [ ] 글 상세 목차·개요 패널 토글 아이콘과 제목 정렬 (펼침·접힘)
- [ ] 메모 목록 카드 헤더의 링크(↗) 아이콘이 잘리지 않는지

**4번 — 이미지 지연 로딩**
- [ ] 글 목록(`/`): 썸네일 크기(128×80) 그대로, 스크롤 시 레이아웃이 밀리지 않는지
- [ ] Network 탭 Img 필터: 처음 로드할 때 화면 밖 썸네일은 요청되지 않고 스크롤하면 요청되는지. Elements에서 `<img>`에 `loading="lazy"` `decoding="async"` 확인
- [ ] 독서 기록 목록(`/reading`): 표지 크기(56×80)·정렬, 표지 없는 기록은 글만 나오는지
- [ ] 회귀: 글 상세 대표 이미지가 지연 없이 뜨는지, 에디터 이미지 크기 조절(25/50/75/100%) 정상 동작

## 다음 할 일
- [ ] 위 확인 목록 수행 (사람, 다른 PC) → 어색한 곳은 위치별로 하나씩 의논해서 수정
- [ ] 6번 `md` 분기점: `editor-tablet-check`(백로그)와 묶어 범위 의논
- [ ] 7번 `/impeccable polish` 마무리 점검
- [ ] (선택) `/impeccable audit` 재실행으로 점수 변화 확인 (13/20에서 얼마나 오르는지)
- [ ] 다크 모드를 도입할지 결정 → 5번 진행 여부 (결정 전)
- [ ] **색을 토큰으로 정리 (5번의 1단계, 다크 모드 결정과 무관하게 먼저 진행)** — 별도 브랜치에서 한다(이 브랜치의 변경을 커밋한 뒤 그 위에서 분기). 2026-11-26 코드 확인: `zinc-*` 클래스 718곳·94개 파일, 토큰 클래스는 30곳 안팎, `.dark` 변수는 있지만 `.dark` 클래스를 붙이는 코드는 찾지 못했다. 1단계는 값이 같거나 거의 같은 토큰만 바꾼다(화면 변화 없음): `text-zinc-500`(183곳)→`text-muted-foreground`, `border-zinc-200`(77)→`border-border`, `bg-zinc-100`·`hover:bg-zinc-100`(32+41)→`bg-muted`, `bg-white`(42)→`bg-background`. **`bg-primary`·`bg-accent`는 초록이라 검은 버튼·hover에 쓰면 안 된다.** 2단계(토큰이 없는 `bg-zinc-900` 버튼 64곳, `border-zinc-300` 52곳, 글자색 600/700 단계 합치기)는 새 토큰 이름부터 따로 의논한다.
  - **1단계 진행 (브랜치 `refactor/color-tokens`)**: `text-zinc-500`→`text-muted-foreground` 183줄·71파일 완료, `border-zinc-200`→`border-border` 78줄·46파일 완료. 남음: `bg-zinc-100`·`hover:bg-zinc-100`→`bg-muted`(73곳), `bg-white`→`bg-background`(42곳). 값 차이: `text-zinc-500`→`muted-foreground`는 흰 배경 4.83→4.73:1, 회색 배경(`bg-zinc-100`/`bg-muted`) 4.39→4.34:1(원래도 4.5 미만).
  - `globals.css`의 `var(--color-zinc-500·200, …)` 6곳(155·428·235·299·491·505줄)은 클래스가 아니라 CSS 값이라 1단계 치환에서 뺐다. `var(--muted-foreground)`·`var(--border)`로 맞출지 정한다.
  - **2단계 입력 목록 (커밋 전 리팩토링 점검, 2026-11-26)**
    - `text-muted-foreground` 옆에 `hover:text-zinc-600/700/800/900`이 같은 줄에 있는 곳 43줄(`tabs.tsx:58`, `content-toc.tsx:124`, `PostMover.tsx`·`CategoryManager.tsx` 아이콘 버튼 등) — hover 색도 토큰으로 옮긴다. `grep -rE "text-muted-foreground" src --include='*.tsx' | grep "hover:text-zinc"`로 다시 뽑을 수 있다.
    - `WriteReadingLogForm.tsx:218`의 `hover:text-muted-foreground`는 치환 전부터 기본색과 같아서 효과가 없던 중복이다(화면 변화 없음). hover 색을 정리할 때 지운다.
    - 한 요소 안에서 열림은 `text-zinc-600`, 닫힘은 `text-muted-foreground`로 두 색 체계가 섞인 곳(`PostArticleLayout.tsx:70`, `WriteSidePanel.tsx:32`, `MandalartContent.tsx:63`, `TodosPage.tsx:72`) — 열림 색도 토큰으로 맞추면 `PostArticleLayout.test.tsx`의 `baseColor` 정규식이 `text-[\w-]+` 한 가지로 줄어든다.
    - 클래스 이름으로 색을 검사하는 테스트는 토큰을 더 옮기면 다시 깨진다: `EmbeddingStatusBadge.test.tsx:9-14`, `CategoryFilter.test.tsx:95-96`(`bg-zinc-900`), `Markdown.test.tsx:13,19`(`bg-zinc-100`), `ChatMessages.test.tsx:18,33`(`bg-zinc-200`), `SlashCommandMenu.test.tsx:60,72,82`(`bg-zinc-100`). 깨지면 `toHaveClass` 대신 role·`data-*`로 바꾸는 쪽을 검토한다.
- [ ] 입력 focus 클래스(`outline-none focus:border-zinc-500`, 29곳) 공통화 여부 — 리팩토링 점검 결과 "지금은 유지" 권장. 입력 스타일을 다시 바꿀 일이 생기면 `globals.css` 공통 규칙으로 별도 작업

## 막힌 것·결정 대기
- 다크 모드 도입 여부 (5번의 선행 결정)
- 터치 대상 B안(24px 안팎 아이콘 버튼 약 10곳을 터치 환경에서 40~44px로): 지금은 하지 않기로 함. 필요하면 `pointer:coarse` 분기로 하나씩 의논.
- 메모 탭 닫기(16px)와 메모 입력 포커스 표시는 메모 패널 디자인과 얽혀 있어 제외한 상태

## 포트폴리오 메모
- 점검 13/20(접근성 2) → 수정 후 재점검 점수로 비교 가능 (재점검 전이라 수치 없음 — 지어 쓰지 말 것).
- 원인을 파고든 발견: 할 일 삭제 버튼이 `opacity-0 group-hover:opacity-100`이라 터치 기기에서 보이지 않아 삭제 불가였다(크기 점검 중 발견).
