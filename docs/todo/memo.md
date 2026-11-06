# 메모장 서버 연동과 확장

> 2026-11-05 기록. 메모장 FE(플로팅 패널·모바일 하단 패널)는 구현됐고 **서버에 저장되지 않는다**(새로고침하면 사라짐).
> 합의된 설계는 [`docs/handoff/write-editor-update.md`](../handoff/write-editor-update.md)의 "합의된 설계". 서버 연동은 사용자가 따로 시키기 전에는 시작하지 않는다.

## 서버 연동 (순서: FE(MSW 목) → BE(사람이 테스트 작성) → 통합(로컬 개발 DB에서만))
- [x] API 계약 확정 (2026-11-06, 작업하면서 바뀔 수 있음): `GET /memos?targetType&targetId`, `POST /memos`(201), `PATCH /memos/:id`, `Memo = { id, targetType, targetId, content, createdAt, updatedAt }`. 오류: 400 검증, 401, POST 403(남의 대상·`Post.userId` null)·404(대상 없음), PATCH 404(없거나 남의 메모). `content` 최대 10,000자·빈 문자열 허용, DELETE 없음, `Memo.userId` FK Cascade(회원 삭제), draft 글에도 생성 가능
- [x] FE(MSW 테스트, 미커밋): `entities/memo`의 `MemoSaver`(디바운스·직렬화·실패 재시도)와 `useMemoDraft`, `MemoPad`에 연결. 처음 입력할 때 POST(빈 행 방지), 이후 1.5초 디바운스 PATCH, POST 완료 전 PATCH 금지, 닫을 때·화면 이탈 때 즉시 저장, 불러오기 실패·로딩 중에는 입력 잠금. 1차는 `list[0]`만 표시
- [ ] FE 화면 후속(의논 필요): 저장 상태 표시("저장 중/저장됨/저장 실패" — `useMemoDraft`가 `status`를 이미 돌려준다), 불러오기 실패 안내, 독서 기록 화면 마운트
- [ ] BE 테스트 목록(Claude는 목록·골격만, 사람이 작성): 대상이 본인 글/독서 기록인지 검증, `Post.userId`가 null이면 거부, 본인 메모만 조회, 공개 글 응답에 섞이지 않는 별도 컨트롤러, **글·독서 기록·회원 삭제 시 메모 삭제를 같은 트랜잭션에서 처리**(폴리모픽 참조라 FK가 없다)
- [ ] 배포: BE 먼저, FE 나중. 로컬 BE 기본 DB가 운영이라 개발 DB 검증 전에는 `prisma migrate`를 돌리지 않는다
- [x] 저장 로직을 `model/useMemoDraft`·`model/memoSaver`로 분리 (`write-editor-refactor-followups.md`의 MemoPad 항목 해소)

## 1차 범위 밖 (나중에 정함)
- [ ] 메모 여러 장 (헤더 탭) — 대상당 unique 제약을 두지 않은 이유
- [ ] 독서 기록 화면(`/reading/write`)에 메모 마운트
- [ ] 댓글
- [ ] 참고/참조 페이지
