# 글 저장 시 403 — 조사 노트 (2026-10-13, 미해결)

> 다른 PC에서 이어서 확인하기 위한 기록. **원인은 아직 확정되지 않았다.** 아래 "가설"은 정황 기반 추정이다.

## 현상
- 에디터에 `docs/kure/DOCKER-SETUP-GUIDE.md` 내용을 붙여 넣고 저장하면 에러가 난다.
- 개발자도구에서 본 요청: `PATCH https://inote-server-5a63.onrender.com/api/v1/blog/posts/cmv6gfwxb001vbg381n68434z` → **403 Forbidden**
- 이 403 스크린샷이 가이드 저장 때의 에러와 같은 요청인지는 아직 확정되지 않았다.

## 코드에서 확인한 사실 (`inote-server`)
- `PATCH /blog/posts/:id`에는 `AuthGuard`가 걸려 있다. 로그인이 안 됐으면 **401**(`로그인이 필요합니다.`)이다.
- 이 경로에서 Nest가 403을 내는 곳은 `src/blog/blog.service.ts:536` 한 곳뿐이다 — 글 작성자와 로그인 사용자가 다르면 `본인이 작성한 글만 수정할 수 있습니다.`
- `main.ts`에 본문 크기 설정이 없어 Express 기본값(약 100KB)이 적용된다. 초과하면 403이 아니라 **413**이다.
- 요청 로깅 미들웨어가 없고 Sentry도 미연결이다. Nest는 403 같은 `HttpException`을 기본 로그에 안 찍으므로 **Render 로그에 흔적이 없을 수 있다** (로그가 비어 있어도 원인 구분이 안 된다).
- 운영 BE는 `EMBEDDINGS_ENABLED`가 꺼져 있어 임베딩 연동과는 무관하다.

## 가설 (미확정)
| | 후보 | 증상 | 비고 |
|---|---|---|---|
| A | Render 앞단 Cloudflare(WAF)가 본문을 공격 패턴으로 오인 | 403, 응답이 HTML 등 Nest 형식이 아님 | 가장 의심. 가이드에 셸 명령(`curl`, `export PATH=`, `docker exec`)과 SQL이 많음 |
| B | 글 작성자와 로그인 계정이 다름 | 403, 위 한글 메시지가 JSON으로 옴 | 같은 계정으로 다른 글이 저장되면 아님 |
| C | 본문이 너무 큼 | 413 | 가이드는 약 20KB 분량이라 가능성 낮음 |

A를 의심하는 정황 (증명은 아님):
- 응답 헤더에 `Cf-Ray`가 있다 → Cloudflare를 거친다. 이 Cloudflare는 **본인 계정이 아니라 Render가 관리하는 것으로 추정**되며(미확인), 그렇다면 Security Events를 직접 볼 수 없다.
- `Cache-Control: private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0` — Cloudflare 차단·챌린지 페이지가 쓰는 조합으로 알려져 있고, Express는 기본으로 붙이지 않는다.
- `Content-Encoding: br` — 이 서버에 압축 미들웨어가 없다.

## 내일 확인할 순서
1. Network → 해당 PATCH 요청 → **Response 탭** (가장 결정적)
   - `{"message":"본인이 작성한 글만...","statusCode":403}` → B
   - HTML 또는 Cloudflare 문구 → A
   - 413 → C
2. 같은 글에 **짧은 내용**을 저장해 본다 → 저장되면 계정·세션이 아니라 본문 내용 문제.
3. 가이드에서 **`curl` 블록만 / SQL 블록만** 빼고 저장해 본다 (이분법).
4. (선택) 인증 없이 같은 형태의 `PATCH`를 운영 서버에 보내 비교: 가이드 내용 본문 → 403(HTML)인지, 짧은 본문 → 401(Nest JSON)인지. 운영 서버로 보내는 요청이므로 사용자가 허락한 뒤에만 한다.
5. Render 로그에서 같은 시각의 `PATCH`/에러를 찾는다 (보조 — 없다고 원인이 구분되지는 않음).

## 후속 작업 후보 (승인 후 한 번에 하나씩)
1. BE 요청 로깅 미들웨어 (메서드·경로·상태 코드·사용자 id 한 줄) — 가장 급함
2. BE Sentry (`@sentry/nestjs`, 5xx만 전송, 4xx 제외)
3. FE Sentry (`@sentry/nextjs`, 소스맵, 저장 실패는 `captureException`으로 직접 전송 — `fetch`의 403은 예외가 아니라 자동 수집되지 않음)
4. AI 서버 Sentry (`sentry-sdk[fastapi]`, 서버리스라 flush 필요)
5. 요청 ID를 FE→BE로 전달해 에러를 추적
- 공통: `environment`를 `production`/`development`로 분리(로컬과 운영이 같은 DB를 쓰므로), `sendDefaultPii` 끄기, 글 본문·요청 body는 전송하지 않기.
- Sentry 무료 한도(CLAUDE.md상 5K/월)는 가입 화면·공식 요금 페이지에서 먼저 확인한다.
- WAF가 막은 요청은 Nest에 도달하지 않아 BE Sentry에는 안 잡힌다 → FE 쪽 수집이 필요.
- Render 무료는 슬립이 있어 가동 여부는 별도 헬스체크로 본다(무료 조건 확인 필요).
