# 글쓰기 에디터 업데이트 — 인수인계 (2026-11-05 작성, 2026-11-06 병합 반영)

> 새 세션은 `git pull` → `docs/handoff/HANDOFF.md` → `CLAUDE.md` → 이 파일 순서로 읽는다.
> 규칙(화면은 먼저 의논, 커밋·push는 요청 시에만, 하나씩 진행)은 `CLAUDE.md`가 우선이다.

## 현재 상태 (2026-11-06)
- **끝났다(모두 main에 병합):** 에디터·메모 UI(FE #29), 메모 서버 자동저장(FE #30), 메모 API(`inote-server` #12), 테스트 중복 설정 정리(FE #31). 메모 저장은 로컬에서 FE↔BE로 동작을 확인했다. **운영 반영 후 로그인한 운영 화면에서 확인했는지는 확인 필요.**
- **남은 일은 `docs/todo/`가 기준이다:** [`memo.md`](../todo/memo.md)(저장 상태 표시 등 화면 후속), [`write-editor-refactor-followups.md`](../todo/write-editor-refactor-followups.md), [`editor-tablet-check.md`](../todo/editor-tablet-check.md)(사람이 폭별로 직접 확인), [`write-autosave-redundant-patch.md`](../todo/write-autosave-redundant-patch.md)(보류 중인 버그).
- 폭별 배치(특히 1024~1279px)·드래그·터치는 jsdom으로 검증되지 않아 사람이 화면에서 확인해야 한다 — 결과는 확인 필요.
- 로컬 BE의 기본 DB는 운영이므로 BE는 `scripts/dev-db.sh start`(개발 DB)로만 띄운다.
- 작업과 무관한 파일(`docs/learning/README.md`, `docs/learning/SSE.md`, `docs/blog/better-auth-duplicate-account.md`)은 계속 커밋에서 제외한다.

## 끝난 것 (메모장 FE)
- 플로팅 패널: `shared/ui/floating-panel.tsx`(react-rnd 동적 import, 드래그·리사이즈, body 포털), 위치 계산 `shared/lib/floating-rect.ts`
- 메모 UI: `entities/memo` — `MemoPad`(버튼 + 패널), `MemoBottomSheet`(좁은 화면 하단 패널, 아래→위 300ms 애니메이션). 최대 10,000자 일반 텍스트. 서버 저장은 `model/memoSaver`(자동저장 엔진)·`model/useMemoDraft`(훅)가 맡는다.
- 색: `globals.css`의 `--memo*` 변수 (Apple 메모식 노란 종이 톤, 다크 값 포함 — inote에 다크 모드는 아직 없음)
- 데스크톱(lg 이상, AI 패널 기준): 글쓰기 하단 바 오른쪽 끝의 `메모` 버튼 → 버튼 위에 플로팅 패널. 열려 있는 동안 버튼은 숨김.
- 좁은 화면(lg 미만): 오른쪽 아래 도크가 ⋮(`EllipsisVertical`) 버튼이 되고, 누르면 ⋮는 사라지고 AI·메모(`NotebookText`) 아이콘 버튼이 쌓인다. 바깥 클릭·Esc로 접힘. 메모 → 하단 패널.
- 슬롯 연결 방식: `shared/lib/slot-actions.ts` 레지스트리(화면이 버튼을 `dock`·`header-left` 슬롯에 등록하고, `widgets/chat-dock/ui/ChatDock.tsx`·`widgets/nav/ui/NavMobile.tsx`가 그림). 위젯이 feature를 import할 수 없어서 쓴 방식이다. (원래 이름은 `dock-actions.ts`였고 2026-11-05에 슬롯 개념으로 일반화하며 이름을 바꿨다.)
- 번들: `react-rnd` 단독 약 13.2KB gzip(전체 클라이언트 JS 약 605KB gzip의 2%), 동적 import라 첫 로딩에는 영향 없음.
- 검증: 관련 테스트·lint·tsc 통과. **전체 `pnpm test`와 `pnpm build`는 마지막으로 돌리지 않았다** (커밋 전에 `/commit`이 돌린다). 드래그·리사이즈·애니메이션·키보드는 사람이 화면에서 확인해야 한다.

## 합의된 설계 (서버 연동 — 2026-11-06 구현·병합됨, 아래는 구현 결과)
- 순서(CLAUDE.md): API 계약 → FE(MSW 목) → BE → 통합(로컬 개발 DB에서만). 이번에는 사용자가 BE도 같이 구현하고 테스트를 함께 읽자고 해서 Claude가 BE 구현과 `MemosService` 테스트를 작성했다.
- API 계약 (구현된 것):
  - `GET /memos?targetType=post&targetId=:id` → `Memo[]` (생성순, 본인 것만)
  - `POST /memos` `{ targetType, targetId, content }` → `Memo` (대상이 본인 글/독서 기록인지 서버 검증, Post.userId가 null이면 거부)
  - `PATCH /memos/:id` `{ content }` → `Memo` (없는 메모와 남의 메모는 같은 404). DELETE는 없다 — 내용을 지우려면 빈 문자열로 PATCH
  - `Memo = { id, targetType: 'post'|'reading', targetId, content, createdAt, updatedAt }`
- 모델: `targetType` + `targetId` 참조 id 방식(폴리모픽, 대상은 FK 없음), 대상당 unique 제약 없음(탭 확장 대비), 1차는 FE가 `list[0]`만 표시. **`Memo.userId`는 `user`에 FK(`onDelete: Cascade`)라 회원 삭제는 DB가 처리하고**, 글·독서 기록 삭제 때만 서비스가 같은 `$transaction`에서 메모를 지운다(`blog.service.ts`·`reading-logs.service.ts`의 `remove`). draft 글에도 메모를 만들 수 있다.
- 동작: 처음 입력할 때 POST(빈 행 방지), 이후 1.5초 디바운스 PATCH(자동저장 최적화도 고려). POST 완료 전 PATCH가 나가지 않게 직렬화. 메모는 작성자만 보고, 공개 글 응답에 섞이지 않는 별도 컨트롤러.
- 배포: BE 먼저, FE 나중(이 순서로 병합됨). 마이그레이션은 테이블 추가뿐이고 Render 배포 때 `prisma migrate deploy`로 적용된다. 로컬에서는 개발 DB에서만 마이그레이션을 돌렸다.
- 1차 범위 밖: 메모 여러 장(헤더 탭), 독서 기록 화면 마운트, 댓글, 참고/참조 페이지 — [`docs/todo/memo.md`](../todo/memo.md)에 기록했다. 이 구현의 BE 쪽 세부는 `inote-server`의 `src/memos/`와 CLAUDE.md가 기준이다.

## 에디터 작업 1~3번 — 구현 완료 (2026-11-05 구현, 병합됨 — 사람의 폭별 화면 확인은 확인 필요)
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
- 리팩토링 점검에서 미룬 것·소소한 후속 → [`docs/todo/write-editor-refactor-followups.md`](../todo/write-editor-refactor-followups.md)
- 입력 없이 임시 저장 PATCH가 나가는 문제 → [`docs/todo/write-autosave-redundant-patch.md`](../todo/write-autosave-redundant-patch.md)

## 에이전트·스킬
- FE `.claude/agents/refactor-advisor.md`: 읽기 전용, 모듈화·리팩토링 후보를 P0/P1/P2로 보고한다. 2026-11-06부터 "테스트 설정 중복"(테스트 파일마다 복붙된 설정·헬퍼) 관점이 추가됐다. FE `/commit` 스킬(`.claude/skills/commit/SKILL.md`)이 2단계로 부른다(체크리스트 앞, 커밋을 막지 않고 보고만 한다).
- BE(`inote-server`)용 `refactor-advisor`와 `/commit` 스킬은 별도로 만들었다(NestJS·Prisma 기준, E2E는 운영 DB 보호를 위해 기본 제외). `inote-server` PR #13(`chore/add-refactor-advisor-and-commit-skill`)이 병합돼야 BE main에 들어간다 — 병합 여부는 확인 필요.
- 에이전트·스킬은 세션 시작 때 읽으므로 새로 만들거나 고친 뒤에는 새 세션에서 반영된다.
- 사용자가 요청했지만 만들지 않은 것: FE·BE·AI 최적화 점검 에이전트. 합치지 않고 관점별로 나누는 쪽을 추천했고, 범위는 아직 정하지 않았다.

## 커밋·PR (참고)
- `/commit` 스킬을 쓴다. 기능 단위로 쪼개고, 파일 단위로 나눌 수 없게 섞인 변경(예: 한 파일에 두 기능이 같이 들어간 경우)은 의존 순서대로 묶는다.
- FE와 BE가 짝인 작업은 **BE를 먼저 병합·배포**하고 FE를 나중에 병합한다.
