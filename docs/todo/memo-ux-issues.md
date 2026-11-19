# 메모 UX 수정 (Esc 닫기, 발행 창에서 메모 버튼 숨김)

> 시작 2026-11-19. 세션이 바뀌어도 이어 갈 수 있게 하는 작업 지시서다. 끝나면 삭제한다(`/wrap`). 메모 기능 전체의 설계·계약은 [`memo.md`](./memo.md).

## 목표
1. **Esc로 메모장 닫기** — 메모장이 열려 있으면 Esc가 다른 것보다 메모장을 먼저 닫는다(데스크톱 `FloatingPanel`·좁은 화면 `MemoBottomSheet` 모두).
2. **발행 창이 열려 있는 동안 메모장 버튼 숨김** — 글쓰기 화면에서 "저장"을 눌러 `PublishScreen`(전체 화면 발행 창)이 열려 있을 때 메모 버튼이 보이지 않게 한다. (사용자 확인: 이 경우가 맞다. 발행 후 글 상세로 이동했을 때 보이는 것은 3차 계약대로 두는 것)
3. 보류 기록 — 글 리스트 화면·선택 기능·보관함 이동 UX는 백로그 4절에 기록(이번에 구현하지 않음).

## 결정 (2026-11-19)
- Esc 우선순위: 메모장이 열려 있으면 메모장이 먼저 닫힌다.
- 조사해 둔 충돌 지점(구현 때 확인): 탭 이름 입력의 Esc(`entities/memo/ui/MemoTabs.tsx:137`), 넘친 탭 목록의 Esc(`MemoTabs.tsx:71`), 한글 조합 중(IME) Esc. 닫기는 `MemoPad.tsx`의 `close`(저장을 기다린 뒤 닫음)를 쓴다.
- 발행 창 쪽: `features/write-post/ui/PublishScreen.tsx`(`fixed inset-0 z-50`)와 `WritePostForm.tsx`의 `MemoPad` 자리(상단 바), 좁은 화면의 도크 `+` 메뉴 등록(`useRegisterSlotAction`)이 어디서 겹쳐 보이는지 확인해야 한다 — **어느 버튼이 보이는지는 아직 코드로 확정하지 못했다.**
- 규칙: 버튼 hover 스타일, FSD 레이어(`widgets`→`features` import 불가), 작은 수정이라 유닛/컴포넌트 테스트만.

## 영향받는 레포·브랜치
| 레포 | 브랜치 | PR |
|---|---|---|
| inote | `fix/memo-ux-issues` | 없음 |

## 한 일
- 브랜치 생성(`origin/main` 8205b60 기준)
- 코드 조사: Esc 처리 없음 확인, 충돌 지점 파악
- 3번 보류 항목을 `backlog.md` 4절에 기록
- (1) Esc 닫기 구현: `MemoPad`가 열려 있는 동안 `document` 캡처 단계에서 Esc를 받아 `close()`하고 전파를 막는다(에디터 팝업 같은 뒤쪽 요소보다 먼저). 한글 조합 중(`isComposing`)과 `data-memo-esc-owner` 요소(탭 이름 입력창·넘친 탭 목록 래퍼, `MemoTabs`) 안의 Esc는 건너뛴다. 표시는 `model/constants.ts`의 `MEMO_ESC_OWNER_PROPS`·`MEMO_ESC_OWNER_SELECTOR`
  - **맨 앞 레이어부터 하나씩 닫는다**(2026-11-19 브라우저 확인 뒤 변경): 시트·대화상자·출간 설정 화면 같은 모달이 열려 있으면 메모장은 Esc를 받지 않는다(`shared/lib/modal-layer.ts`의 `hasOpenModalLayer` — `data-slot="sheet-content"`·`"dialog-content"`(닫히는 중 제외)와 `aria-modal="true"`이면서 `aria-hidden`이 아닌 요소). 그래서 좁은 화면에서 왼쪽 "글 설정" 시트(`WriteSettingsSheet`)나 발행 창이 메모장을 덮고 있으면 첫 Esc는 그것을, 다음 Esc가 메모장을 닫는다. (처음에는 이를 발행 창 얘기로 잘못 이해해 `hidden` 속성으로 풀었다가 걷어냈다)
- (2) 발행 창 중 버튼 숨김 구현: `MemoPad`에 `hidden` 속성(데스크톱 버튼·모바일 도크 등록 모두 숨김, 열린 패널·내용은 그대로), `WritePostForm`이 `hidden={publishOpen}`을 넘긴다. 쌓임 순서(z-index)에 의존하지 않는다
- 테스트: `MemoPad.test`(Esc 9개 + 모달 앞 Esc 1개, hidden 3개), `MemoTabs.test`(표시 2개), 신규 `modal-layer.test`(6개), 신규 `WritePostForm.test`(메모 버튼 숨김 3개 + Esc 순서 2개: 발행 창, 좁은 화면 왼쪽 글 설정 시트 — 감지 함수를 무력화하면 3개가 실패하는 것을 확인). `pnpm test` 131개 파일·1112개, `lint`, `build` 통과(에디터 테스트 1~2개가 전체 실행 때 5초 타임아웃으로 간헐 실패했으나 단독·재실행에서는 통과)

## 다음 할 일
- [ ] **브라우저에서 직접 확인**(자동 테스트로 확인 못 하는 것): ① 메모장을 열고 Esc → 닫힘(글쓰기 화면의 에디터에 커서가 있을 때도) ② 한글 입력 중 Esc가 메모장을 닫지 않는지 ③ 탭 이름 편집 중 Esc → 편집만 끝나는지, 넘친 탭 목록이 열린 채 Esc → 목록만 닫히는지 ④ **좁은 화면(태블릿·모바일)에서 메모장을 연 뒤 왼쪽 "글 설정" 시트를 열고 Esc → 시트가 먼저, 다음 Esc에 메모장이 닫히는지(시트와 메모장 중 무엇이 앞에 보이는지도)** ⑤ 글쓰기에서 "저장" → 발행 창이 내려오는 동안·열려 있는 동안 메모 버튼(데스크톱 상단 바, 좁은 화면 도크 +)이 안 보이는지 ⑥ 발행 창 "취소" 뒤 다시 보이는지
- [ ] 커밋 전 `code-reviewer`·`refactor-advisor` 점검 → `/commit`

## 막힌 것·결정 대기
- 발행 창·시트가 열릴 때 메모 **패널이 이미 열려 있으면** 그대로 열려 있다(발행 창에서는 버튼만 숨김 — 요청 범위). 닫을지는 사용자가 정한다.
- 시트·대화상자 감지는 `data-slot` 이름(shadcn 관례)과 `aria-modal`에 기대는 방식이다. 새 모달 컴포넌트를 만들 때는 `shared/lib/modal-layer.ts`의 선택자에 걸리는지 확인한다.

## 포트폴리오 메모
- 해당 없음(작은 UX 수정)
