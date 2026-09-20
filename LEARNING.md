# 프론트엔드(inote 웹) 테스트 학습 문서

> `inote-server`의 `LEARNING.md`와 같은 목적 — 세션 간 맥락 유지 + 실제로 뭘 왜 이렇게
> 세팅했는지 나중에 다시 봐도 이해할 수 있게 정리하는 문서.
> 2026-09-20 — FE 테스트 인프라(Vitest + React Testing Library + Playwright) 처음 세팅하며 작성.

---

## 1. 테스트 종류 3가지 (FE 기준)

| 종류 | 무엇을 테스트하나 | 이 프로젝트에서 쓰는 도구 | 속도 |
|------|------------------|--------------------------|------|
| **단위 테스트 (Unit)** | 순수 함수, 로직 (컴포넌트 X) | Vitest | 빠름 |
| **컴포넌트 테스트 (Component)** | UI 컴포넌트 렌더링/클릭 등 동작 | Vitest + React Testing Library | 중간 |
| **E2E 테스트 (End-to-End)** | 실제 브라우저에서 로그인 → 화면 이동 등 전체 흐름 | Playwright | 느림 |

셋의 차이를 한 문장으로: **단위 테스트는 "함수가 맞게 계산하나", 컴포넌트 테스트는 "화면
조각 하나가 맞게 그려지고 반응하나", E2E는 "사용자가 실제로 겪는 흐름이 끝까지 되나"**를 본다.

---

## 2. 왜 Jest가 아니라 Vitest인가

`inote-server`(BE)는 Jest를 쓰는데 `inote`(FE)는 Vitest를 선택했다. 둘 다 "테스트 프레임워크"
로 하는 역할은 같지만(describe/it/expect 문법도 거의 동일), 내부 동작 방식이 다르다.

- **Jest**: Babel/ts-jest로 파일을 미리 변환(transform)한 뒤 Node.js의 CommonJS 방식으로 실행.
  Node.js 생태계(백엔드)에 강함.
- **Vitest**: Next.js/React 프로젝트가 이미 쓰고 있는 번들러인 **Vite**를 그대로 재사용해서
  테스트를 돌림. 그래서 Vite 설정(경로 별칭 `@/*` 등)을 거의 그대로 재사용할 수 있고, ESM
  라이브러리를 불러올 때도 Jest처럼 별도 설정 없이 잘 동작한다.

  > 참고: `inote-server`의 [`LEARNING.md` Chapter 26](../inote-server/LEARNING.md)에서
  > Jest가 순수 ESM 라이브러리(`better-auth`)를 못 불러와서 한참 삽질한 이야기가 나오는데,
  > Vitest는 애초에 ESM을 기본 전제로 만들어져서 그런 문제가 훨씬 적다. FE에서 Vitest를
  > 고른 이유 중 하나.

세팅한 파일:
- [`vitest.config.mts`](apps/web/vitest.config.mts) — jsdom 환경, `@/*` 경로 별칭, setup 파일 지정
- [`vitest.setup.ts`](apps/web/vitest.setup.ts) — `@testing-library/jest-dom` 매처(`toBeInTheDocument` 등) 등록

---

## 3. 단위 테스트 — 순수 함수만 떼어서 테스트

예시: [`src/shared/lib/validation.test.ts`](apps/web/src/shared/lib/validation.test.ts)

```typescript
import { EMAIL_REGEX } from "./validation";

it("유효한 이메일 형식을 통과시킨다", () => {
  expect(EMAIL_REGEX.test("test@example.com")).toBe(true);
});
```

**핵심**: 컴포넌트도, 브라우저도, API도 필요 없다. 입력을 넣고 출력만 확인하는 가장 단순하고
빠른 테스트. `EMAIL_REGEX`, `MIN_PASSWORD_LENGTH` 같은 검증 로직이 딱 이 케이스.

---

## 4. 컴포넌트 테스트 — React Testing Library

예시: [`src/shared/ui/badge.test.tsx`](apps/web/src/shared/ui/badge.test.tsx)

```typescript
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

it("children 텍스트를 렌더링한다", () => {
  render(<Badge>관리자</Badge>);
  expect(screen.getByText("관리자")).toBeInTheDocument();
});
```

**React Testing Library의 철학** — "구현 디테일이 아니라 사용자가 보는 방식으로 테스트하라."

```
❌ 나쁜 예: wrapper.find('.badge-secondary').exists() 같은 내부 클래스/구조 확인
✅ 좋은 예: screen.getByText('관리자'), screen.getByRole('button', { name: '로그인' })
```

`getByText`/`getByRole`은 실제 사용자(또는 스크린 리더)가 화면에서 "찾는" 방식과 똑같이
엘리먼트를 찾는다. 그래서 나중에 컴포넌트 내부 구현(클래스명, DOM 구조)이 바뀌어도, 사용자
눈에 보이는 동작이 그대로면 테스트가 안 깨진다 — 리팩터링에 강한 테스트가 된다.

실행은 jsdom(가상 브라우저 DOM, 실제 Chrome 없이 Node.js 안에서 흉내)에서 되기 때문에 빠르다.

---

## 5. E2E 테스트 — Playwright로 실제 브라우저 조작

예시: [`e2e/login.spec.ts`](apps/web/e2e/login.spec.ts)

```typescript
test("로그인 페이지에서 테스트 계정 버튼을 누르면 즉시 로그인된다", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "테스트 계정으로 로그인" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "로그인" })).not.toBeVisible();
});
```

**컴포넌트 테스트와 뭐가 다른가**: jsdom(가짜 DOM)이 아니라 **진짜 Chromium 브라우저**를 띄워서
실제 페이지 이동, 실제 네트워크 요청(`inote-server`에 실제로 로그인 요청)까지 전부 실행한다.
그래서 "컴포넌트 하나가 잘 그려지나"가 아니라 "이 기능이 실제로 끝까지 되나"를 검증할 수 있다 —
대신 느리고, **`inote-server`(BE, `:3200`)가 로컬에서 같이 떠 있어야만 통과**한다.

`playwright.config.ts`의 `webServer` 옵션이 FE 개발 서버(`pnpm dev`, `:3011`)는 자동으로
띄워주지만, BE는 별도 프로세스라 자동으로 못 띄운다 — 그래서 e2e 테스트 돌리기 전엔 항상
`inote-server`가 실행 중인지 먼저 확인해야 한다.

---

## 6. 어떤 상황에 어떤 테스트를 쓰나 (이 프로젝트 기준)

| 상황 | 테스트 종류 | 이유 |
|------|-----------|------|
| 이메일 정규식, 비밀번호 길이 검증 같은 순수 로직 | 단위 테스트 | 컴포넌트/브라우저 불필요, 제일 빠르고 싸다 |
| 뱃지, 버튼처럼 독립적인 UI 조각의 렌더링/props 분기 | 컴포넌트 테스트 | 실제 브라우저 없이도 충분히 검증 가능 |
| 로그인, 회원가입처럼 여러 페이지/API를 거치는 핵심 시나리오 | E2E | 실제로 안 깨졌는지는 끝까지 붙여봐야 확신 가능 |
| 모든 컴포넌트, 모든 페이지 | ❌ 다 커버 안 함 | 처음부터 100% 커버리지 목표하면 속도만 느려짐. "이게 깨지면 서비스가 안 된다" 싶은 것부터 |

---

## 7. 실행 명령어

```bash
cd apps/web

pnpm test          # 단위 + 컴포넌트 테스트 1회 실행 (Vitest)
pnpm test:watch    # 파일 변경 감지하며 반복 실행
pnpm test:e2e      # E2E 테스트 실행 (Playwright) — 실행 전 inote-server가 떠 있어야 함
```

---

## 참고 자료

| 주제 | 링크 |
|------|------|
| Vitest 공식 문서 | https://vitest.dev |
| React Testing Library | https://testing-library.com/docs/react-testing-library/intro |
| Testing Library — 쿼리 우선순위 가이드 | https://testing-library.com/docs/queries/about/#priority |
| Playwright 공식 문서 | https://playwright.dev/docs/intro |
| jest-dom 매처 목록 | https://github.com/testing-library/jest-dom#custom-matchers |
