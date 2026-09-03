# FSD (Feature-Sliced Design) 적용 근거

> "폴더명만 FSD처럼 맞추고 레이어 의존성 방향은 안 지켜졌다"는 이전 프로젝트 피드백을 반영해서,
> 이번엔 구조뿐 아니라 **의존성 방향을 실제로 강제하는 린트**까지 같이 넣었다.

## 레이어 구성

```
app -> pages -> widgets -> features -> entities -> shared
```

상위 레이어는 하위 레이어를 import할 수 있지만, 그 반대는 금지. `entities`끼리는 서로 참조 가능한
예외를 둠 (예: `post`가 `category` 타입을 참조) — FSD에서 흔히 허용되는 패턴.

| 레이어 | 폴더 | 우리 프로젝트에서의 내용 |
|---|---|---|
| `app` | `src/app/` | Next.js App Router 라우팅 전용. 각 `page.tsx`는 `pages` 레이어를 불러다 렌더링만 하는 껍데기 |
| `pages` | `src/views/` | 화면 단위 조합. `home`, `my-posts`, `write`, `categories`, `profile`, `login`, `dev-guide`, `post-detail` |
| `widgets` | `src/widgets/` | 여러 곳에서 재사용되는 큰 UI 블록. `nav`, `post-list`, `mandalart-grid` |
| `features` | `src/features/` | 사용자 상호작용 단위. `filter-posts-by-category`, `write-post`, `manage-categories`, `edit-profile` |
| `entities` | `src/entities/` | 비즈니스 엔티티(타입+데이터). `post`, `category` |
| `shared` | `src/shared/` | 비즈니스 로직 없는 재사용 코드. `ui`(shadcn 컴포넌트, Tiptap 에디터), `lib`(utils) |

## 왜 `pages` 폴더 이름을 `src/views`로 바꿨는가

Next.js는 프로젝트 루트에 `src/pages/`가 있으면 **레거시 Pages Router**로 자동 인식한다. FSD의
`pages` 레이어를 문자 그대로 `src/pages/`에 두면 App Router(`src/app/`)와 라우팅이 충돌해서 빌드가
깨진다 (`App Router and Pages Router both match path` 에러 — 실제로 처음 시도했을 때 겪음).
그래서 폴더명만 `src/views`로 바꾸고, FSD 개념상 레이어 이름은 그대로 "pages"로 취급한다
(ESLint 설정의 `type: "pages", pattern: "src/views/*"`).

## 의존성 방향을 실제로 강제하는 방법

`eslint-plugin-boundaries`(`eslint.config.mjs`)로 레이어 간 import 규칙을 정의:

```js
{ from: "app", allow: ["app", "pages", "widgets", "features", "entities", "shared"] },
{ from: "pages", allow: ["widgets", "features", "entities", "shared"] },
{ from: "widgets", allow: ["features", "entities", "shared"] },
{ from: "features", allow: ["entities", "shared"] },
{ from: "entities", allow: ["entities", "shared"] },
{ from: "shared", allow: ["shared"] },
```

`default: "disallow"`이므로 규칙에 없는 조합(예: `entities`가 `features`를 import)은 전부
에러. 실제로 `entities/post`에 `features/write-post`를 import하는 코드를 넣어서
`pnpm lint`가 `boundaries/dependencies` 에러로 잡아내는 것까지 확인함 (2026-09-03).

## 왜 노션 스타일 에디터(Tiptap)가 `shared/ui`에 있는가

에디터는 `content`/`onChange`만 받고 `Post`를 전혀 모른다 — shadcn `Button`/`Sheet`와 같은 성격의
"비즈니스 로직 없는 재사용 UI"라서 `shared/ui/editor`에 둠. `features/write-post`가 이걸 가져다
쓰는 구조(`features -> shared`)라서 레이어 방향도 문제없음. 만약 에디터에 "이 글의 카테고리를 안다"
같은 Post 관련 로직이 들어가기 시작하면 그때는 `widgets`나 `features` 쪽으로 옮기는 게 맞다.

## 한계 / 다음에 볼 것

- `boundaries/no-private`(슬라이스 내부 파일에 직접 접근 금지, `index.ts`를 통해서만 import)는
  아직 안 넣음 — v7에서 deprecated라 `boundaries/dependencies`의 selector로 다시 구성해야 함
- 지금은 화면이 다 목업 데이터라 `features`가 얇음 — 실제 API 연동 시작하면 각 feature에
  `model/`(상태·로직)이 생기면서 더 FSD다워질 것
