# Next.js App Router 에러 처리 — 학습 노트

> 2026-09-04, inote-blog에 404/에러 페이지를 실제로 만들면서 정리한 문서.
> "왜 파일 이름이 저래야만 동작하는지" 위주로 적었다.

---

## 이번에 만든 파일 4개

| 파일 | 언제 실행되나 | 레이아웃(Nav) 유지되나 |
|---|---|---|
| `src/app/not-found.tsx` | 존재하지 않는 URL 전체, 또는 `notFound()`를 호출했는데 더 가까운 `not-found.tsx`가 없을 때 | ✅ (루트 레이아웃 하위라서) |
| `src/app/posts/[id]/not-found.tsx` | `posts/[id]` 세그먼트 안에서 `notFound()`를 호출했을 때 (더 가까우므로 루트보다 우선) | ✅ |
| `src/app/error.tsx` | 렌더링 중 컴포넌트가 에러를 던졌을 때 (런타임 에러) | ✅ |
| `src/app/global-error.tsx` | **루트 레이아웃 자체**가 에러를 던졌을 때 (최후의 보루) | ❌ (직접 `<html>`/`<body>`를 그림) |

---

## 1. `notFound()` / `not-found.tsx` — "이 데이터가 없어요"

Next.js는 라우트 폴더 트리를 따라가면서 `not-found.tsx`를 찾는다. **가장 가까운 것부터** 적용된다.

```
src/app/
├── not-found.tsx              ← 전역 기본값
└── posts/[id]/
    ├── page.tsx               ← 여기서 notFound() 호출
    └── not-found.tsx          ← 이게 있으면 이게 우선 (전역 것보다 가까움)
```

`PostDetailPage`(`src/views/post-detail/ui/PostDetailPage.tsx`)에서 BE가 404를 주면 이렇게 처리한다:

```tsx
try {
  post = await api.get<Post>(`/blog/posts/${id}`, { cache: "no-store" });
} catch (e) {
  if (e instanceof ApiError && e.status === 404) notFound();
  throw e; // 404가 아닌 진짜 에러는 그대로 던져서 error.tsx가 잡게 한다
}
```

`notFound()`를 호출하면 Next.js는 **HTTP 상태 코드를 실제로 404로 응답**하면서, 그 세그먼트에 있는 `not-found.tsx`를 렌더링한다. 중요한 건 **루트 레이아웃(`layout.tsx`)은 그대로 유지**된다는 것 — `not-found.tsx`는 `layout.tsx`의 `children` 자리만 대체하기 때문에, Nav 같은 공통 UI는 안 사라진다.

이걸 이용해서 이번에 두 가지를 구분했다:
- **글이 없을 때** (`posts/[id]/not-found.tsx`): 기사(article) 레이아웃 폭을 그대로 유지하고 "존재하지 않는 글입니다"만 보여줌 — 그 세그먼트 전용 파일이 더 가깝기 때문에 이게 우선 적용됨.
- **완전히 없는 URL** (`/asdf1234` 같은 것): 세그먼트 전용 `not-found.tsx`가 없으니 루트 것으로 fallback.

## 2. `error.tsx` — "코드가 예상치 못하게 터졌어요"

`notFound()`는 "데이터가 없다"는 **정상적인 케이스**를 처리하는 것이고, `error.tsx`는 **버그·예외**(네트워크 에러, `undefined.foo()` 같은 런타임 에러)를 처리하는 것이다. 역할이 다르다.

```tsx
"use client"; // 필수! 아래 이유 참고

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  ...
}
```

**왜 반드시 `"use client"`여야 하나?**
React의 에러 바운더리는 클래스 컴포넌트의 `componentDidCatch`/`getDerivedStateFromError` 기능으로만 만들 수 있다 (함수형 컴포넌트엔 이 기능이 없음). Next.js는 `error.tsx`를 내부적으로 이 클래스 컴포넌트로 감싸서 에러 바운더리를 만들어주는데, 이 매커니즘 자체가 브라우저에서 동작하는 React 기능이라 **서버 컴포넌트로는 만들 수 없다.** 그래서 파일 맨 위에 `"use client"`가 강제된다.

**`reset()`은 뭘 하나?**
에러가 난 세그먼트를 다시 렌더링 시도한다. "다시 시도" 버튼에 연결해두면, 예를 들어 일시적인 네트워크 에러였을 경우 페이지 전체를 새로고침하지 않고도 복구를 시도할 수 있다.

**어떤 에러를 잡나?**
같은 세그먼트 트리 안에서 렌더링 중(서버 컴포넌트 렌더링 포함) 던져진 에러를 잡는다. 이벤트 핸들러(`onClick` 안에서 던진 에러) 같은 건 안 잡힌다 — 그건 그냥 일반 JS try/catch로 처리해야 한다.

## 3. `global-error.tsx` — 최후의 보루

`error.tsx`는 `layout.tsx`의 `children`만 대체하기 때문에, **`layout.tsx` 자기 자신이 에러를 던지면** `error.tsx`로도 못 잡는다. 이럴 때만 `global-error.tsx`가 실행된다.

이건 루트 레이아웃 전체를 대체하는 것이므로, `<html>`과 `<body>`까지 직접 그려야 한다:

```tsx
"use client";

export default function GlobalError({ reset }: { ...}) {
  return (
    <html lang="ko">
      <body>...</body>
    </html>
  );
}
```

실제로 발동할 일은 거의 없다(레이아웃 자체가 웬만하면 안 깨짐). 그래도 Next.js 공식 문서가 권장하는 표준 파일이라 만들어둠.

## 4. 요약 — 언제 뭘 쓰나

- **데이터가 없음** (글이 삭제됨, 잘못된 id) → `notFound()` 호출 + `not-found.tsx`
- **코드가 예외를 던짐** (버그, API가 500을 줌) → 자동으로 `error.tsx`가 잡음
- **레이아웃 자체가 깨짐** → `global-error.tsx` (거의 안 씀, 안전망 개념)
- **일반 React(Next.js 아닌 순수 React 앱)**라면 이런 파일 컨벤션이 없어서, 직접 `ErrorBoundary` 클래스 컴포넌트를 만들어서 감싸야 한다. Next.js는 이걸 파일 이름 규칙으로 자동화해준 것뿐 — 원리는 동일하게 React 에러 바운더리다.

## 5. 테스트 방법 (재현 방법)

- **`not-found.tsx` (전역)**: 존재하지 않는 아무 URL로 접속 (`/asdf1234`)
- **`posts/[id]/not-found.tsx`**: 존재하지 않는 글 id로 접속 (`/posts/does-not-exist`)
- **`error.tsx`**: 아무 `page.tsx`에서 렌더링 중 `throw new Error(...)`를 임시로 넣고 접속해보면 됨 (개발 모드에선 화면 하단에 Next.js 자체 디버그 오버레이도 같이 뜨는데, 그건 개발용이고 프로덕션 빌드에선 안 보임 — `error.tsx` 화면만 보임)
