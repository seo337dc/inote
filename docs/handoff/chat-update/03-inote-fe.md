# 03 — inote FE 작업 (Next.js, `apps/web`)

> 결정·계약 소스: [`docs/adr/0006-chat-update.md`](../../adr/0006-chat-update.md). 어긋나면 ADR이 맞다.
> 가장 큰 작업. **MSW 목으로 먼저 시작할 수 있다** (계약이 승인됨). 운영 배포는 `inote-ai` → `inote-server` 다음.
> FE 작업 원칙(CLAUDE.md): **화면을 먼저 만들지 않는다. 화면·결정 하나 단위로 사용자와 의논하고 확인받은 뒤 작업한다.** 아래 단계도 한 단계씩 진행하고 매번 멈춘다.

## 사전 확인 (직접 읽을 것 — 2026-10-23 조사 기준)
- `apps/web/src/widgets/chat-dock/` — `ChatWorkspace`(전역, `app/layout.tsx:35`), `model/useChatMessages.ts`, `model/routePost.ts`, `model/useReadingChatMessages.ts`(독서 상담은 별개, **건드리지 않음**), `ui/ChatSessionPanel.tsx`, `ui/ChatMessages.tsx`(`AssistantBubble`), `ui/ChatComposer.tsx`, `model/types.ts`
- `useChatMessages.ts` 현재 동작: `/write/{id}` 진입 시 `sessionId = postId` 강제, `/posts/{id}`는 `sessions.find(s => s.post_id === detailPostId)` 첫 일치, 그 외는 `crypto.randomUUID()`. 전송 시 `GET /blog/posts/{id}`로 title/category 조회 후 `POST {AI}/chat/stream`(SSE). 세션 목록 `GET {AI}/sessions?user_id&q`, 이력 `GET {AI}/conversations/{id}?user_id`. 게스트는 저장 안 함
- `shared/ui/editor/PostEditor.tsx`(props: `content`, `onChange(html)`, `onUserEdit`), `shared/ui/editor/markdown-paste.ts`(`markdownToHtml` 비export, `MarkdownPaste` 확장), `features/write-post/ui/WritePostForm.tsx`(약 L104 `content` state, L259 `PostEditor`), `views/post-detail/ui/PostDetailPage.tsx` / `PostArticle`
- FSD 규칙: `apps/web/eslint.config.mjs` — widgets는 features/entities/shared만 import, features는 entities/shared만. **위젯(chat-dock)과 features/write-post는 서로 import 불가** → 둘 사이 통로는 `shared`에 둔다. 전역 상태 라이브러리(zustand 등)는 없다 (react-query만). **새 의존성 추가는 사용자 승인이 필요**
- 기존 테스트: `routePost.test.ts`, `ChatWorkspace.test.tsx`, `ChatMessages(.scroll).test.tsx`, `ChatComposer.test.tsx`, `useReadingChatMessages.test.ts`, `markdown-paste.test.ts`. **`useChatMessages` 전용 테스트는 없다**

## 작업 단계 (이 순서로, 한 단계씩)
각 단계마다: 사용자와 의논·확인 → 구현 + 테스트 → 설명(각 테스트가 무엇을 지키는지 한 줄씩) → `pnpm test` · `pnpm lint` · `pnpm build` → 결과 보고 후 멈춤. (E2E는 보류 중이라 건너뜀)

### 단계 0 — `useChatMessages` 테스트 보강 (구조를 바꾸기 **전에**)
- 지금 동작을 고정한다: 세션 전환 규칙, 전송 body 모양(MSW로 `/chat/stream` 가로채기), 로딩 중 중복 전송 방지, 게스트 처리
- 이후 단계가 이 테스트를 깨뜨리면서 의도한 변경인지 확인하는 안전망이 된다

### 단계 1 — 세션 모델과 목록
- `ChatSession` 타입에 `title`, `target_type`, `target_id` 추가 (옵션 필드 — 구 서버 응답에서도 안 깨지게)
- 목록 제목 우선순위: `title` > 첫 질문. 연결된 글의 제목(`post_title`)은 보조 라벨
- MSW 핸들러를 계약에 맞게 갱신

### 단계 2 — 세션 구조 개편 (가장 최근 채팅 + 자동 연결)
- 세션 id는 항상 새 UUID (더 이상 `postId`를 세션 id로 쓰지 않음)
- 글 화면(`/posts/{id}`, `/write/{id}`)에서 `GET /sessions?target_type=post&target_id={id}`의 **첫 항목(가장 최근 `updated_at`)** 을 연다. 없으면 빈 상태로 대기하고, **첫 전송 때** `target_type/target_id`를 함께 보내 새 채팅을 만들어 자동 연결
- 글 화면의 "새 채팅" = 그 글에 연결된 새 채팅. 독립 채팅을 글 화면에서 시작하는 방법은 두지 않음
- `routePost.ts`(경로에서 글 id 추출)는 그대로. `useChatMessages`의 동기화 effect의 "선택 규칙"만 교체 (`lastRoutePostId`처럼 글 id가 바뀔 때만 재동기화하는 구조는 유지)
- 열린 채팅이 다른 글에 연결된 경우(패널에서 직접 연 경우)의 본문 전송은 **현재 화면의 글** 기준이다 (결정 7). 이 경우 UI에서 혼동되지 않게 어떻게 보일지는 사용자와 의논
- ⚠️ 신규 글(아직 id가 없는 작성 중)에서 시작한 채팅은 글이 저장돼 id가 생긴 뒤에 연결해야 한다 — `WritePostForm`·라우트를 확인하고 처리 방식을 사용자와 정한다

### 단계 3 — 이름 수정 · 삭제 · 연결 변경
- API 함수: `PATCH {AI}/sessions/{id}`(이름, 연결/해제), `DELETE {AI}/conversations/{id}?user_id=`
- 이름: 60자 제한, 빈 값이면 서버가 `null`로 저장(→ 첫 질문 표시)
- 삭제: 확인 단계를 둔다 (되돌릴 수 없음)
- 연결 변경 UI는 **글 화면에서만**: "이 글에 연결"(미연결·다른 글에 연결된 채팅 → 현재 글), "연결 해제". 글 검색해서 연결은 후속
- 위치는 `ChatSessionPanel`과 글 화면 메뉴. 새 버튼에는 처음부터 `hover:` 스타일을 넣는다 (CLAUDE.md)

### 단계 4 — AI 제목 생성 호출
- 새 채팅의 **첫 답변이 끝난 뒤** `POST {AI}/sessions/{id}/title {user_id}`를 **1회** 호출하고, 받은 `title`을 목록에 반영
- 이미 `title`이 있거나(사용자 수정 포함) 첫 교환이 아니면 호출하지 않는다. 실패(`title: null`·네트워크 오류)는 조용히 넘어가고 첫 질문을 표시. 에러를 사용자에게 띄우지 않는다

### 단계 5 — 본문 전송 (결정 8: 규칙 B)
- 요청에 `post_content_html`을 **첫 질문 / 글이 바뀐 뒤의 첫 질문 / "글 다시 읽기" 눌렀을 때만** 실어 보낸다. 나머지 질문은 보내지 않는다
- 변경 감지: 세션별로 마지막 전송 본문의 해시를 **메모리에** 기억 (새로고침하면 사라져 한 번 더 보냄 — 허용)
- 본문 출처: 상세=`/blog/posts/{id}`의 `content`(위젯이 이미 이 호출을 함), 편집=`shared`에 등록된 **"현재 문서 getter"**(저장 전 내용 포함. 서버 재조회로는 부정확)
- `shared`에 작은 모듈 스토어(`useSyncExternalStore` 또는 Context)를 둔다. 에디터 화면(`WritePostForm`)이 getter를 등록·해제하고, 위젯은 **전송 시점에만** 읽는다 (리렌더 없음). zustand 도입은 사용자 승인 없이는 하지 않는다
- **"글 다시 읽기" 버튼**: 입력창 근처. 누르면 다음 요청에 본문을 강제 포함. 독립 채팅(글 없음)에서는 숨김
- SSE의 `post_truncated` 이벤트를 받으면 채팅창에 한 줄 안내("글이 길어 앞부분만 읽었어요")
- 독립 채팅에서는 본문을 보내지 않는다

### 단계 6 — 글에 넣기 (결정 10)
- 답변마다 "글에 넣기" 버튼. **글쓰기(편집) 화면에서만**, 글 **맨 아래에 추가**. 상세 화면·독립 채팅에는 없음 (등록된 명령이 있을 때만 표시)
- 단계 5의 `shared` 스토어에 `appendHtml(html)` 명령을 같이 등록한다. 에디터 인스턴스를 밖에 내주지 말고 **명령 함수만** 등록 (`editor.chain().focus('end').insertContent(html)` 방향)
- `shared/ui/editor/markdown-paste.ts`의 `markdownToHtml`을 export하고 `shared/ui/editor/index.ts`에서 re-export. **붙여넣기 전용 보정(`breaks:true`, 연도형 번호목록 보정)이 채팅 답변에도 맞는지 확인**한다
- ⚠️ 확인 필요: 프로그램이 삽입한 내용이 `onUserEdit`/dirty로 잡히는지 (안 잡히면 자동저장·이탈 경고가 안 걸린다) — `PostEditor` 내부를 읽고 처리 방식을 사용자와 정한다
- LLM 출력 HTML의 sanitize는 후속(`docs/todo/chat-update.md`). 1차는 Tiptap 스키마 경유만

## 건드리지 않는 것
- 독서 상담(`useReadingChatMessages`, `/reading-chat`), `can_draft` 초안 기능, 이미지 첨부, 선택영역 AI 수정, 글 검색 연결 UI

## 문서·체크리스트
- 각 단계 후 CLAUDE.md "커밋 전 체크리스트"를 그대로: 단위/컴포넌트 테스트 → lint → build → (E2E는 보류) → **CLAUDE.md 문서 최신화** → 사용자가 요청하면 커밋
- 개발 일지는 `docs/devlog/fe.md`에만 쓴다. 이번 작업이 CLAUDE.md "현재 상태"를 바꾸면 갱신한다
- `docs/todo/chat-update.md`의 후속 항목은 기능이 구현되면 "완료"로 옮기거나 갱신
- 통합 테스트(FE + 로컬 BE/AI)는 로컬 개발 DB에서만. FE를 개발 BE에 붙일 때: `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev`, AI 주소는 `NEXT_PUBLIC_AI_API_URL`(운영 AI 서버를 가리키고 있지 않은지 확인)

## 이 세션에 붙여넣을 프롬프트
````text
너는 inote(FE, Next.js apps/web) 레포에서 작업한다. LLM 채팅 업데이트의 FE 부분이다.

먼저 순서대로 읽어라:
1) git pull
2) CLAUDE.md, 그리고 docs/handoff/HANDOFF.md
3) docs/handoff/chat-update/README.md 와 docs/handoff/chat-update/03-inote-fe.md (이 작업의 상세 지침)
4) docs/adr/0006-chat-update.md (결정과 API 계약의 소스. 어긋나면 ADR이 맞다)

작업: 03-inote-fe.md 의 "작업 단계" 0~6을 순서대로. 지금 진행 상황은 README.md 의 체크박스를 보고, 어디까지 했는지 사용자에게 확인해라.

규칙:
- 화면을 먼저 만들지 않는다. 한 단계, 한 화면, 한 결정 단위로 사용자와 의논하고 확인받은 뒤에만 구현한다. 한 단계가 끝나면 결과만 보고하고 멈춘다.
- 구현 전에 "사전 확인" 파일들을 직접 읽고, 조사 내용(줄 번호 등)이 현재 코드와 다르면 알려라. 문서에 적힌 코드 위치는 2026-10-23 기준이다.
- API 계약을 임의로 바꾸지 마라. 바꾸고 싶으면 멈추고 사용자에게 물어라. 새 의존성(zustand 등) 추가도 사용자 승인이 필요하다.
- FE 작업 순서: 계약은 이미 승인됐으니 MSW 목 데이터로 구현·테스트한다. 단계 0(useChatMessages 테스트 보강)을 구조 변경 전에 먼저 한다. 각 테스트가 무엇을 지키는지 한 줄씩 설명해라.
- FSD 레이어를 지켜라(widgets/chat-dock 과 features/write-post 는 서로 import 불가, 통로는 shared). pnpm lint 로 확인.
- 새 버튼에는 hover 스타일을 넣어라.
- 각 단계마다 pnpm test → pnpm lint → pnpm build 를 실제로 실행하고 결과를 보여줘라. E2E 는 보류 중이라 건너뛴다. 이번 작업으로 CLAUDE.md 의 사실 정보가 바뀌면 커밋 전에 갱신해라.
- 커밋·PR·push 는 사용자가 명시적으로 요청할 때만. 커밋은 기능 단위로 쪼개고, 커밋할 때 PR description 초안(.github/pull_request_template.md 형식)도 함께 보여줘라. "배포 시 주의"에는 inote-ai 먼저 → inote-server → FE 순서를 적어라.
- 통합 테스트는 로컬 개발 DB 에서만. 운영 AI/BE 서버를 가리키는 환경에서 쓰기 동작을 시험하지 마라. 환경변수 값이나 시크릿을 출력·기록하지 마라.
- 한 단계가 끝나면 README.md 의 "진행 상황" 체크박스를 갱신하자고 사용자에게 제안해라.
````
