# SSE (Server-Sent Events) 학습 문서

> 읽는 시간 약 10분. 목적: 관리자 "임베딩 실행" 버튼의 진행률·완료 토스트를 SSE로 만들기 전에 필요한 만큼만 이해한다.
> 작성일 2026-11-04. 공식 문서로 확인하지 못한 항목은 "확인 필요"로 표시했다.

---

## 1. 한 줄 정의

**SSE는 HTTP 응답을 끝내지 않고 열어 둔 채, 서버가 텍스트 이벤트를 원할 때마다 한 방향(서버 → 클라이언트)으로 흘려보내는 방식이다.**

## 2. 왜 필요한가 (이 프로젝트에서)

임베딩 실행은 글이 많으면 수십 초~수 분이 걸린다. 일반 요청/응답이면 버튼을 누르고 끝날 때까지 아무것도 모른다. 원하는 것은 "10%… 20%… 글 A 완료, 글 B 실패… 전체 완료" 를 실시간으로 보고 완료 토스트를 띄우는 것이다.

| 방식 | 방향 | 연결 | 재연결 | 이 기능에서 |
|------|------|------|--------|-------------|
| 폴링(주기적 GET) | 클라이언트가 계속 물음 | 매번 새 요청 | 필요 없음 | 가장 단순. 하지만 요청이 많고 갱신이 늦음 |
| **SSE** | 서버 → 클라이언트만 | 긴 HTTP 1개 | `EventSource`는 자동 | 진행률 같은 "서버가 알려 주는" 흐름에 딱 맞음 |
| 웹소켓 | 양방향 | HTTP 업그레이드 후 별도 프로토콜 | 직접 구현 | 과함. 클라이언트가 보낼 게 없다 |

- SSE는 그냥 HTTP라 프록시·인증(쿠키)·로깅이 기존 REST와 같게 동작한다 (프록시 친화적).
- 맞는 경우: 진행률, 알림, LLM 토큰 스트리밍. 아닌 경우: 채팅처럼 양방향 실시간, 바이너리 전송, 서버가 수 시간 이상 열어 둬야 하는 연결.

## 3. 핵심 개념

### 3-1. 전송 형식

응답 헤더는 `Content-Type: text/event-stream`. 본문은 줄 단위 텍스트이고 **빈 줄(`\n\n`)이 이벤트 하나의 끝**이다.

```
: heartbeat                  <- ':'로 시작하면 주석. 클라이언트는 무시, 연결 유지용
retry: 3000                  <- 재연결 대기(ms) 힌트

id: 7
event: progress              <- 생략하면 기본 이름 "message"
data: {"done":2,"total":10,"percent":20}

event: done
data: {"embedded":9,"failed":1}

```

- `data:` 줄이 여러 개면 `\n`으로 이어 붙여 하나의 데이터가 된다. JSON은 한 줄로 보내는 게 편하다.
- 직접 해볼 것: 위 블록은 그대로 `printf`로 서버 흉내가 가능하다(7절 참고).

### 3-2. 클라이언트 두 방식

| | `EventSource` | `fetch` + `ReadableStream` |
|---|---|---|
| 자동 재연결, `Last-Event-ID` 전송 | 자동 | 직접 구현 |
| HTTP 메서드 | GET만 | 자유 (POST 가능) |
| 커스텀 헤더 | 불가 | 자유 |
| 쿠키 | `new EventSource(url, { withCredentials: true })` | `fetch(..., { credentials: "include" })` |
| 파싱 | 브라우저가 해 줌 | 직접 |

임베딩 진행률은 GET이고 인증이 쿠키 세션이라 `EventSource` + `withCredentials: true`가 가장 간단하다. 단 크로스 사이트(FE/BE 도메인이 다름)라서 BE의 CORS가 `Access-Control-Allow-Credentials: true`와 **구체적인 origin**(와일드카드 `*` 불가)이어야 하고, 쿠키는 `SameSite=None; Secure`여야 한다. 이미 겪은 크로스 사이트 쿠키 문제와 같은 종류다. 브라우저의 서드파티 쿠키 차단 정책에 걸릴 수 있으므로 실제 브라우저에서 확인 필요.

`EventSource` 예시 (이 기능의 모양, 예시 코드):

```ts
const es = new EventSource(`${API_URL}/admin/embeddings/stream`, { withCredentials: true });
es.addEventListener("progress", (e) => setProgress(JSON.parse(e.data)));
es.addEventListener("done", (e) => {
  toast.success("임베딩 완료");
  es.close(); // 중요: 닫지 않으면 서버가 끝내도 자동 재연결한다
});
es.onerror = () => { /* 재연결 시도 중이거나 영구 실패. readyState로 구분 */ };
```

### 3-3. 네트워크 덩어리(chunk)는 이벤트 경계가 아니다

`reader.read()`가 주는 한 덩어리는 이벤트 1개가 아니다. 이벤트 2개가 한 덩어리로 오기도 하고, 이벤트 하나가 두 덩어리로 쪼개져 오기도 한다. 그래서 **버퍼에 쌓고 `\n\n`으로 쪼갠 뒤, 마지막 미완성 조각은 버퍼에 남긴다.**

이 프로젝트의 FE가 정확히 이렇게 한다:

```ts
buffer += decoder.decode(value, { stream: true });
const chunks = buffer.split("\n\n");
buffer = chunks.pop() ?? "";   // 아직 완성 안 된 마지막 조각은 다음 read로
```

- 예시: 덩어리 1 = `data: {"a":1}\n\ndata: {"b"`, 덩어리 2 = `:2}\n\n`. 덩어리 1에서 완성된 건 1개, `data: {"b"`는 버퍼에 남고 덩어리 2가 오면 완성된다.
- `{ stream: true }`는 UTF-8 한글이 덩어리 경계에서 잘려도 깨지지 않게 한다.
- 이 프로젝트 파서는 `data:`만 처리한다(`event:`/`id:`/주석 미지원, `[DONE]`은 자체 규약). `event:` 이름을 쓰려면 파서를 확장하거나 `EventSource`를 쓴다.

### 3-4. 재연결, `Last-Event-ID`, 스냅샷 패턴

연결이 끊기면 `EventSource`는 `retry` 시간 뒤 자동 재연결하고, 마지막으로 받은 `id:`를 `Last-Event-ID` 요청 헤더로 보낸다. 하지만 서버가 놓친 이벤트를 다시 보내 주는 건 **서버가 구현해야** 한다.

임베딩 진행률에는 이벤트를 다 저장해 재전송하는 것보다 **"연결되면 현재 상태 스냅샷을 먼저 보낸다"**가 쉽다:

```
연결 → event: snapshot  data: {"done":4,"total":10,"items":[...]}
      → 이후 진행 이벤트
```

새로고침하거나 끊겼다 재연결해도 스냅샷 한 번이면 화면이 현재 상태로 맞춰진다. 단, 이를 위해 서버가 작업 상태를 연결과 별개로(메모리 또는 DB에) 들고 있어야 한다. 그렇지 않고 "연결 안에서 작업을 돌리면" 연결이 끊기는 순간 작업도 끊길 수 있다(4절 참고).

### 3-5. 운영 환경 함정

- **프록시 버퍼링**: nginx 같은 프록시가 응답을 모았다가 한꺼번에 주면 진행률이 끝에 몰려서 온다. 대응: 응답 헤더 `X-Accel-Buffering: no`, `Cache-Control: no-cache`. 압축(gzip) 미들웨어도 버퍼링을 일으킬 수 있으니 SSE 경로는 제외. Render·Vercel 앞단이 SSE를 버퍼링하는지는 **확인 필요**(실제 배포에서 curl로 확인).
- **유휴 타임아웃과 하트비트**: 일정 시간 데이터가 없으면 중간 장비가 연결을 끊을 수 있다. 15~30초마다 `: heartbeat\n\n` 주석을 보내 연결을 살린다. 구체적 타임아웃 값은 플랫폼마다 달라 **확인 필요**.
- **서버리스(Vercel) 함수 최대 실행 시간**: 함수에는 플랜별 최대 실행 시간이 있어 긴 SSE는 중간에 끊길 수 있다. 값은 플랜·설정에 따라 바뀌므로 **확인 필요**(Vercel 문서 기준). 이 기능에서 SSE 서버는 Render의 NestJS이고 Vercel은 FE 브라우저 코드만 돌리므로 직접 해당되지 않지만, FE가 Next.js 서버(Route Handler)를 거쳐 중계하게 만들면 해당된다. 중계하지 않는 것이 단순하다.
- **Render 무료 플랜**: 15분 무활동 시 슬립(깨어나는 첫 요청이 느림)은 이 프로젝트 문서에 이미 나온 제약이다. SSE 연결 자체의 유지 시간 제한, 배포·재시작 시 연결이 끊기는지 여부는 **확인 필요**. 재시작으로 끊길 수 있다고 가정하고 스냅샷 패턴을 쓰는 게 안전하다.
- 브라우저는 HTTP/1.1에서 한 도메인당 연결 6개 제한이 있어 SSE 탭이 여러 개면 영향이 있다(HTTP/2면 완화). 관리자 화면 하나에선 보통 문제 없음.

### 3-6. NestJS `@Sse()` + RxJS `Observable`

`inote-server`는 `@nestjs/common` ^11, `rxjs` ^7.8 (`package.json`). Nest는 `@Sse()` 핸들러가 `Observable<MessageEvent>`를 돌려주면 헤더 설정과 `data:` 포맷팅을 해 준다. `MessageEvent`는 `{ data, type?, id?, retry? }` 모양이고 `type`이 `event:` 줄이 된다 (Nest 공식 문서 SSE 절 기준. 세부 시그니처는 사용 전에 공식 문서로 재확인 권장).

```ts
@Sse("embeddings/stream")
@UseGuards(AuthGuard, AdminGuard)
stream(@Req() req: Request): Observable<MessageEvent> {
  const events$ = this.embedService.events$();          // Subject 기반 진행 이벤트(예시)
  const heartbeat$ = interval(20_000).pipe(map(() => ({ type: "ping", data: {} })));
  return merge(events$, heartbeat$).pipe(
    takeWhile((e) => e.type !== "done", true),          // done 이후 스트림 종료
  );
}
```

- 하트비트: `@Sse`의 MessageEvent는 주석 줄(`:`)을 직접 못 보내므로 위처럼 `ping` 이벤트로 대신하는 방식이 흔하다(주석을 직접 쓰려면 `@Res()`로 직접 쓰기. 확인 필요).
- **구독 정리**: 클라이언트가 끊으면 Nest가 Observable 구독을 해제(unsubscribe)한다. `Subject`를 `merge`/`pipe`로 연결했다면 해제 시 같이 정리되지만, `setInterval`·리스너를 직접 만들었다면 `new Observable(subscriber => { ...; return () => cleanup(); })`의 반환 함수에서 정리해야 메모리 누수가 없다.
- **작업과 스트림을 분리**: 임베딩 실행(POST)은 작업을 시작만 하고 바로 응답, 진행 상태는 서비스가 들고 있다가 SSE(GET)가 구독만 한다. 이래야 새로고침/끊김에도 작업이 계속되고 스냅샷을 보낼 수 있다.
- 가드: `@Sse()`도 일반 라우트라 `@UseGuards(AuthGuard, AdminGuard)`가 똑같이 적용된다. 단 `EventSource`는 쿠키만 보내므로(헤더 불가) 쿠키 세션 인증과 궁합이 맞다.

## 4. 이번 작업에 꼭 필요한 것 / 나중에

**꼭 필요한 것**
1. `Content-Type: text/event-stream`, `data:` + 빈 줄 = 이벤트 하나.
2. 클라이언트는 GET + 쿠키라 `EventSource`(`withCredentials`) 우선. 끝나면 `es.close()`.
3. 크로스 사이트 쿠키·CORS(`credentials`, 구체적 origin) 설정.
4. NestJS `@Sse()`가 `Observable<MessageEvent>`를 반환, 끊기면 구독 해제되므로 정리 코드 확인.
5. 하트비트 + `X-Accel-Buffering: no`, 그리고 연결 직후 스냅샷 한 번.
6. 작업 시작(POST)과 진행 구독(GET)을 분리.

**나중에**: `Last-Event-ID` 기반 이벤트 재전송, 여러 인스턴스일 때 Redis pub/sub, HTTP/2 연결 수 제한 세부, `fetch` 기반 이벤트 파서 직접 구현, 웹소켓.

## 5. 흔한 실수

1. **`es.close()`를 안 한다**: 서버가 응답을 끝내면 `EventSource`는 에러로 보고 계속 재연결해서 작업이 다시 시작되거나 이벤트가 반복된다. `done` 이벤트에서 닫는다.
2. **`\n\n`을 빼먹는다**: `data: ...\n`만 보내면 이벤트가 끝나지 않아 클라이언트에 안 도착한다.
3. **chunk = 이벤트라고 가정한다**: `JSON.parse`가 가끔 터진다. 버퍼링 필수(3-3).
4. **프록시/압축이 버퍼링해서 "로컬에선 되는데 배포에서 끝에 몰려 온다"**: 배포 환경에서 curl로 확인한다.
5. **쿠키/CORS**: `withCredentials`를 안 주거나 CORS에 `*`를 쓰면 로그인 정보가 안 가서 401이 난다. `EventSource` 에러 객체는 상태 코드를 안 알려주므로 DevTools Network 탭에서 확인한다.
6. **연결 안에서 작업을 돌린다**: 끊기면 작업도 같이 끊기거나 재연결 때 중복 실행된다.

## 6. 코드에서 보기

이 프로젝트는 이미 SSE **형식**으로 LLM 응답을 스트리밍한다(서버 → FE). 임베딩용 SSE는 아직 없다(`inote-server/src`에 `@Sse`/`text/event-stream` 사용 없음).

- `inote-ai/app/routers/chat.py:140` `_sse()`: `data: {json}\n\n` 한 줄 포맷터.
- `inote-ai/app/routers/chat.py:179` `chat_stream`: `POST /chat/stream`, 헤더는 `:244` 부근 `StreamingResponse(media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})`. 이 프로젝트엔 `X-Accel-Buffering`이 아직 없다.
- `inote-ai/app/routers/posts_chat.py:116` `_sse` 형태, `:123` `posts_chat_stream`, `:167` 끝 신호 `data: [DONE]\n\n`, `:175-179` `StreamingResponse`. `posts-chat/stream`을 부르는 FE 코드는 `apps/web/src`에서 찾지 못했다.
- FE 읽는 쪽(`fetch` + `ReadableStream`, 버퍼 + `\n\n` 분할): `apps/web/src/widgets/chat-dock/model/useChatMessages.ts:222`(fetch) `:244-262`(reader 루프), `useReadingChatMessages.ts:47`(fetch) `:64-80`.
- 주의: 이 FE는 POST 본문이 필요해서 `EventSource` 대신 `fetch`를 쓴다. 임베딩 진행률은 GET이라 다른 선택이 가능하다.
- `inote-ai/render.yaml`은 Render 배포 설정이다. 호스팅 현황은 문서마다 달라 보이니 `README.md`의 "링크"를 기준으로 본다.

5분 확인: `chat.py`의 `_sse`와 `useChatMessages.ts:244-262`를 나란히 읽고, "서버가 보낸 `\n\n` = FE가 `split("\n\n")`하는 지점"임을 눈으로 연결해 본다. 임베딩 SSE를 만들 때 같은 규약(`data:` JSON + 빈 줄)을 따르면 된다.

## 7. 테스트하는 법

- 터미널: `curl -N -H "Cookie: ..." https://서버/경로` (`-N`은 curl의 출력 버퍼링을 끈다. 안 쓰면 모여서 보인다. 쿠키 값은 어디에도 기록하지 않는다).
- 브라우저 DevTools: Network 탭에서 요청 선택 → `EventStream`(Chrome은 EventStream 탭) 으로 이벤트별 확인. 요청이 pending 상태로 남아 있는 것이 정상.
- 서버 흉내: `while true; do printf 'data: {"n":1}\n\n'; sleep 1; done | nc -l 8080` 같은 방식은 HTTP 헤더가 없어 번거로우니, 간단한 Node/Nest 엔드포인트로 직접 확인하는 편이 낫다.

## 8. 스스로 확인

**Q1.** 덩어리 1 = `data: {"p":10}\n\ndata: {"p":2`, 덩어리 2 = `0}\n\n`. 이 프로젝트 방식(`split("\n\n")` 후 마지막 조각 보존)으로 처리하면 각 덩어리 후 몇 개의 이벤트가 처리되고 버퍼엔 무엇이 남나?

<details><summary>답</summary>
덩어리 1 처리 후: buffer = `data: {"p":10}\n\ndata: {"p":2` 를 `\n\n`으로 쪼개면 [`data: {"p":10}`, `data: {"p":2`]. 마지막을 buffer에 남기므로 처리 1개(p=10), 버퍼 = `data: {"p":2`. 덩어리 2 후: 버퍼 `data: {"p":20}\n\n` 를 쪼개면 [`data: {"p":20}`, ``]. 처리 1개(p=20), 버퍼는 빈 문자열.
</details>

**Q2.** 진행 이벤트가 총 10개 글 중 4개 완료 시점인데 사용자가 새로고침했다. `EventSource`가 새로 연결되면 진행 막대가 0%로 돌아가지 않게 하려면 서버는 무엇을 보내야 하나?

<details><summary>답</summary>
연결 직후 현재 상태 스냅샷(예: done=4, total=10 → 40%, 글별 상태)을 먼저 한 번 보낸다. 이를 위해 작업 상태가 SSE 연결과 별개로 서버에 저장돼 있어야 한다.
</details>

**Q3.** `done` 이벤트를 받았는데 `es.close()`를 안 하면 무슨 일이 생기나?

<details><summary>답</summary>
서버가 응답을 끝내면 EventSource는 연결이 끊긴 것으로 보고 `retry` 시간 뒤 자동 재연결한다. 그 결과 스냅샷이 다시 오거나(서버 구현에 따라) 반복 이벤트, 중복 토스트가 생길 수 있다.
</details>

## 9. 더 깊이 공부할 때 쓰는 프롬프트 (선택)

```
나는 JS/TS, React/Next.js, NestJS로 서비스를 만들어 본 개발자야(Spring도 조금 알아). SSE를 직접 구현해 본 적은 없어.
프로젝트: FE는 Next.js(Vercel), BE는 NestJS 11(Render 무료 플랜), 인증은 크로스 사이트 쿠키 세션. 관리자 페이지에서
"임베딩 실행"을 누르면 BE가 SSE로 진행률·글별 상태·완료 이벤트를 보내고 FE가 진행 막대와 토스트를 띄우려 해.
한 번에 한 개념씩, 숫자로 계산해 볼 수 있는 예시와 마지막에 퀴즈 2개를 줘.
순서: (1) EventSource와 fetch 스트림 차이 (2) NestJS @Sse와 RxJS 구독 정리 (3) 프록시 버퍼링과 하트비트.
확실하지 않거나 플랫폼 정책이 바뀔 수 있는 부분은 추측하지 말고 "확실하지 않다"고 말해 줘.
```
