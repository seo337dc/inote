# 에디터 업데이트 후속 정리 (refactor-advisor 점검에서 미룬 것)

> 2026-11-05, 에디터 업데이트 커밋 전 `refactor-advisor` 점검 결과 중 이번에 하지 않은 것과, 작업 중 남긴 소소한 후속.
> 이번에 한 것: 툴바 항목 정의 분리(`toolbar-items.ts`), 버튼 스타일 공유(`toolbar-button-style.ts`), `ChatDock`의 `DockButton`, `WriteSidePanel`의 `{...props}`.

## P1
- [ ] `shared/lib/slot-actions.ts`: 모듈 레벨 가변 상태라 테스트 간 상태가 샐 수 있다. (A) 테스트용 reset 함수 추가, 또는 (B) `app` 레이어 Context Provider로 이동(구조 변경이라 사람이 정한다). 당장은 현재 유지 — 사용처 5곳
- [x] `entities/memo/ui/MemoPad.tsx`: 저장 로직을 `model/useMemoDraft`·`memoSaver`로 분리함 (2026-11-06, `docs/todo/memo.md`)

## P2
- [ ] JS 미디어쿼리 문자열이 Tailwind 분기점과 따로 적혀 있다(`MemoPad.tsx`의 `(min-width: 1024px)`, `PostEditor.tsx`의 `(max-width: 639px)`). 세 번째가 생기면 `shared/lib`에 모은다
- [ ] `FloatingPanel`과 `MemoBottomSheet`의 헤더·닫기 버튼 마크업이 비슷하다(반복 2번, 지금은 합치지 않음)

## 소소한 후속
- [ ] 오른쪽 헤더 버튼(알림 벨·☰)에 테두리가 남아 있어 왼쪽 ghost 아이콘 버튼과 모양이 다르다 — 맞출지 사용자가 정한다 (알림 벨은 `DraftNotificationBell`)
- [ ] 공용 시트(`shared/ui/sheet.tsx`)의 닫기 버튼 스크린리더 이름이 영어 "Close"
- [ ] 툴바 접힘을 뷰포트가 아닌 영역 폭으로 판단하는 안 — `docs/todo/editor-tablet-check.md`의 "보류한 결정"
- [ ] `ToolbarMoreMenu` 팝오버의 키보드 이동·포커스 관리는 점검하지 않았다 (code-reviewer 영역)

## 메모 저장(FE) 점검에서 미룬 것 (2026-11-06)
- [ ] `useMemoDraft`가 돌려주는 `status`·`loadFailed`와 `MemoSaveStatus` 공개 export는 아직 UI가 쓰지 않는다(테스트만 사용). 저장 상태 표시·불러오기 실패 안내를 만들지 정하고, 안 만들면 걷어낸다 (`docs/todo/memo.md`)
- [ ] 훅 테스트마다 `QueryClientProvider` wrapper를 손으로 만든다(`entities/post`·`entities/category`·`entities/memo`의 훅 테스트 6곳 이상). `test/render.tsx`에 훅용 헬퍼를 추가해 정리
- [ ] `MEMO_AUTOSAVE_MS`가 `model/memoSaver.ts`에 있고 공개 export인데 쓰는 곳은 테스트뿐이다. `constants.ts`로 옮기고 export를 뺄지 정한다
- [ ] 다른 곳에서 메모 캐시를 건드릴 일이 생기면 `memosKey(target)` 말고 prefix 상수(`["memos"]`)를 추가 (entities/post의 `MY_POSTS_KEY` 방식)
- [ ] `useMemoDraft`는 `target`이 마운트 동안 바뀌지 않는다고 가정한다(effect 의존성에서 뺌, eslint-disable). 독서 기록 메모를 붙일 때 같은 컴포넌트가 target만 바꿔 재사용되면 `target.type/id`를 의존성에 넣는 방식으로 다시 검토
