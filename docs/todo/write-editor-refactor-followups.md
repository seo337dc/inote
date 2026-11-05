# 에디터 업데이트 후속 정리 (refactor-advisor 점검에서 미룬 것)

> 2026-11-05, 에디터 업데이트 커밋 전 `refactor-advisor` 점검 결과 중 이번에 하지 않은 것과, 작업 중 남긴 소소한 후속.
> 이번에 한 것: 툴바 항목 정의 분리(`toolbar-items.ts`), 버튼 스타일 공유(`toolbar-button-style.ts`), `ChatDock`의 `DockButton`, `WriteSidePanel`의 `{...props}`.

## P1
- [ ] `shared/lib/slot-actions.ts`: 모듈 레벨 가변 상태라 테스트 간 상태가 샐 수 있다. (A) 테스트용 reset 함수 추가, 또는 (B) `app` 레이어 Context Provider로 이동(구조 변경이라 사람이 정한다). 당장은 현재 유지 — 사용처 5곳
- [ ] `entities/memo/ui/MemoPad.tsx`: 상태·데스크톱/모바일 분기·슬롯 등록·버튼 위치 측정이 섞여 있다. 서버 저장을 붙일 때 저장 로직을 `model/useMemoDraft`로 분리 (`docs/todo/memo.md`)

## P2
- [ ] JS 미디어쿼리 문자열이 Tailwind 분기점과 따로 적혀 있다(`MemoPad.tsx`의 `(min-width: 1024px)`, `PostEditor.tsx`의 `(max-width: 639px)`). 세 번째가 생기면 `shared/lib`에 모은다
- [ ] `FloatingPanel`과 `MemoBottomSheet`의 헤더·닫기 버튼 마크업이 비슷하다(반복 2번, 지금은 합치지 않음)

## 소소한 후속
- [ ] 오른쪽 헤더 버튼(알림 벨·☰)에 테두리가 남아 있어 왼쪽 ghost 아이콘 버튼과 모양이 다르다 — 맞출지 사용자가 정한다 (알림 벨은 `DraftNotificationBell`)
- [ ] 공용 시트(`shared/ui/sheet.tsx`)의 닫기 버튼 스크린리더 이름이 영어 "Close"
- [ ] 툴바 접힘을 뷰포트가 아닌 영역 폭으로 판단하는 안 — `docs/todo/editor-tablet-check.md`의 "보류한 결정"
- [ ] `ToolbarMoreMenu` 팝오버의 키보드 이동·포커스 관리는 점검하지 않았다 (code-reviewer 영역)
