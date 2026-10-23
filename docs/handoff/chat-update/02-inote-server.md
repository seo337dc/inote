# 02 — inote-server 작업 (NestJS + Prisma)

> 결정·계약 소스: `inote/docs/adr/0006-chat-update.md`. 어긋나면 ADR이 맞다.
> 변경은 작다: **글 삭제 시 AI 세션을 지우던 호출을 "연결 해제 요청"으로 바꾼다.**
> 배포 순서: `inote-ai`(01) 배포 **후**, FE 배포 **전**.

## 왜 바꾸나
- 지금 `blog.service.ts`의 `remove`가 글을 지울 때 `deleteAiSession(postId)`로 `DELETE {INOTE_AI_URL}/sessions/{postId}`(내부 시크릿)를 호출한다. 글 id를 세션 id로 쓰는 가정(`id == postId`) 위에 있다.
- 채팅 업데이트 후에는 한 글에 채팅이 여러 개가 되고 세션 id가 글 id와 무관해진다. 그리고 결정: **글을 삭제하면 채팅은 삭제하지 않고 미연결로 남긴다.**
- 그래서 `inote-ai`에 새로 생기는 `POST /sessions/unlink-post`를 호출하도록 바꾼다.

## 사전 확인 (직접 읽을 것 — 2026-10-23 조사 기준)
- `src/blog/blog.service.ts` — `remove`, `deleteAiSession`(약 L690, L736-749), 실패해도 글 삭제를 막지 않는 처리
- `deleteAiSession`을 부르는 **모든 곳**을 검색해서 찾는다 (글 삭제 외에 쓰는 곳이 있는지). 회원 탈퇴는 `DELETE /sessions?user_id`를 따로 쓰는 것으로 알고 있으니 영향 없는지 확인
- `src/blog/blog.controller.ts` — `GET /blog/posts/:id/owner`(내부 시크릿). `inote-ai`가 새 코드에서 더 이상 쓰지 않게 되지만, **이번 작업에서는 지우지 않는다**(후속 정리)
- 기존 테스트 파일에서 `deleteAiSession`/`remove`를 어떻게 mock하는지

## 구현할 것
1. `deleteAiSession(postId)`를 `unlinkAiSessions(postId)` 같은 이름으로 바꾸고, `POST {INOTE_AI_URL}/sessions/unlink-post`를 `{ post_id }` 본문 + 내부 시크릿 헤더로 호출한다 (헤더 이름·인코딩은 기존 호출 코드를 그대로 따른다)
2. **실패해도 글 삭제는 막지 않는다** (현행과 동일). 실패는 로그에 남긴다
3. 서버 DB(Prisma) 스키마 변경 없음. 환경변수 추가 없음(예상 — `INOTE_AI_URL`, 내부 시크릿은 기존 것)
4. Swagger 문서에 영향이 있으면 갱신

## 배포 시 주의
- 이 변경이 운영에 나가기 전에 `inote-ai`의 `unlink-post`가 먼저 배포돼 있어야 한다. 아니면 호출이 404로 실패하고(글 삭제는 막지 않으므로 사용자에겐 안 보임) 연결이 해제되지 않은 채 남는다
- **구 `inote-server`가 운영에 남아 있는 동안 `inote-ai`의 내부용 `DELETE /sessions/{id}`는 지우지 않는다.** (지우면 글 삭제 연동이 깨진다)
- `INOTE_AI_URL` 운영 값이 실제로 어디를 가리키는지 확인한다 — `render.yaml`에는 옛 Render 주소가 남아 있고, 마이그레이션 문서에는 Vercel 주소(`https://inote-ai-cyan.vercel.app`)로 바꿨다고 되어 있어 운영 값이 확인되지 않았다

## 테스트
- **이 레포는 "사람이 테스트를 직접 작성"한다.** Claude는 아래 **테스트 목록 + 골격(describe/it 이름과 mock 설정)만** 준다. 사람이 케이스를 채우고, 그 테스트가 통과하도록 구현한다 (Nest jest + 서비스에 mock 주입)
- 테스트 케이스 목록
  - 글 삭제 시 `inote-ai`의 `unlink-post`를 `post_id = 삭제한 글 id`로 호출한다
  - AI 호출이 실패(네트워크 오류/비정상 응답)해도 글 삭제는 성공한다
  - 시크릿 헤더를 함께 보낸다
  - (해당되면) 회원 탈퇴 경로는 영향이 없다
  - 존재하지 않는 글/권한 없는 삭제는 AI 호출을 하지 않는다
- 통합 테스트는 로컬 개발 DB(`scripts/dev-db.sh start`, 절차는 `docs/runbooks/local-dev-db.md`)에서만. 기본 `DATABASE_URL`은 **운영 Supabase**이므로 개발 DB로 띄우지 않았다면 통합 테스트를 돌리지 않는다

## 이 세션에 붙여넣을 프롬프트
````text
너는 inote-server(NestJS) 레포에서 작업한다. 이 작업은 FE 레포 inote 의 LLM 채팅 업데이트의 일부다.

먼저 순서대로 읽어라:
1) git pull
2) 이 레포의 CLAUDE.md
3) inote 레포의 docs/handoff/chat-update/02-inote-server.md (이 작업의 상세 지침)
4) inote 레포의 docs/adr/0006-chat-update.md (결정과 API 계약의 소스. 어긋나면 ADR이 맞다)
(inote 레포가 이 PC에 없으면 사용자에게 알려라. 추측해서 작업하지 마라.)

작업: 글 삭제 시 AI 세션을 삭제(DELETE {INOTE_AI_URL}/sessions/{postId})하던 호출을, inote-ai 의 POST /sessions/unlink-post { post_id } (내부 시크릿)로 바꾼다. 실패해도 글 삭제는 막지 않는다. 채팅은 삭제하지 않고 "미연결"로 남기는 것이 결정 사항이다.

규칙:
- 구현 전에 02-inote-server.md 의 "사전 확인" 파일들을 직접 읽고 deleteAiSession 의 모든 호출 지점을 검색해라. 조사 내용과 현재 코드가 다르면 알려라. 계획을 먼저 보여주고 사용자 확인을 받은 뒤 시작한다.
- 이 레포는 사람이 테스트를 직접 작성한다. 너는 테스트 목록과 골격(describe/it 이름, mock 설정)만 주고, 사람이 케이스를 채운 뒤 그 테스트가 통과하도록 구현해라. 테스트 본문을 대신 다 채우지 마라.
- API 계약을 임의로 바꾸지 마라. 바꾸고 싶으면 멈추고 사용자에게 물어라. GET /blog/posts/:id/owner 는 지우지 않는다.
- 통합 테스트는 로컬 개발 DB(scripts/dev-db.sh start)에서만. 기본 DATABASE_URL 은 운영 Supabase 이므로 개발 DB 로 띄우지 않았다면 통합 테스트를 돌리지 마라.
- 환경변수 값이나 시크릿을 출력·기록하지 마라.
- 배포 순서(inote-ai 먼저, FE 전)를 PR description 의 "배포 시 주의"에 반드시 적어라.
- 커밋·PR·push는 사용자가 명시적으로 요청할 때만 한다. 커밋은 기능 단위로 쪼개고, 커밋할 때 PR description 초안도 함께 보여준다. 구현이 끝나면 결과만 보고하고 멈춘다.
````
