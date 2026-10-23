# LLM 채팅 업데이트 — 결정과 API 계약 (2026-10-23)

> **상태: 결정 합의됨, API 계약 승인됨 (2026-10-23, 구현 미착수).** 3절의 세 가지(`DELETE /conversations/{id}` 경로, `PATCH /sessions/{id}` 하나로 이름·연결 처리, 제목 생성 별도 `POST`)를 포함해 사용자가 승인했다.
> 후속으로 미룬 것은 [`docs/todo/chat-update.md`](../todo/chat-update.md). 레포별 인수인계·프롬프트는 [`docs/handoff/chat-update/`](../handoff/chat-update/README.md).

## 1. 확정된 결정

| # | 결정 |
|---|---|
| 1 | 채팅은 독립된 개체. 글이 없어도 존재하고, 나중에 연결할 수 있다 |
| 2 | 연결은 채팅 1개 : 대상 1개. 한 글에는 채팅 여러 개. 모델은 `대상 종류 + 대상 id` 범용, **1차는 글만 연결** |
| 3 | 상세 화면·글쓰기 화면에서 시작한 채팅은 그 글에 **자동 연결**. 독립 채팅은 미연결 |
| 4 | 글을 삭제하면 연결된 채팅은 **미연결로 전환**(이력 보존) |
| 5 | 글 화면에 들어오면 그 글에 연결된 채팅 중 **가장 최근 채팅**을 연다. 없으면 빈 상태로 대기, 첫 전송 때 새 채팅을 만들어 자동 연결. 글 화면의 "새 채팅"은 그 글에 연결된 새 채팅 |
| 6 | 채팅의 소유는 **세션 생성자(`user_id`)** 기준. 글 작성자 여부는 검사하지 않는다 |
| 7 | LLM이 글을 읽는다: FE가 본문(HTML)을 요청에 실어 보내고 `inote-ai`가 `html_to_text`로 변환. 상세=저장된 내용, 편집=현재 에디터 내용. 독립 채팅은 해당 없음 |
| 8 | **본문 전송 규칙(B)**: 채팅의 첫 질문과 글이 바뀐 뒤의 첫 질문에만 본문을 보낸다. 변경 감지는 FE가 세션별로 마지막 전송 본문의 해시를 메모리에 기억(새로고침하면 사라져 한 번 더 보냄). **"글 다시 읽기" 버튼**으로 다음 요청에 본문을 강제 포함. 이어지는 질문에서 모델이 본문 세부를 모를 수 있다는 한계는 알고 간다 |
| 9 | 본문은 별도 요청 필드로만 받고 `conversations`(이력)에 저장하지 않는다. 길이 상한 약 15,000자(변환 후, 구현 때 조정), `inote-ai`가 최종 컷, 초과 시 앞부분 유지 + 모델에 "잘렸다" 표식 + 사용자에게 한 줄 안내. 본문은 system이 아니라 구분자로 감싼 별도 메시지로 넣는다 |
| 10 | **"글에 넣기"**: 답변마다 버튼, **글쓰기(편집) 화면에서만**, 글 **맨 아래에 추가**. 상세 화면·독립 채팅에서는 없음. 마크다운→HTML은 `markdown-paste.ts`의 `markdownToHtml`을 export해서 재사용 |
| 11 | 채팅 **이름(제목)**: 첫 질문만 읽고 AI가 1회 생성(최대 60자), 이후 사용자가 수정. 실패하면 첫 질문으로 표시. 사용자가 수정한 이름은 AI가 덮어쓰지 않는다. 연결된 글의 제목은 목록의 보조 라벨 |
| 12 | 채팅 **삭제**는 사용자용 API로 직접 한다 |
| 13 | **연결 변경 UI는 글 화면에서만**: "이 글에 연결"(미연결·다른 글에 연결된 채팅 → 현재 글), "연결 해제". 글 검색해서 연결은 후속 |
| 14 | 1차 제외: 이미지, 선택영역 AI 수정, 말로 "넣어줘", `can_draft` 초안 기능(건드리지 않음), N:M 연결, 글 외 대상 UI, 인증 도입, sanitize |

## 2. 코드에서 확인된 전제 (2026-10-23, 서브에이전트 조사 기준 — 구현 전 재확인)
- `inote-ai` `conversation_sessions`: `id text pk`(글쓰기 세션은 값이 `post_id`와 같음), `user_id`, `post_id`, `post_title`, `post_category`, `kind`. `upsert_session`은 `on conflict (id)`이고 `post_id`를 갱신하지 않는다. 마이그레이션 도구 없음 — `schema.sql`의 멱등 SQL을 수동 적용
- 소유 검사는 `app/services/ownership.py`가 `inote-server GET /blog/posts/{id}/owner`로 글 작성자를 확인(`chat.py:184-186`)
- 현재 삭제는 `DELETE /sessions/{id}`(내부 시크릿, 글 삭제 시 `inote-server`가 `blog.service.ts`의 `deleteAiSession`으로 호출, `id == postId` 가정)
- FE `useChatMessages.ts`가 글쓰기에서 `sessionId = postId`를 강제하고, `/posts/{id}`는 `post_id` 일치하는 첫 세션만 전환
- 에디터(`PostEditor`)와 채팅 위젯은 서로 다른 트리이고 FSD 규칙상 서로 import 불가 → `shared`에 중간 매개체 필요. 전역 상태 라이브러리(zustand 등)는 없음

## 3. API 계약 초안 (후보 — 승인 필요)

### 3.1 DB 스키마 (`inote-ai`, `schema.sql`에 멱등 SQL로 추가)
```sql
alter table conversation_sessions add column if not exists title text;
alter table conversation_sessions add column if not exists target_type text;   -- 1차: 'post' 또는 null
alter table conversation_sessions add column if not exists target_id text;
create index if not exists conversation_sessions_target_idx
  on conversation_sessions (user_id, target_type, target_id, updated_at desc);
-- 백필: 기존 글쓰기 세션(id가 post_id와 같은 행)을 글 연결로 변환. id는 그대로 둔다
update conversation_sessions
   set target_type = 'post', target_id = post_id
 where target_type is null and post_id is not null and kind = 'write';
```
- 새 코드는 세션 `id`를 불투명 값으로만 다루고 `post_id`로 해석하지 않는다. 기존 `post_id`/`post_title`/`post_category` 컬럼은 유지(호환·보조 라벨)
- `title`이 `null`이면 "아직 이름 없음" → 목록은 첫 질문을 표시. 빈 문자열로 저장하지 않고 `null`로 저장
- 연결 대상이 삭제됐는지는 `target_id`만으로 알 수 없으므로 삭제 시 `target_*`를 `null`로 바꾼다(3.3)

### 3.2 `inote-ai` 엔드포인트
| 구분 | 엔드포인트 | 요청 | 응답/비고 |
|---|---|---|---|
| 변경 | `POST /chat/stream` | 기존 필드 + `target_type?`, `target_id?`, `post_content_html?`(저장 안 함) | SSE에 이벤트 `{"post_truncated": true}` 추가. 소유 검사는 "세션 생성자 `user_id` 일치"로 변경(세션이 없으면 새로 만들고 `target_*` 기록, 있는데 다른 `user_id`면 거부). 이미 있는 세션의 `target_*`는 이 요청으로 바꾸지 않는다(변경은 PATCH로만) |
| 변경 | `GET /sessions?user_id&q&target_type&target_id` | — | 항목에 `title`, `target_type`, `target_id` 추가. `target_*` 쿼리는 그 글의 채팅만 |
| 신규 | `PATCH /sessions/{id}` | `{user_id, title?, target_type?, target_id?}` — 보낸 필드만 변경. `title`은 최대 60자, 빈 값이면 `null`. `target_*`를 `null`로 보내면 연결 해제 | 변경된 세션 요약. 다른 `user_id`면 403 |
| 신규 | `POST /sessions/{id}/title` | `{user_id}` | `{title: string \| null}`. 이미 `title`이 있으면 새로 만들지 않고 기존 값을 돌려준다. 생성 입력은 그 세션의 첫 user 메시지, 60자 컷. 실패하면 `title: null` |
| 신규 | `DELETE /conversations/{session_id}?user_id=` | — | 사용자용 삭제(메시지는 FK cascade). 기존 내부용 `DELETE /sessions/{id}`와 경로가 겹치지 않게 `conversations` 아래에 둔다 |
| 신규 | `POST /sessions/unlink-post` | `{post_id}` + `x-internal-secret` | `target_type='post' and target_id=post_id`인 세션의 `target_*`를 `null`로. `{unlinked: n}` |
| 제거 예정 | 내부용 `DELETE /sessions/{id}` | — | `inote-server`가 `unlink-post`로 바꾼 뒤 제거. **그 전까지 남아 있으면 옛 글(id==postId) 세션이 삭제되어 결정 4와 어긋난다** |

### 3.3 `inote-server`
- `blog.service.ts`의 `remove`: `deleteAiSession(postId)` → `POST {INOTE_AI_URL}/sessions/unlink-post {post_id}`(내부 시크릿, 실패해도 글 삭제는 막지 않음 — 현행과 동일)
- `GET /blog/posts/:id/owner`는 `inote-ai`가 더 이상 쓰지 않으면 후속에서 정리
- 서버 DB(Prisma) 스키마 변경 없음. 환경변수 추가 없음(예상)

### 3.4 FE (`apps/web`)
- `ChatSession` 타입에 `title`, `target_type`, `target_id` 추가. 목록 제목 우선순위: `title` > 첫 질문. 연결된 글 제목은 보조 라벨
- `useChatMessages`: 세션 id는 항상 새 UUID. 글 화면에서는 `target_id === postId`인 세션 중 `updated_at`이 가장 최근 것을 연다. 첫 전송 때 `target_type/target_id`를 함께 보내 자동 연결. 첫 답변 완료 후 `POST /sessions/{id}/title` 1회
- 본문 전송(결정 8): 세션별 마지막 전송 해시를 메모리에 두고 다를 때만 `post_content_html` 포함. 출처는 상세=`/blog/posts/{id}`의 `content`, 편집=`shared`에 등록된 "현재 문서 getter"
- "글에 넣기"(결정 10): `shared`에 모듈 스토어를 두고 편집 화면이 `appendHtml(html)` 명령을 등록, 위젯은 등록된 명령이 있을 때만 버튼 표시
- 이름 수정·삭제·연결 변경 UI는 세션 패널(`ChatSessionPanel`)과 글 화면 메뉴에 추가

## 4. 배포 순서
1. `schema.sql` 변경을 운영 Supabase(AI용)에 **수동 적용**(AI 코드 배포 전)
2. `inote-ai` 배포 — 새 필드는 모두 옵션이라 구 FE가 그대로 동작해야 함
3. `inote-server` 배포(글 삭제 → `unlink-post`) — **FE 3.4 배포 전에 끝낸다.** 안 그러면 새 세션(id≠postId)이 글 삭제 후에도 연결된 채로 남는다
4. FE 배포
5. 내부용 `DELETE /sessions/{id}` 제거

## 5. 테스트 방침 (CLAUDE.md "계약 → FE → BE → 통합")
- **FE 먼저**: `useChatMessages` 전용 테스트가 없으므로 세션 구조 개편 **전에** 세션 전환 규칙·전송 body 모양(MSW)·로딩 가드 테스트부터 보강
- **BE**: 테스트 목록과 골격만 제공하고 사람이 작성. `inote-ai`에도 같은 규칙을 적용할지는 `inote-ai` 작업을 시작할 때 정한다(2026-10-23 사용자가 "그때 판단"으로 미룸)
- **통합**: 로컬 개발 DB(도커 Postgres)에서만. 운영 DB 금지

## 6. 열려 있는 것
- 3절 계약 승인(특히 `DELETE /conversations/{id}` 경로, `PATCH /sessions/{id}` 하나로 이름·연결을 같이 다루는 방식, 제목 생성을 별도 `POST`로 두는 방식)
- 본문 상한 수치와 Groq 요청 한도 확인(구현 때)
- 본문이 같은 요청 앞쪽에 고정되면 Groq 프롬프트 캐싱이 되는지 — 확인 못 함
- 신규 글(아직 id가 없는 작성 중)에서 시작한 채팅은 글이 저장되어 id가 생긴 뒤에 연결해야 함 — `WritePostForm`/라우트 확인 필요
- 에디터에서 프로그램이 삽입한 내용이 변경(dirty)으로 잡히는지(자동저장·이탈 경고) — `PostEditor` 확인 필요
