# 글쓰기: 입력 없이 나가는 임시 저장 PATCH

> 2026-11-05 발견, 보류. 이번 에디터 업데이트(`feat/write-memo-panel`)와 무관한 기존 동작.

## 증상
- `/write`로 새 글을 열면 `POST /blog/posts/draft` 직후, 아무것도 입력하지 않았는데 약 1.5초 뒤 `PATCH /blog/posts/:id`가 한 번 더 나가고 "임시 저장됨" 표시가 뜬다.

## 원인 (코드 추정 — 네트워크 탭으로 확인하지 못함)
- `features/write-post/ui/WritePostForm.tsx`의 `skipNextAutosave`는 effect를 **한 번만** 건너뛴다. draft 로드 커밋에서 자동저장 effect가 그 플래그를 먼저 소비하고, 이어서 `setTitle/setCategoryId/setContent`가 반영돼 재실행되면 값이 실제로 바뀐 경우 타이머가 걸린다.
- 값이 바뀌는 후보: ① 새 글의 `categoryId`가 `""` → 첫 카테고리 id(기본 카테고리 지정), ② 에디터가 빈 내용을 `<p></p>` 등으로 정규화해 `onChange`가 나감. 어느 쪽인지는 미확정.

## 영향
- 데이터 손상은 없고 호출 1회 낭비 + 입력 없이 "임시 저장됨"이 표시됨. `isDirty`는 사용자 입력에서만 켜지므로 이탈 확인창은 영향 없음.

## 할 일
- [ ] 원인 확정: PATCH body의 `categoryId`·`content` 확인
- [ ] 먼저 실패하는 테스트로 재현 (MSW로 PATCH 호출 여부 검증)
- [ ] 수정안: 플래그 대신 "마지막으로 저장/불러온 body"를 저장해 두고, `buildBody()`가 같으면 PATCH 생략
