# 카테고리를 "이름"이 아니라 "id"로 가리키기 — 계획서

> 2026-10-16 작성. **계약(API)·마이그레이션 계획은 사용자 승인 전 초안**이다. 승인되기 전에는 코드에 손대지 않는다.
> 진행 순서는 `CLAUDE.md`의 원칙대로 **계약 → FE → BE(테스트는 사용자가 작성) → 통합**.

## 1. 문제

- 같은 이름의 카테고리를 **다른 부모 아래에 두지 못한다.** (예: `이직 > 그룹바이`가 있으면 다른 부모에 `그룹바이`를 추가할 수 없음)
- 이미 같은 이름이 두 곳에 있으면(예: `학습 > AI`, `사이드프로젝트 기록 > AI`) **둘이 같은 것으로 취급**된다 — 글 개수가 같이 나오고(둘 다 `AI (4)`), 하나를 고르면 둘 다 선택 강조된다.

## 2. 원인

- `Post.category`가 **카테고리 이름 문자열**이다(`prisma/schema.prisma`의 `Post.category String`). 글은 카테고리의 id를 모르고 이름만 안다.
- 카테고리 트리(`PostCategory`)에는 id·`parentId`가 있지만, 글과의 연결·개수·필터·선택 강조가 전부 **이름을 키로** 돈다.
  - BE `blog.service.ts`: `categoryCounts`(이름 → 개수), `categoryFilter`(이름으로 하위 이름 모으기), `buildCategoryPath`(이름으로 트리에서 찾음 — 같은 이름이 여럿이면 첫 번째)
  - FE: `categoryCounts[node.name]`, `checkCategoryName`/`checkNewCategoryName`(내 카테고리 **전체** 사이 이름 중복 금지), 선택 상태·필터·글 이동·글쓰기 화면이 이름 기준
- 그래서 FE가 이름 중복을 **막아 둔 것**이다(합쳐지는 문제를 피하려고). 중복 검사만 풀면 합쳐지는 문제가 그대로 터진다 → 근본 원인인 "이름 키"를 고쳐야 한다.

## 3. 결정 (2026-10-16 사용자 승인)

1. **글이 카테고리 id를 갖게 한다.** `Post.categoryId`(nullable FK → `PostCategory.id`)를 추가하고, 개수·필터·선택·경로를 전부 id 기준으로 바꾼다. (택하지 않은 안: 이름 중복 금지만 "같은 부모 아래"로 완화 — 글이 여전히 이름으로 묶여 AI 문제가 그대로 남음)
2. **이미 같은 이름이 두 곳 이상인 카테고리의 기존 글은 사용자가 직접 지정한다.** 자동으로 어느 쪽인지 알 수 없다. (택하지 않은 안: 첫 번째에 몰아 연결)
3. 이름 중복 규칙은 **"같은 부모 아래 형제끼리만 금지"**로 바꾼다.

## 4. 데이터 모델 (제안 — 승인 필요)

```
Post
  category     String            // 유지(표시용 이름 사본). 쓰기 때 서버가 categoryId의 이름으로 채운다
  categoryId   String?           // 신규. PostCategory.id, onDelete: SetNull
PostCategory
  (변경 없음) — 이름 중복은 같은 부모 아래만 금지
```

- `PostCategory`의 `@@unique([userId, parentId, name])`는 **쓰지 않는다** — PostgreSQL은 `parentId`가 NULL인 최상위끼리는 서로 다른 값으로 취급해서 최상위 중복을 못 막는다. **서비스 코드에서 검사**(같은 `userId`·같은 `parentId` 안에 같은 이름이 있으면 409)하고, 필요하면 최상위용 부분 유니크 인덱스를 따로 둔다. 
- `Post.category`(이름)는 **당장 지우지 않는다** — 이전 기간에 FE·BE가 함께 바뀌어야 하고, 되돌리기 쉽게 두려는 것. 모든 글이 id를 갖고 FE가 id만 쓰게 된 뒤 별도 단계로 정리한다.

## 5. API 계약 변경 (제안 — 승인 필요)

| 대상 | 지금 | 바꾼 뒤 |
|---|---|---|
| 글 응답(`Post`) | `category: string` | `category: string`(이름 사본) **+ `categoryId: string \| null`** |
| 글 작성·수정 (`POST/PATCH /blog/posts`) | `category: string`(이름) | **`categoryId: string`**(내 카테고리의 id, 아니면 404/400). 서버가 `category`(이름)를 채운다 |
| 글 목록 필터 (`GET /blog/posts?category=이름`) | 이름 → 이름이 같은 노드와 그 하위 **이름들**로 `category IN (...)` | **`?categoryId=id`** → 그 노드와 **하위 노드 id들**로 `categoryId IN (...)` |
| 개수 (`categoryCounts`) | `{ [이름]: 개수 }` | **`{ [categoryId]: 개수 }`** — 그 카테고리 직속만. `categoryId`가 null인 글은 **`"unassigned"` 키**로 센다(`UNASSIGNED_CATEGORY_KEY`) |
| 글 목록·개요 응답의 글 (`outline` 등) | `category: string` | `category`(이름 사본) **+ `categoryId: string \| null`** — `GET /blog/posts/outline`, `/outline/user/:id`, `/mine/outline`, `/mine`, `/` 목록 모두 |
| 목록 주소(FE) | `/my-posts?category=이름`, `/users/:id?category=이름` | **`?categoryId=id`** — 예전 `?category=이름` 링크·북마크는 더는 필터가 되지 않고 전체로 보인다 *(FE 단계에서 정함)* |
| 글 경로 (`categoryPath`) | 이름 문자열 배열 `string[]`(이름으로 트리를 찾아 올라감) | **`{ id, name }[]`** — 최상위부터 이 글의 카테고리까지. FE는 경로 링크를 id로 건다. `categoryId`로 올라가서 만들므로 같은 이름이 여럿이어도 정확 *(FE 단계에서 정함)* |
| 카테고리 추가 (`POST /categories`) | 이름 중복 검사 없음(FE만 막음) | **같은 부모 아래 같은 이름이면 409** |
| 공개 카테고리 요약 (`publicCategorySummary`) | 이름 기준 | id 기준 |
| 글 이동(`PATCH` 글의 카테고리) | 이름 | id |

- **전환 기간**: BE는 한동안 `category`(이름)와 `categoryId`를 **둘 다 받는다**(`categoryId`가 오면 우선). FE를 id로 옮긴 뒤 이름 입력을 끈다.
- `categoryId`가 null인 글(아직 지정 안 한 글)은 **"분류 필요"**로 묶어 보여준다 — 기존 글 이동 기능(`move-posts`)으로 사용자가 지정한다.

## 6. 마이그레이션·백필 (⚠️ 운영 DB — 가장 조심)

- `inote-server`는 **로컬과 운영이 같은 DB**를 쓴다. 규칙: **`prisma migrate reset`·`db push` 금지, 추가만 하는 마이그레이션**(`20261002120000_add_post_last_edited_at`처럼). 이번엔 `ALTER TABLE "Post" ADD COLUMN "categoryId" TEXT` + FK + 인덱스만 한다(삭제·변경 없음).
- **백필 스크립트**(`scripts/`, 재실행해도 안전하게): 각 글에 대해 **작성자의 `PostCategory` 중 `name === post.category`인 것이 정확히 하나**면 `categoryId`를 채운다. 0개 또는 2개 이상이면 건드리지 않고 목록으로 출력한다(`dry-run`이 기본, `--apply`로만 실제 반영).
- 2개 이상인 글(예: `AI`)은 FE의 글 이동으로 사용자가 직접 지정한다.
- 백필 전에 운영 DB의 대상 건수를 먼저 센다(읽기 전용 쿼리).

## 7. 단계 (각 단계 끝에 멈추고 확인)

1. **계약 승인** ← 지금. 이 문서의 4·5·6절.
2. **FE**: 글·카테고리 타입에 `categoryId`, 개수·필터·선택·글쓰기·글 이동을 id 기준으로, 이름 중복 규칙을 "형제끼리"로, "분류 필요" 표시. (MSW/목 데이터 또는 FE 단위 테스트로 먼저)
3. **BE**: 마이그레이션, 서비스(작성·수정·필터·개수·경로·중복 검사), 백필 스크립트. **테스트는 사용자가 작성**(`CLAUDE.md` 원칙), 구현은 그 테스트를 통과시키는 방식.
4. **통합**: 로컬에서 백필 dry-run → 사용자가 모호한 글 지정 → 운영 반영 순서 확인.
5. **정리**: 모든 글이 id를 갖고 FE가 이름을 안 쓰면 이름 입력·`category` 이름 의존 코드 제거(별도 승인).

## 8. 열린 질문

- 카테고리를 **삭제**할 때 그 카테고리·하위의 글은? (지금 삭제 API가 이 레포에 없다 — 만들 때 `categoryId` SetNull로 "분류 필요"가 되게 할지)
- 이름 **수정**(`rename`, BE는 아직 미구현 TODO)은 글의 `category`(이름 사본)도 갱신해야 한다 — id 기준이면 수정 시 `Post.category` 사본만 일괄 갱신하면 됨.
- 공개 페이지(다른 사람이 보는 글 목록)의 카테고리 요약도 id 기준으로 바꾼다 — 비공개 글만 있는 카테고리 숨김 규칙은 그대로.

## 9. FE 단계 결과 (2026-10-16, 브랜치 `feat/category-id`)

계약 5절대로 FE를 id 기준으로 바꿨다(아직 BE가 없어 **운영에 머지하면 안 된다** — BE가 `categoryId`·`categoryCounts`(id 키)·`categoryPath`(`{id,name}[]`)를 내려주기 전에는 화면이 맞지 않는다).

- **타입**: `Post`·`PostOutlineItem`·`MyPostOutlineItem`에 `categoryId: string | null`, `categoryPath?: { id, name }[]`. `categoryCounts`는 id 키, 아직 지정 안 된 글은 `"unassigned"`.
- **개수·선택·필터**: `rollupCategoryCounts`, `CategoryFilter`, `CategoryManager`, `buildUserCategoryFilter`가 전부 id 키. 같은 이름이 다른 부모 아래 있어도 따로 센다.
- **주소**: `?categoryId=`(나의 글·작성자 목록·글 검색 폼·페이지네이션 유지).
- **이름 중복 규칙**: `checkNewCategoryName(list, raw, parentId)` / `checkCategoryName` — **같은 부모 아래 형제끼리만** 금지.
- **글 쓰기**: 저장·임시저장이 `categoryId`를 보낸다(고르지 않았으면 키를 뺌). 카테고리를 아직 못 정한 옛 글은 출간 화면에 "카테고리를 선택하세요"가 뜬다.
- **글 이동**: `PATCH /blog/posts/:id`에 `{ categoryId }`만 보낸다. 카테고리가 지정되지 않은 글(같은 이름이 두 곳이라 자동 연결 못 한 글)은 폴더 모음 "목록에 없는 카테고리"에 이름별로 모이고, **진짜 폴더로 끌어다 놓아 지정**한다(`from`이 null).
- **글 상세 경로(breadcrumb)**: 링크를 id로 건다. id가 없는 글은 글자만.
- **이름 변경(rename)**: 글의 `category`(이름 사본)만 그 카테고리 id의 글에서 갱신한다. 개수 맵은 id 키라 그대로.
- **같이 고친 것**: `PostList` 카드 배지가 경로를 `join`하던 걸 이름만 이어 붙이게 수정(그대로 두면 `[object Object]`가 나온다), 좁은 화면 메뉴(`NavMobile`)의 카테고리 필터가 **고정 기본 5개 이름·예시 글 개수**를 보여주던 것을 **내 실제 카테고리와 id별 글 수**로 교체(나의 글에서만 보인다), `PostOutline`의 로그인 전 기본 카테고리(진짜 id 없음) 제거.
- **테스트**: 전체 603개 통과. 같은 이름이 두 곳일 때(개수·선택·링크·글 배치·이름 중복 규칙) 케이스를 추가했다.

### BE 단계에서 맞춰야 할 것 (FE가 기대하는 모양)
- 글을 돌려주는 모든 응답에 `categoryId`(없으면 null)와 `category`(이름 사본).
- `categoryCounts`: `{ [categoryId]: 직속 글 수, unassigned?: 개수 }`.
- `categoryPath`: `{ id, name }[]`.
- `GET /blog/posts[/mine]`: `?categoryId=` → 그 카테고리와 **하위 카테고리**의 글.
- `POST/PATCH /blog/posts`: `categoryId` 받기(없으면 기존 값 유지). `PATCH`에 `categoryId`만 와도 발행 상태·AI 요약은 그대로.
- `POST /categories`: 같은 부모 아래 같은 이름이면 409(FE도 미리 막지만 서버가 최종 판정).
- `PATCH /categories/:id`(이름 변경): 그 카테고리 글들의 `Post.category`(이름 사본) 갱신 — 지금 BE의 `rename`은 아직 미구현 TODO.
