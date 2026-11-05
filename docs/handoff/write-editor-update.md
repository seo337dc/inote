# 글쓰기 에디터 업데이트 — 인수인계 (2026-11-05)

> 새 세션은 `git pull`(이 브랜치는 로컬 전용) → `docs/handoff/HANDOFF.md` → `CLAUDE.md` → 이 파일 순서로 읽는다.
> 규칙(화면은 먼저 의논, 커밋·push는 요청 시에만, 하나씩 진행)은 `CLAUDE.md`가 우선이다.

## 현재 상태
- 브랜치: `feat/write-memo-panel` (최신 `origin/main`에서 땀, upstream 해제됨). **아무것도 커밋하지 않았다.**
- dev 서버는 꺼져 있다 (`apps/web`에서 `pnpm dev` → http://localhost:3011, 운영 BE(Render)에 붙는다. 로컬 BE는 운영 DB에 붙으므로 띄우지 않는다).
- 이번 작업과 무관한 변경이 working tree에 섞여 있다: `docs/learning/README.md`(수정), `docs/learning/SSE.md`, `docs/blog/better-auth-duplicate-account.md` — **커밋에서 제외**.

## 끝난 것 (메모장 FE, 서버 저장은 아직)
- 플로팅 패널: `shared/ui/floating-panel.tsx`(react-rnd 동적 import, 드래그·리사이즈, body 포털), 위치 계산 `shared/lib/floating-rect.ts`
- 메모 UI: `entities/memo` — `MemoPad`(버튼 + 패널), `MemoBottomSheet`(좁은 화면 하단 패널, 아래→위 300ms 애니메이션). 입력은 로컬 상태뿐, 최대 10,000자 일반 텍스트.
- 색: `globals.css`의 `--memo*` 변수 (Apple 메모식 노란 종이 톤, 다크 값 포함 — inote에 다크 모드는 아직 없음)
- 데스크톱(lg 이상, AI 패널 기준): 글쓰기 하단 바 오른쪽 끝의 `메모` 버튼 → 버튼 위에 플로팅 패널. 열려 있는 동안 버튼은 숨김.
- 좁은 화면(lg 미만): 오른쪽 아래 도크가 ⋮(`EllipsisVertical`) 버튼이 되고, 누르면 ⋮는 사라지고 AI·메모(`NotebookText`) 아이콘 버튼이 쌓인다. 바깥 클릭·Esc로 접힘. 메모 → 하단 패널.
- 슬롯 연결 방식: `shared/lib/slot-actions.ts` 레지스트리(화면이 버튼을 `dock`·`header-left` 슬롯에 등록하고, `widgets/chat-dock/ui/ChatDock.tsx`·`widgets/nav/ui/NavMobile.tsx`가 그림). 위젯이 feature를 import할 수 없어서 쓴 방식이다. (원래 이름은 `dock-actions.ts`였고 2026-11-05에 슬롯 개념으로 일반화하며 이름을 바꿨다.)
- 번들: `react-rnd` 단독 약 13.2KB gzip(전체 클라이언트 JS 약 605KB gzip의 2%), 동적 import라 첫 로딩에는 영향 없음.
- 검증: 관련 테스트·lint·tsc 통과. **전체 `pnpm test`와 `pnpm build`는 마지막으로 돌리지 않았다** (커밋 전에 `/commit`이 돌린다). 드래그·리사이즈·애니메이션·키보드는 사람이 화면에서 확인해야 한다.

## 합의된 설계 (서버 연동 — 아직 안 함)
- 순서: FE(MSW 목) → BE(사람이 테스트 작성, Claude는 목록·골격만) → 통합(로컬 개발 DB에서만).
- API 계약 (작업하면서 바뀔 수 있다고 사용자가 승인):
  - `GET /memos?targetType=post&targetId=:id` → `Memo[]` (생성순, 본인 것만)
  - `POST /memos` `{ targetType, targetId, content }` → `Memo` (대상이 본인 글/독서 기록인지 서버 검증, Post.userId가 null이면 거부)
  - `PATCH /memos/:id` `{ content }` → `Memo`
  - `Memo = { id, targetType: 'post'|'reading', targetId, content, createdAt, updatedAt }`
- 모델: `targetType` + `targetId` 참조 id 방식(폴리모픽), 대상당 unique 제약 없음(탭 확장 대비), 1차는 FE가 `list[0]`만 표시. 글·독서 기록·회원 삭제 시 메모 삭제를 서비스에서 같은 트랜잭션으로 처리해야 한다(FK가 없으므로 — BE 테스트 목록에 넣을 것).
- 동작: 처음 입력할 때 POST(빈 행 방지), 이후 1.5초 디바운스 PATCH(자동저장 최적화도 고려). POST 완료 전 PATCH가 나가지 않게 직렬화. 메모는 작성자만 보고, 공개 글 응답에 섞이지 않는 별도 컨트롤러.
- 배포: BE 먼저, FE 나중. 마이그레이션은 테이블 추가뿐이지만 로컬 BE 기본 DB가 운영이므로 개발 DB 검증 전에는 `prisma migrate`를 돌리지 않는다.
- 1차 범위 밖: 메모 여러 장(헤더 탭), 독서 기록 화면 마운트, 댓글, 참고/참조 페이지 — `docs/todo/`에 기록할 것(아직 `docs/todo/memo.md`는 없다).

## 에디터 작업 1~3번 — 구현 완료 (2026-11-05, 미커밋, 사람 화면 확인 대기)
1. **`'/'로 블록 삽입` 문구**: `lg` 이상에서만 보인다(`PostEditor.tsx`).
2. **툴바**: `H1~H4, B, I, 취소선`은 글자 버튼 그대로. 뒤쪽 9개(목록·체크박스·인용·링크·인라인 코드·코드 블록·표·콜아웃·이미지)는 **아이콘 버튼**으로 바꿨다(이름은 `aria-label`·`title`). `sm` 미만에서는 `…` 팝오버(`shared/ui/editor/ToolbarMoreMenu.tsx`, 5열 그리드, 항목을 누르면 닫힘, 바깥 클릭·Esc로 닫힘)에 담긴다. 접힘 여부는 `useMediaQuery("(max-width: 639px)")`.
3. **모바일 헤더**: 헤더가 3칸 그리드라 로고가 모든 페이지에서 가운데에 온다. 왼쪽은 `header-left` 슬롯(범용, 등록된 게 없으면 빈 자리). 글쓰기 화면은 `features/write-post/ui/WriteSettingsSheet.tsx`가 `PanelLeft` 아이콘 버튼(테두리 없는 ghost)을 등록하고 왼쪽 시트로 글 설정을 연다. 시트는 선택해도 자동으로 닫히지 않는다. 글 설정 내용은 `WriteSettingsContent.tsx`로 분리해 데스크톱 패널(`WriteSidePanel`)과 같이 쓴다.
4. **분기 기준 변경(결정)**: 헤더·글 설정은 `lg` → **`xl`(1280px)**, AI 패널은 `lg` 그대로. 1024~1279px(태블릿 가로)에서는 모바일 헤더 + 글 설정 시트 + 오른쪽 AI 패널이다. 헤더는 전체 페이지에 적용된다. 표와 이유는 [`docs/todo/editor-tablet-check.md`](../todo/editor-tablet-check.md).
- 검증: 관련 테스트(`PostEditor*`, `slot-actions`, `NavMobile`, `WriteSettingsSheet`, `WriteSidePanel` 등)·lint·tsc 통과. 전체 `pnpm test`·`pnpm build`는 커밋 단계에서 돌린다. **폭에 따른 실제 배치·애니메이션·터치는 사람이 화면에서 확인해야 한다.**
- 남은 정리:
  - (해결) `PostEditor.tsx`가 prettier 기본값으로 재포맷됐던 것은 2026-11-05에 HEAD로 복구한 뒤 같은 변경을 원래 포맷으로 다시 적용했다. 이 저장소에는 prettier 설정이 없으니 `npx prettier`로 파일을 정리하지 않는다.
  - 커밋 전 `refactor-advisor` 점검으로 정리한 것: 툴바 항목 정의를 `shared/ui/editor/toolbar-items.ts`(`buildMoreItems`)로 분리, 버튼 스타일 공유 `toolbar-button-style.ts`, `ChatDock`의 `DockButton`, `WriteSidePanel`의 `{...props}`. 미룬 것(P1/P2)은 커밋 때 `docs/todo/`에 기록한다.
  - 시트 닫기 버튼의 스크린리더 이름이 공용 `sheet.tsx` 그대로 영어 "Close"다(이번에는 손대지 않음).
  - 툴바 접힘을 뷰포트가 아닌 영역 폭으로 바꾸는 안은 보류(`editor-tablet-check.md`의 "보류한 결정").
  - 오른쪽 헤더 버튼(알림 벨·☰)은 아직 테두리가 있다. 왼쪽만 ghost라 모양이 다르다 — 맞출지 사용자가 정한다.

## 별도로 발견한 문제 (이번 작업과 무관, 보류)
- 입력 없이 임시 저장 PATCH가 나가는 문제 → [`docs/todo/write-autosave-redundant-patch.md`](../todo/write-autosave-redundant-patch.md)

## 에이전트·스킬 (이번 세션에 추가)
- `.claude/agents/refactor-advisor.md`: 읽기 전용, 모듈화·리팩토링 후보를 P0/P1/P2로 보고. 새 세션부터 호출 가능.
- `/commit` 스킬(`.claude/skills/commit/SKILL.md`)에 2단계로 `refactor-advisor` 호출을 넣었다 (체크리스트 앞). 커밋을 막지 않고 보고만 한다.
- 사용자가 요청했지만 만들지 않은 것: FE·BE·AI 최적화 점검 에이전트. 합치지 않고 관점별로 나누는 쪽을 추천했고, 범위는 아직 정하지 않았다.

## 커밋할 때 (사용자가 요청하면)
- `/commit` 스킬을 쓴다. 기능 단위로 쪼갠다. 예: ① 플로팅 패널+메모 UI ② 슬롯 레지스트리·모바일 도크(slot-actions, ChatDock) ③ 에디터 툴바(아이콘·`…` 팝오버, 문구 숨김) ④ 모바일 헤더·글 설정 시트·`xl` 분기 ⑤ 문서·에이전트·스킬(CLAUDE.md, refactor-advisor, commit 스킬, todo, handoff). 레지스트리 rename이 ②에 걸쳐 있으니 ④가 ②에 의존한다.
- 메모는 아직 서버에 저장되지 않는다는 점을 PR의 "알려진 한계"에 적는다.
