# 할 일 — 어드민 임베딩 관리 화면 (inote)

> 2026-11-04 1단계 FE(목록 화면)를 끝내면서 정리. 어드민에서 임베딩 상태를 보고, 버튼으로 실행하고, 진행 상황을 실시간으로 보는 기능을 **단계별로 하나씩** 만든다.
> 순서는 이 프로젝트의 규칙대로 **계약 합의 → FE(MSW) → BE(사용자가 테스트 작성) → 통합 확인(개발 DB, 로컬)**.
> 임베딩 서버(KURE)는 지금 ngrok 터널로 로컬에 연결돼 있고, 호스팅은 미정이다(`docs/todo/kure-hosting.md`).

## 단계
- [x] **1단계 FE**: 목록·상태 배지 8종·요약 카드·상태 탭·페이지네이션 (MSW 테스트까지)
- [ ] **1단계 API**: `inote-ai`의 `POST /embeddings/status`·`GET /embeddings/health`(읽기 전용, 운영 SQL 불필요), `inote-server`의 `GET /admin/embeddings`
  - 계약은 FE 코드의 타입(`views/admin/model/useAdminEmbeddings.ts`)이 기준이다: `page`·`pageSize`·`status`, 응답에 `summary`(`counts`는 상태를 모르면 `null`)·`embedder.reachable`·`aiAvailable`
- [ ] **1단계 통합 확인**: 로컬 BE(개발 DB, `scripts/dev-db.sh`)와 FE를 함께 띄워 화면 확인 — ⚠️ 로컬 BE의 기본 `DATABASE_URL`은 운영 DB라서 개발 DB로만 띄운다
- [ ] **2단계**: 버튼으로 임베딩 실행(글별 + 미완료 전체), 실패 재시도, 실행(run) 상태 조회(`GET /admin/embeddings/runs/:id`, 우선 폴링)
- [ ] **3단계**: SSE로 진행률(10%, 20%…)·상태 실시간 표시 + 완료 알림 팝업. 2단계의 run 상태와 **같은 데이터**를 `EventSource`로 흘린다(작업 시작은 POST, 진행 구독은 GET으로 분리, 연결 직후 스냅샷 먼저)

## 이번에 일부러 뺀 것
- [ ] 요약 카드를 누르면 해당 상태 탭으로 이동
- [ ] 제목 검색(지금은 글이 수십 편이라 3페이지면 충분)
- [ ] 행 클릭 상세 모달(실패 원인 전문·조각 목록 등) — 회원 목록에는 있음

## 알아둘 점·한계
- **"재임베딩 필요"는 추정이다.** 해시 비교가 아니라 "임베딩 시각 < 글을 마지막으로 고친 시각(`lastEditedAt`)"을 비교한다.
- **배포 순서: BE 먼저.** FE만 먼저 배포하면 관리자 메뉴의 "임베딩" 화면이 오류 문구를 보여준다(관리자만 보는 화면).
- `inote-ai`가 응답하지 않으면 목록은 보이고 대상 글의 상태만 "확인 불가"로 나온다(요약 카드는 `-`).
