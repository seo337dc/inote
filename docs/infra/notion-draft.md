# Render 무료 서비스가 갑자기 죽었다 — 원인부터 호스팅 정리까지

> Notion 게시용 초안. 작업용 상세 기록은 `hosting-migration.md`(진행 상황·체크리스트·환경 변수·로그).
> 기존 Notion 블로그 내용과 겹치는 부분은 사용자가 확인 후 합치기. 아직 Notion에는 올리지 않음.
> 상태: 1편(원인·결정) 완료, 2편(AI→Vercel) 완료, 3편(DB→Supabase)은 이전하면서 채운다.

---

## 1편. 원인과 결정

### 한 줄 요약
"슬립 방지 핑"이 오히려 무료 한도를 2배로 써서 서비스가 **정지(Suspended)** 됐고, AI 서버는 Vercel로 옮기고 BE는 서비스가 1개로 줄어든 Render에 남기기로 했다.

### 증상
- cron-job.org에서 실패 메일 → 두 작업 자동 비활성화 메일.
- 실패 응답: `503`, 본문 "Service Suspended", 헤더 `x-render-routing: suspend`.
- Render 대시보드: 두 서비스 모두 `Suspended by Render` + "Free usage limit reached. Your service is now suspended until the next billing period."

### 원인
- "슬립(spin down)"과 "정지(suspended)"는 다르다. 슬립은 요청이 오면 30~50초 뒤 깨어나지만, 정지는 깨어나지 않고 계속 503.
- Render 무료 웹 서비스는 워크스페이스당 월 **750 인스턴스 시간**이 한도이고, 다 쓰면 다음 달 시작까지 정지된다.
- 슬립을 막으려고 10분마다 핑을 보내 두 서비스를 24시간 켜 둠 → 월 약 1,440시간 = 한도의 약 2배.
- FE(Vercel)·DB(Neon)는 영향 없음. 정지된 건 BE와 AI뿐.

### 선택지 (2026-09 기준, 무료 조건은 자주 바뀜)

| 대상 | 후보 | 판단 |
|---|---|---|
| BE(NestJS) | Render 무료 유지 | **선택**. AI가 나가면 서비스 1개라 월 744시간으로 한도 안. 코드 변경 없음 |
| BE | Vercel (NestJS zero-config) | 보류. 가능하지만 마이그레이션·업로드 4.5MB 제한 등 조정 필요 |
| BE | Cloudflare Workers / Supabase Edge Functions | 제외. 런타임이 달라 사실상 재작성 |
| BE | Koyeb | 제외. 가입해 보니 Mistral 인수 이후 **신규 무료 플랜이 없음** |
| AI(FastAPI) | Vercel Python 함수 | **선택**. FastAPI 공식 지원, SSE 스트리밍 OK, Hobby 최대 300초 |

### 결정
- AI → Vercel(별도 프로젝트), BE → Render 유지(서비스 1개), FE는 Vercel 그대로, DB는 Neon에서 Supabase로(예정).

### 배운 점
- 무료 티어는 "슬립"과 "정지"가 다르다. 서비스를 상시로 깨워 두면 한 달 한도를 서비스 개수만큼 빨리 쓴다.
- 슬립 방지 핑은 서비스가 1개일 때만 무료 한도(750시간) 안에 든다(월 744시간).
- 이전 대안을 고를 땐 무료 조건보다 **코드를 얼마나 고쳐야 하는지**(NestJS를 워커로 옮기려면 재작성)가 더 큰 비용이었다.
- **무료 조건은 검색 요약이 아니라 가입 화면·공식 요금 페이지로 먼저 확인한다.** Koyeb는 인수로 신규 무료 플랜이 없어졌는데 요약 글만 보고 진행할 뻔했다.

---

## 2편. AI 서버를 Vercel로 옮기기

> 상세 원본: `inote-ai` 레포의 `docs/vercel-migration.md`

### Vercel Hobby로 AI 서버를 돌릴 수 있는 근거 (공식 문서 확인)
- 함수 최대 실행 시간: Fluid compute 기준 기본·최대 **300초** (스트리밍 시간 포함).
- FastAPI는 진입점 파일(`app/main.py`)을 자동 인식 — 별도 설정 없이 배포 가능.
- 메모리 2GB/1 vCPU, Python 번들 500MB, 요청·응답 본문 4.5MB, 웹소켓 미지원(SSE는 가능).
- 월 무료: Active CPU 4시간, 함수 호출 100만 건. **DB·Groq 응답을 기다리는 I/O 시간은 Active CPU에 포함되지 않음.**
- 주의: 한도 초과 시 약 30일간 해당 기능 사용 불가, 비상업·개인 프로젝트 한정, 사용량은 계정 단위 합산(FE와 공유).

### 한 일
- `.python-version`(3.12), `.vercelignore` 추가 — Python 함수는 프로젝트 파일을 전부 번들에 넣기 때문에 `venv/`·`.env`를 반드시 제외.
- DB 연결에 `connect_timeout`, `prepare_threshold=None` 추가 (서버리스는 요청마다 연결을 새로 열고, 풀러 뒤에서 prepared statement가 꼬이지 않게).
- 배포 후 요약·스트리밍·CORS는 정상인데 **DB 조회만 500**.

### 트러블슈팅: DB 조회만 500
- 단서: 환경 변수를 다시 넣은 뒤 실행 시간이 9ms → 약 580ms로 바뀜 = 이제 접속은 하고 있다는 뜻.
- 원인: Vercel의 `DATABASE_URL`에 **BE의 DB 주소**가 들어 있어 접속은 되지만 AI 테이블이 없었음.
- 해결: AI 전용 DB 주소로 교체 후 재배포.
- 진단 도구: `/health/db` (internal 전용) — 접속 성공 여부, 에러 종류, `DATABASE_URL`의 호스트·DB 이름(비밀번호 제외), 테이블 존재 여부.
- Vercel 로그에 에러가 안 보이던 이유: 한 인스턴스가 요청을 동시에 처리(Fluid compute)해서 로그가 다른 요청 행에 붙어 보임 → 에러 로그에 `request_id`(`x-vercel-id`)를 넣어 검색하게 했고, 500 응답에도 같은 값을 돌려줌.

---

## 3편. DB를 Neon에서 Supabase로 (예정)

> 상세 원본: `inote-server` 레포의 `docs/supabase-migration.md`, `inote-ai` 레포의 `docs/supabase-migration.md`

- 이유: Neon 무료 컴퓨트 한도 초과 경고, 프로젝트 2개(prod·dev)로 로컬/운영 DB 분리, AI DB를 BE DB에 합치기.

---

## 참고
- Render 무료: https://render.com/docs/free
- Vercel 함수 제한: https://vercel.com/docs/functions/limitations
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Vercel Python 런타임: https://vercel.com/docs/functions/runtimes/python
- Vercel NestJS: https://vercel.com/docs/frameworks/backend/nestjs
