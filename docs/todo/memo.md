# 메모장 서버 연동과 확장

> 2026-11-05 기록. 메모장 FE(플로팅 패널·모바일 하단 패널)는 구현됐고 **서버에 저장되지 않는다**(새로고침하면 사라짐).
> 합의된 설계는 [`docs/handoff/write-editor-update.md`](../handoff/write-editor-update.md)의 "합의된 설계". 서버 연동은 사용자가 따로 시키기 전에는 시작하지 않는다.

## 서버 연동 (순서: FE(MSW 목) → BE(사람이 테스트 작성) → 통합(로컬 개발 DB에서만))
- [ ] API 계약 확정 (작업하면서 바뀔 수 있다고 승인됨): `GET /memos?targetType&targetId`, `POST /memos`, `PATCH /memos/:id`, `Memo = { id, targetType, targetId, content, createdAt, updatedAt }`
- [ ] FE: 처음 입력할 때 POST(빈 행 방지), 이후 1.5초 디바운스 PATCH, POST 완료 전 PATCH가 나가지 않게 직렬화. 1차는 `list[0]`만 표시
- [ ] BE 테스트 목록(Claude는 목록·골격만, 사람이 작성): 대상이 본인 글/독서 기록인지 검증, `Post.userId`가 null이면 거부, 본인 메모만 조회, 공개 글 응답에 섞이지 않는 별도 컨트롤러, **글·독서 기록·회원 삭제 시 메모 삭제를 같은 트랜잭션에서 처리**(폴리모픽 참조라 FK가 없다)
- [ ] 배포: BE 먼저, FE 나중. 로컬 BE 기본 DB가 운영이라 개발 DB 검증 전에는 `prisma migrate`를 돌리지 않는다
- [ ] 저장 로직을 붙일 때 `entities/memo`의 `MemoPad`에서 상태·저장을 `model/useMemoDraft` 등으로 분리 (UI 껍데기와 데이터가 섞이지 않게 — `write-editor-refactor-followups.md`)

## 1차 범위 밖 (나중에 정함)
- [ ] 메모 여러 장 (헤더 탭) — 대상당 unique 제약을 두지 않은 이유
- [ ] 독서 기록 화면(`/reading/write`)에 메모 마운트
- [ ] 댓글
- [ ] 참고/참조 페이지
