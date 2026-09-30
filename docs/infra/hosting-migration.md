# 호스팅 정리 기록 — Render 무료 한도 초과 대응

> 공통(전체) 기록: 배경·원인·선택지·결정·진행 상황. 서비스별 상세는 각 레포 문서를 본다.
> - AI 서버(Vercel): `inote-ai` 레포 `docs/vercel-migration.md`
> - DB(Neon → Supabase): `inote-server` 레포 `docs/supabase-migration.md`, AI 쪽은 `inote-ai` 레포 `docs/supabase-migration.md`
> Notion 게시용 초안은 같은 폴더의 `notion-draft.md`.
> 작성 시작: 2026-09-30 / 상태: 🟡 진행 중 (AI 이전 완료, BE 재개 대기, DB 이전 예정)

---

## 1. 배경 — 무슨 일이 있었나

- 2026-09-29 밤~30일: cron-job.org에서 "Cronjob failed: Inote Server" → "Cronjob disabled automatically" 메일 2통(Inote Server, inote ai 서버 슬립 해제).
- 실패 응답: `503 Service Unavailable`, 본문 "Service Suspended", 헤더 `x-render-routing: suspend`.
- Render 대시보드: `inote-server`, `inote-ai` 모두 **Suspended by Render** — "Free usage limit reached. Your service is now suspended until the next billing period."
- 당시 구성: Render 무료 웹 서비스 2개(NestJS BE, FastAPI AI)를 cron-job.org로 10분마다 깨움(슬립 방지).

## 2. 원인 분석

| 확인한 사실 | 해석 |
|---|---|
| 503 + "Service Suspended" + `x-render-routing: suspend` | 슬립(spin down)이 아니라 **서비스 정지(suspended)**. 슬립이면 요청 후 수십 초 뒤 200으로 깨어남 |
| Render 무료 = 워크스페이스당 월 750 인스턴스 시간, 다 쓰면 다음 달 시작까지 무료 웹 서비스 정지 | 두 서비스를 10분마다 깨워 24시간 켜 둠 → 월 약 1,440시간 = 한도의 약 2배 |
| cron-job.org가 연속 실패 후 자동 비활성화 | 정지가 시작된 뒤 핑이 계속 실패해서 작업이 꺼짐 |

- 결론: **무료 플랜 종료가 아니라 "이번 달 무료 시간 소진"**. 서비스 2개를 상시로 깨워 두는 구조가 한도를 넘겼다.
- 영향: BE·AI 정지. FE(Vercel)·DB(Neon)는 정상. 운영에서는 BE가 필요한 기능(로그인, 글, 카테고리, 업로드 등) 전부 불가.
- 참고: Neon `inote-server` 프로젝트도 무료 컴퓨트 한도(월 100 CU-hrs, 사용 104.35)를 넘겨 일시정지 경고가 떠 있음 → DB 이전(Supabase)의 이유가 하나 더 생김.

## 3. 검토한 선택지

### BE(NestJS)

| 후보 | 조건(검색 시점 2026-09) | 판단 |
|---|---|---|
| **Render 무료 유지 (BE만)** | 월 750시간. AI가 나가서 서비스 1개만 켜면 월 744시간 | **채택**. 코드 변경 없음, 환경 변수 그대로 |
| Vercel (NestJS zero-config) | Hobby 무료, 함수 최대 300초. 마이그레이션·업로드 4.5MB 제한·Prisma 타깃 조정 필요 | 보류(추후 검토 가능) |
| Cloudflare Workers | 무료: 요청당 CPU 10ms, NestJS·Prisma가 워커 환경에 안 맞아 사실상 재작성 | 제외 |
| Supabase Edge Functions | Deno 런타임, 함수 256MB·요청당 CPU 2초 | 제외(재작성) |
| Koyeb | 2026-02 Mistral AI 인수 후 **신규 가입 무료 플랜 없음**(월 $29~) | 제외 — 가입 후에 확인됨 |
| Render 유료 | 서비스당 월 약 $7 | 대안(즉시 복구 필요 시) |

### AI(FastAPI)

| 후보 | 판단 |
|---|---|
| **Vercel Python 함수** | **채택**. FastAPI 공식 지원, SSE 스트리밍 OK, Hobby 최대 300초, 서버 상시 실행 불필요 |
| BE(NestJS)에 합치기 | 제외 (525줄 TypeScript 재작성) |

### Vercel Hobby 제한 (요약)

함수 최대 실행 시간 기본·최대 300초(Fluid compute), 월 Active CPU 4시간(I/O 대기 제외), 함수 호출 100만 건, 비상업 한도. 상세는 `inote-ai/docs/vercel-migration.md`.

## 4. 결정

| 대상 | 결정 |
|---|---|
| AI 서버 | Render → **Vercel** (완료) |
| BE | **Render 무료 유지** (AI가 나가 서비스 1개만 남아 월 한도 안). 월이 바뀌면 재개 |
| FE | Vercel 그대로 |
| DB | Neon → **Supabase** (프로젝트 2개: prod·dev, AI DB는 BE DB에 합침) — 예정 |
| 슬립 방지 | cron-job.org는 BE 헬스체크 1개만 사용 |

## 5. 진행 상황

| 항목 | 상태 |
|---|---|
| AI 서버 Vercel 배포 (`https://inote-ai-cyan.vercel.app`) | ✅ 완료 (요약·스트리밍·CORS·DB 조회/저장 확인) |
| AI 서버 DB 주소 오류 수정 (BE DB를 가리키던 것을 AI 전용 DB로) | ✅ 완료 |
| 에러 로그 정책 (`request_id`, `/health/db` 진단) | ✅ 완료 |
| Render의 AI 서비스 삭제, cron-job의 AI 작업 삭제 | ✅ 완료 |
| Neon BE DB 비밀번호 재설정(채팅 노출 대응), Render·로컬 `.env` 교체 | ✅ 완료 |
| Render 환경 변수 `DATABASE_URL`(새 비밀번호 pooled), `INOTE_AI_URL`(Vercel 주소) 교체 | ✅ 완료 |
| Render BE 재개 확인 (다음 달 시작 후 자동 재개 여부) | ⏳ 2026-10-01 확인 |
| 재개 후 `/api/v1/health` 200 확인, cron-job의 Inote Server 작업 켜기 | ⏳ |
| FE(Vercel) 환경 변수 `NEXT_PUBLIC_AI_API_URL`을 Vercel AI 주소로 교체 | ⏳ 확인 필요 |
| Neon 데이터 백업 | ⏳ 최우선(Supabase 이전 전) |
| Supabase 이전 | ⏳ 예정 |
| BE를 Vercel로 옮길지 결정 | ⏳ 보류 |

### 재개 후 체크리스트
- [ ] `https://inote-server-5a63.onrender.com/api/v1/health` = 200
- [ ] 글 목록 API, 로그인(Google OAuth), 글 작성·저장 확인
- [ ] AI 서버의 글 연결 채팅(BE 작성자 확인), 독서 채팅(카카오 책 검색) 확인 — Vercel `KAKAO_REST_API_KEY` 입력 여부 확인
- [ ] cron-job.org의 Inote Server 작업 활성화(BE 재개를 확인한 뒤)
- [ ] `CLAUDE.md`(inote, inote-money)와 각 레포 README의 배포 정보 최신화
- [ ] Notion 정리 (`notion-draft.md` 기준)

## 6. 환경 변수 (값은 적지 않는다)

| 서비스 | 변수 | 값 |
|---|---|---|
| FE (Vercel) | `NEXT_PUBLIC_API_URL` | Render BE 주소(변경 없음) |
| FE (Vercel) | `NEXT_PUBLIC_AI_API_URL` | Vercel AI 주소로 교체 필요 |
| BE (Render) | `INOTE_AI_URL` | Vercel AI 주소 |
| BE (Render) | `DATABASE_URL` | Neon 새 비밀번호 pooled 주소 (Supabase 이전 후 교체) |
| AI (Vercel) | `INOTE_SERVER_URL` | Render BE 주소 + `/api/v1` |

AI 서버 변수 전체 표는 `inote-ai/docs/vercel-migration.md`.

## 7. 진행 로그

| 날짜 | 한 일 | 결과·메모 |
|---|---|---|
| 2026-09-30 | 원인 분석, 선택지 조사, 결정, 문서 작성 | 서비스 2개 상시 가동 = 한도 2배 |
| 2026-09-30 | AI 서버 Vercel 배포·검증, DB 주소 오류 수정, 에러 로그 정책 | 완료 |
| 2026-09-30 | Koyeb 시도 → 인수 후 신규 무료 플랜 폐지 확인 | 채택 취소, Render 유지로 변경 |
| 2026-09-30 | Neon 비밀번호 재설정, Render 환경 변수·cron 정리, Render AI 서비스 삭제 | BE 재개 대기 |

## 8. 트러블슈팅

서비스별 트러블슈팅은 각 레포 문서에 기록한다. 공통 교훈은 아래 회고 메모.

## 9. 회고 메모 (Notion 회고용)

- 무료 티어는 "슬립"과 "정지"가 다르고, 서비스를 상시로 깨워 두면 한 달 한도를 서비스 개수만큼 빨리 쓴다.
- 슬립 방지 핑은 서비스가 1개일 때만 무료 한도 안에 든다(월 744시간).
- 이전 대안은 무료 조건보다 **코드를 얼마나 고쳐야 하는지**가 더 큰 비용이었다(NestJS를 워커로 옮기려면 재작성).
- **무료 조건은 검색 요약이 아니라 가입 화면·공식 요금 페이지로 먼저 확인한다.** Koyeb는 인수로 신규 무료 플랜이 없어졌는데 요약 글만 보고 진행할 뻔했다.
- 환경 변수를 옮길 때는 값이 아니라 **호스트까지 비교**한다(AI가 BE의 DB를 가리켜 500이 났다).
- 비밀번호를 채팅·문서에 붙이지 않는다(노출되면 즉시 재설정).

## 10. 참고 자료

- Render 무료 플랜: https://render.com/docs/free
- Vercel Functions 제한: https://vercel.com/docs/functions/limitations
- Vercel Hobby 플랜: https://vercel.com/docs/plans/hobby
- Vercel NestJS: https://vercel.com/docs/frameworks/backend/nestjs
- Vercel Python 런타임: https://vercel.com/docs/functions/runtimes/python
- Supabase Edge Functions 제한: https://supabase.com/docs/guides/functions/limits
