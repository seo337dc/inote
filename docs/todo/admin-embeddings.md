# 할 일 — 어드민 임베딩 관리 화면 (inote)

> 2026-11-04 1단계 FE(목록 화면)를 끝내면서 정리. 어드민에서 임베딩 상태를 보고, 버튼으로 실행하고, 진행 상황을 실시간으로 보는 기능을 **단계별로 하나씩** 만든다.
> 순서는 이 프로젝트의 규칙대로 **계약 합의 → FE(MSW) → BE(사용자가 테스트 작성) → 통합 확인(개발 DB, 로컬)**.
> 임베딩 서버(KURE)는 지금 ngrok 터널로 로컬에 연결돼 있고, 호스팅은 미정이다(`docs/todo/backlog.md` 3절).

## 단계
- [x] **1단계 FE**: 목록·상태 배지 8종·요약 카드·상태 탭·페이지네이션 (MSW 테스트까지) — 병합됨(`inote` PR #39, 2026-11-13)
- [x] **1단계 API — AI**: `inote-ai`의 `POST /embeddings/status`·`GET /embeddings/health`(읽기 전용, 운영 SQL 불필요) — 구현 완료, **PR `inote-ai` #6 열림(미병합, 2026-11-13 확인)**
- [x] **1단계 API — BE**: `inote-server`의 `GET /admin/embeddings` — 계약은 아래 "1단계 계약(확정)". 테스트는 사용자가 직접 작성(Claude는 목록·골격) — 병합됨(`inote-server` PR #17, 2026-11-12)
  - 응답 모양의 기준은 FE 코드의 타입(`views/admin/model/useAdminEmbeddings.ts`)이다.
- [ ] **1단계 통합 확인**: 로컬 BE(개발 DB, `scripts/dev-db.sh`)와 FE를 함께 띄워 화면 확인 — ⚠️ 로컬 BE의 기본 `DATABASE_URL`은 운영 DB라서 개발 DB로만 띄운다
- [ ] **2단계**: 버튼으로 임베딩 실행(글별 + 미완료 전체), 실패 재시도, 실행(run) 상태 조회(`GET /admin/embeddings/runs/:id`, 우선 폴링)
- [ ] **3단계**: SSE로 진행률(10%, 20%…)·상태 실시간 표시 + 완료 알림 팝업. 2단계의 run 상태와 **같은 데이터**를 `EventSource`로 흘린다(작업 시작은 POST, 진행 구독은 GET으로 분리, 연결 직후 스냅샷 먼저)

## 1단계 계약(확정, 2026-11-06)

**`GET /admin/embeddings`** (`inote-server`, `AuthGuard` + `AdminGuard`) — 쿼리: `page`(기본 1), `pageSize`(기본 20·최대 100), `status`(`all|incomplete|failed|done|excluded`, 기본 `all`). 응답은 FE 타입 `AdminEmbeddingsPage` 그대로이고, `chunkCount`·`embeddedAt`·`job`은 AI의 `POST /embeddings/status`, `embedder.reachable`은 AI의 `GET /embeddings/health` 값이다.

**범위·노출**
- **모든 사용자의 글**을 대상으로 한다(임베딩은 서비스 전체 상태).
- 목록에는 **제목만** 노출한다 — 본문·작성자 등 다른 내용은 응답에 넣지 않는다(비공개·보관 글의 제목도 관리자에게는 보인다).

**상태 판정(BE가 우선순위대로)**
1. `excluded`: 발행 안 됨(`publishedAt` null)·비공개·보관(`archivedAt`) 중 하나
2. `unknown`: AI 호출 실패(`aiAvailable: false`, `embedder.reachable: false`)
3. `processing` → `failed` → `pending`: `job.status`가 해당 값(이 순서로 우선). `job.status`가 `done`이면 job은 무시하고 아래로
4. `incomplete`: `chunkCount == 0`(job도 없음)
5. `outdated`: `embeddedAt < lastEditedAt` — **10초 허용 오차**를 둔다(저장 직후 임베딩이 늦게 끝나는 것을 오탐하지 않게). 추정이다
6. `done`: 그 외

**탭 필터**: `incomplete` 탭 = incomplete + outdated + pending + processing, 나머지는 같은 이름의 상태. AI가 응답하지 않으면(`unknown`) `all` 탭만 글이 보이고 다른 탭은 빈 목록이다.

**요약(`summary`)**: `eligible`(excluded가 아닌 글 수), `excluded`, `counts`(`done`·`incomplete`·`outdated`·`pending`·`processing`·`failed` — **전체 글 기준**, 페이지와 무관). AI가 응답하지 않으면 `counts: null`.

**동작**
- 정렬: `lastEditedAt` 내림차순(없으면 `createdAt`).
- 대상(excluded가 아닌) 글 **전체의 id를 AI에 한 번** 물어본 뒤 BE에서 상태 판정·필터·페이지 자르기·집계를 한다(상한 5000개, 글이 수천 편 이하라는 전제). excluded 글의 id는 AI에 넘기지 않는다.
- AI 호출 타임아웃 **5초**. 실패·타임아웃은 던지지 않고 `aiAvailable: false`로 응답한다. `EMBEDDINGS_ENABLED`와 무관하게 동작한다(관리자 전용 화면).
- AI 쪽 계약: `POST /embeddings/status` `{postIds}` → `{model, items:{postId:{chunkCount, embeddedAt, job:{status,attempts,lastError}|null}}}`, `GET /embeddings/health` → `{embedder:{reachable, model}}` (둘 다 `x-internal-secret`).

## 이번에 일부러 뺀 것
- [ ] 요약 카드를 누르면 해당 상태 탭으로 이동
- [ ] 제목 검색(지금은 글이 수십 편이라 3페이지면 충분)
- [ ] 행 클릭 상세 모달(실패 원인 전문·조각 목록 등) — 회원 목록에는 있음

## 알아둘 점·한계
- **"재임베딩 필요"는 추정이다.** 해시 비교가 아니라 "임베딩 시각 < 글을 마지막으로 고친 시각(`lastEditedAt`)"을 비교한다.
- **배포 순서: AI → BE → FE.** BE가 AI의 새 엔드포인트를 부르고, FE만 먼저 배포하면 관리자 메뉴의 "임베딩" 화면이 오류 문구를 보여준다(관리자만 보는 화면).
- `inote-ai`가 응답하지 않으면 목록은 보이고 대상 글의 상태만 "확인 불가"로 나온다(요약 카드는 `-`).
