# 메모장 서버 연동과 확장

> 2026-11-05 기록. 메모장 FE(플로팅 패널·모바일 하단 패널)는 구현됐고 **서버에 저장되지 않는다**(새로고침하면 사라짐).
> 합의된 설계는 [`docs/handoff/write-editor-update.md`](../handoff/write-editor-update.md)의 "합의된 설계". 서버 연동은 사용자가 따로 시키기 전에는 시작하지 않는다.

## 서버 연동 (순서: FE(MSW 목) → BE(사람이 테스트 작성) → 통합(로컬 개발 DB에서만))
- [x] API 계약 확정 (2026-11-06, 작업하면서 바뀔 수 있음): `GET /memos?targetType&targetId`, `POST /memos`(201), `PATCH /memos/:id`, `Memo = { id, targetType, targetId, content, createdAt, updatedAt }`. 오류: 400 검증, 401, POST 403(남의 대상·`Post.userId` null)·404(대상 없음), PATCH 404(없거나 남의 메모). `content` 최대 10,000자·빈 문자열 허용, DELETE 없음, `Memo.userId` FK Cascade(회원 삭제), draft 글에도 생성 가능
- [x] FE(MSW 테스트, 미커밋): `entities/memo`의 `MemoSaver`(디바운스·직렬화·실패 재시도)와 `useMemoDraft`, `MemoPad`에 연결. 처음 입력할 때 POST(빈 행 방지), 이후 1.5초 디바운스 PATCH, POST 완료 전 PATCH 금지, 닫을 때·화면 이탈 때 즉시 저장, 불러오기 실패·로딩 중에는 입력 잠금. 1차는 `list[0]`만 표시
- [ ] FE 화면 후속(의논 필요): 저장 상태 표시("저장 중/저장됨/저장 실패" — `useMemoDraft`가 `status`를 이미 돌려준다), 불러오기 실패 안내, 독서 기록 화면 마운트
- [ ] BE 테스트 목록(Claude는 목록·골격만, 사람이 작성): 대상이 본인 글/독서 기록인지 검증, `Post.userId`가 null이면 거부, 본인 메모만 조회, 공개 글 응답에 섞이지 않는 별도 컨트롤러, **글·독서 기록·회원 삭제 시 메모 삭제를 같은 트랜잭션에서 처리**(폴리모픽 참조라 FK가 없다)
- [ ] 배포: BE 먼저, FE 나중. 로컬 BE 기본 DB가 운영이라 개발 DB 검증 전에는 `prisma migrate`를 돌리지 않는다
- [x] 저장 로직을 `model/useMemoDraft`·`model/memoSaver`로 분리 (`write-editor-refactor-followups.md`의 MemoPad 항목 해소)

## 2차: 메모 여러 장 (1:N) — 계약 확정 2026-11-10
> 1차에서 대상당 unique 제약을 두지 않은 덕에 **서버는 이미 여러 장을 지원**한다(GET은 목록, POST는 매번 새 메모). 1:1처럼 보인 것은 FE가 `list[0]`만 썼기 때문이다. 이번에는 제목·삭제·장 수 상한을 더한다.
> 합의된 결정: **헤더 탭**(한 번에 한 장), **삭제 기능 추가**, **메모마다 제목**, **장 수 상한**, 독서 기록 화면 마운트는 이번 범위 밖(아래 후속).

**`Memo` 모델 변경**: `title String @default("")`(최대 30자) 추가. 마이그레이션은 컬럼 추가뿐이고 기존 메모는 `title: ""`(탭에는 번호 "메모 1…"로 표시). 응답 `Memo = { id, targetType, targetId, title, content, createdAt, updatedAt }`.

> **2026-11-10 변경: 순서 저장 안 함.** 탭 순서 변경은 화면에서만 하고(`←`/`→` 버튼·탭 드래그) 서버에 저장하지 않는다 — 새로고침하면 만든 순서로 돌아온다. 그래서 `position` 컬럼과 `PATCH /memos/reorder`는 **계약에서 뺐다.** 나중에 순서를 저장하고 싶어지면 그때 다시 넣는다.

| 엔드포인트 | 계약 |
|---|---|
| `GET /memos?targetType&targetId` | `createdAt` 오름차순(만든 순서), 본인 메모만 |
| `POST /memos` | 본문 `{ targetType, targetId, title?, content? }`(둘 다 생략 가능). **대상당 최대 10장, 넘으면 409.** 403(남의 대상·작성자 없는 글)·404(대상 없음)는 그대로 |
| `PATCH /memos/:id` | 본문 `{ title?, content? }`(하나 이상, 아니면 400). 404: 없거나 남의 메모 |
| `DELETE /memos/:id` | **신규.** 204. 404: 없거나 남의 메모 |

- 만들기의 "장 수 확인 + 생성"은 한 트랜잭션으로 처리한다(동시에 눌러도 10장을 넘지 않게). 글·독서 기록·회원 삭제 때 메모를 지우는 기존 동작은 그대로다.
- **409는 FE·BE 모두 처리한다**: BE가 막고, FE는 "메모는 최대 10장까지 만들 수 있습니다"를 보여주며 `+` 탭을 비활성화한다.
- 순서: ① 계약(이 절) → ② FE(MSW 목, 화면은 하나씩 의논) → ③ BE(Claude는 테스트 목록·골격만, 사람이 작성) → ④ 통합(로컬 개발 DB에서만). **배포는 BE 먼저**(새 컬럼은 기본값이 있고 새 응답 필드는 기존 FE에 영향이 없다).

- [x] ② FE (2026-11-10): `MemoSaver`를 메모별로 돌리기(메모마다 디바운스·직렬화·재시도), `useMemoDraft`를 메모 목록·현재 탭 기준으로, 헤더 탭 UI(크롬식 탭 줄: 추가·×삭제·더블클릭 이름 변경·드래그/←→ 순서 변경(저장 안 함)·넘친 탭 뱃지+선택 목록·상한 안내)
- [x] ③ BE (2026-11-10, 개발 DB 통합 확인 전): `title` 컬럼과 마이그레이션, `POST` 상한(409)·`PATCH` 확장·`DELETE`, 서비스·DTO 단위 테스트
- [x] ④ 통합 확인(개발 DB, 2026-11-10) — 마이그레이션 적용·드리프트 없음, BE HTTP 24개 시나리오 통과, 실제 FE↔BE 브라우저 확인(첫 입력 POST·`+`·이름 변경·새로고침 복원·삭제·10장 상한)

### 2차 후속 (일부러 미룸)
- [ ] **`+`를 빠르게 두 번 누르면 메모가 두 장 생길 수 있다** — `useMemoDraft.addMemo`에 요청 중 가드가 없어서, 응답이 오기 전에 한 번 더 누르면 `POST`가 두 번 나간다(두 번째 호출도 "10장 미만"으로 통과). 그럴 가능성은 낮다고 보고 이번에는 두었다. 고친다면 요청 중에는 `addMemo`를 무시하고 `+`도 비활성화하며, 그 동작을 `useMemoList.test.tsx`에 추가한다. (BE 쪽 동시 요청 한계는 `inote-server`의 `docs/todo/memos-followups.md`)
- [ ] **터치(모바일)에서는 탭 드래그로 순서를 바꿀 수 없다** — 브라우저 기본 드래그가 터치에서 안 된다. 지금은 메모 아래의 `←`/`→` 버튼으로 옮긴다(저장 안 함). 드래그가 필요하면 `@dnd-kit/sortable` 도입.
- [ ] 저장 상태 표시("저장 중/저장됨/저장 실패") — `useMemoDraft`가 `status`를 돌려주지만 아직 화면에 안 보인다
- [ ] 삭제 확인창이 브라우저 기본 `confirm`이다(내용이 있는 메모만 묻는다). 앱 스타일로 바꿀지 결정
- [ ] 패널 폭(데스크톱 320px)이 좁아 탭이 2~3개만 보인다 — 기본 폭이나 탭 최대 폭(144px) 조정 여부

### 2차 구조 후속 (커밋 전 refactor-advisor 점검에서 일부러 미룬 것)
- [ ] **`MemoTabs`(223줄) 분리(P1)** — 다음에 탭 동작을 고칠 때 잘림 판정(`IntersectionObserver` + `hiddenIdx`)을 `useHiddenTabs` 훅으로, 뱃지·메뉴 블록을 `MemoTabOverflowMenu`로 뺀다. 바깥 클릭·Esc로 닫는 effect는 다른 곳에 같은 패턴이 있으면(세 번째) `shared/lib` 훅으로 뽑는다(아직 grep으로 확인하지 않음).
- [ ] **`useMemoDraft`(180줄) 순수 함수 분리(P1)** — 상태 훅을 쪼개는 건 ref 동기화가 얽혀 위험하다. 분리한다면 `moveMemo`의 배열 이동·활성 인덱스 보정, `removeMemo`의 `nextActive` 계산만 `model/` 순수 함수로 빼 단위 테스트한다.
- [ ] **`MemoBottomSheet`·`FloatingPanel`의 header 처리 중복(P1)** — 지금은 두 번째 복사본이라 그대로 둔다. 세 번째 패널이 생기면 `shared/ui`에 `PanelHeader`로 뽑는다.
- [ ] **상태 있는 메모 가짜 서버 공통화** — `useMemoList.test.tsx`의 `mockServer`(GET/POST/PATCH/DELETE를 메모리에 흉내)를 `src/test/msw/`로 옮기는 건 다른 테스트에서 네 번째로 필요해질 때 한다. 지금은 팩토리·URL·`sleep`만 `src/test/fixtures/memo.ts`·`src/test/sleep.ts`로 모았다.

## 3차: 어느 화면에서나 메모장 + 메모 관리 페이지 — 계약 확정 2026-11-12
> 지금은 메모장이 글쓰기 화면에만 붙어 있다. 어느 화면에서나 쓰게 하고, 내 메모를 모아 보는 관리 페이지를 만든다. 메모 UI 자체의 변경은 나중에 따로 한다(이번 범위 밖).
> 합의된 결정: 메모의 종류는 **일반 / 글 / 독서**. 글쓰기·글 상세에서는 그 글, 독서에서는 그 독서 기록의 메모이고, 홈·목록 등 나머지 화면에서는 **일반 메모**. **남의 글 상세에서는 메모장을 숨긴다**(서버가 남의 글에는 메모를 못 만들게 막는다). 로그인하지 않았으면 숨긴다.

**계약 변경**
| 항목 | 변경 |
|---|---|
| `targetType` | `general` 추가. 일반 메모는 대상이 없어 `targetId`를 받지 않고 서버가 고정값(`""`)으로 저장한다. 대상 소유 확인은 건너뛴다(내 메모면 된다) |
| `POST /memos` | `general`은 `targetId` 없이 만들 수 있다. **일반 메모 전체 10장 상한**(넘으면 409, 글·독서는 기존대로 대상당 10장). 상한 값 조정은 메모 UI를 바꿀 때 다시 본다 |
| `GET /memos` | `targetType`·`targetId`를 모두 생략할 수 있다. 생략하면 내 메모 전체를 **최근 수정순**으로, `targetType`만 주면 종류별로. 기존 호출(둘 다 지정)은 그대로 만든 순서(오름차순) |
| 응답 `Memo` | `targetTitle`(글·독서 제목, 일반 메모나 제목 없으면 `null`) 추가 |

**FE 구조 결정**
- 메모장(`MemoPad`)은 **루트 레이아웃에 하나만** 두고(`widgets/global-memo`의 `GlobalMemoPad`, `ChatWorkspace`의 `floating` 자리 — 본문 컬럼 오른쪽 아래), 현재 경로로 대상을 정한다(`entities/memo`의 `resolveMemoTarget`: `/posts/:id` → 그 글(내 글일 때만), 독서 상세 → 그 독서 기록, 그 외 → 일반). **글쓰기 화면(`/write/:id`)은 지금처럼 상단 바의 자기 메모장을 그대로 쓴다**(AI 패널 폭에 따라 같이 움직이는 현재 동작 유지, 전역 메모장은 거기서 그리지 않음). `/reading/write`는 일반 메모. 관리자(보류)·`/memos`는 숨김.
- 메모 관리 페이지 `/memos`: 진입점은 **헤더 사용자 버튼의 select에 "메모 관리" 항목**. 탭 4개(전체·일반·글·독서), 카드 목록. 카드를 누르면 **대상 글·독서로 이동**하고, 일반 메모는 **메모장을 그 메모 탭으로 열어** 보여준다.

**순서**: ① 계약(이 절) → ② FE(MSW 목, **작업은 하나씩 의논**): 경로 → 대상 결정과 루트 마운트 → 헤더 메뉴 항목 → `/memos` 페이지 → ③ BE(테스트는 사용자가 위임하면 Claude가 작성) → ④ 통합(개발 DB). 배포는 BE 먼저(스키마 변경 없음: `targetType`은 문자열 컬럼, 검증은 DTO).

- [x] ① 계약 확정 (2026-11-12)
- [ ] ② FE
  - [x] 경로 → 메모 대상 결정(`resolveMemoTarget`), 일반 메모 데이터 계층(`MemoTarget`에 `general`, API·캐시 키), 루트 `GlobalMemoPad`(비로그인·남의 글·`/memos`·관리자 숨김, 대상이 바뀌면 새로 마운트) (2026-11-12, 커밋 전 — 실제 BE는 아직 `general`을 모르므로 MSW·브라우저 가짜 응답으로만 확인)
  - [x] 헤더 사용자 메뉴(드롭다운·모바일 inline)에 "메모 관리" 항목 (2026-11-12, 커밋 전)
  - [x] `/memos` 관리 페이지 UI — 탭 4개(수 표시)·카드·빈 상태·불러오기 실패, 글·독서 카드는 대상 화면으로 이동. **서버 전체 조회가 없어 `NEXT_PUBLIC_MEMOS_MOCK=true`로 목 데이터(`entities/memo/model/mock.ts`)를 보며 UI 확인**(2026-11-12, 커밋 전)
  - [x] 일반 메모 카드 → `/?memo=:id`로 이동하면 메모장이 열린 채 그 메모 탭을 보여준다(`GlobalMemoPad`가 요청마다 새로 마운트, 처리 후 주소에서 `memo`를 지움) (2026-11-12, 커밋 전)
  - [x] 서버 없이 확인하는 목 모드 `NEXT_PUBLIC_MEMOS_MOCK=true` — 메모장·메모 관리가 메모리 안의 같은 가짜 저장소를 본다(`entities/memo/model/mock.ts`). 서버 준비 후 이 환경변수만 빼면 된다
- [x] ③ BE (2026-11-12, 커밋 전, 워크트리 `inote-server-post-unpublish`의 `feat/memo-general`) — `general` 종류(targetId 고정 `""`, 전체 10장), `GET /memos` 확장(인자 생략 가능·`targetId`만 오면 400), `targetTitle`(GET에만), **정렬은 항상 최근 수정순**. 메모장 탭은 FE `getMemos`가 `createdAt` 오름차순으로 다시 정렬. 테스트는 위임으로 Claude가 작성(서비스·DTO)
- [x] ④ 통합 확인(개발 DB, 2026-11-12) — BE HTTP 19개 시나리오 통과, 실제 FE↔BE 브라우저 확인(메모 관리 탭 수·targetTitle, 일반 카드 → 메모장이 그 탭을 열어 수정이 서버에 저장, 글 카드 → 글 상세). 테스트 계정은 지움
- [ ] 배포: **BE와 FE를 같은 시기에** — 서버 정렬이 생성순 → 최근 수정순으로 바뀌어, FE 정렬(`getMemos`)이 나가기 전에 BE만 나가면 글쓰기 메모장의 탭 순서가 수정순으로 보인다(BE 먼저, FE는 곧바로)

### 3차 후속 (커밋 전 refactor-advisor 점검, 2026-11-12)
- [ ] **서버 3차 API 배포 후 목 모드 삭제** — `NEXT_PUBLIC_MEMOS_MOCK` 분기(`entities/memo/api/memos.ts` 5곳), `model/mock.ts`, `api/memos.mock.test.ts`, `useAllMemos.test.tsx`의 목 모드 테스트를 지운다. 환경변수 분기라 **목 코드가 운영 번들에 그대로 들어가 있다**(빌드 결과 청크에서 확인) — 동작에는 문제없고 번들만 조금 늘어난다
- [ ] "openMemoId는 마운트 때만 읽는다"는 규칙이 3곳에 분산 — `useMemoDraft`의 `initialIdRef`, `MemoPad`의 마운트 effect, `GlobalMemoPad`의 key+seq. 규칙을 바꿀 때 한쪽만 고치지 않게 주의
- [ ] `memo` 쿼리 이름·경로 규칙(`/?memo=ID`)이 `views/memos`와 `widgets/global-memo`에 문자열로 흩어져 있다 — 세 번째 사용처가 생기면 `entities/memo/lib`에 `memoHref`와 쿼리 키 상수로 공통화
- [ ] `GlobalMemoPad`의 "내 글인지" 확인이 글 전체 본문을 받아 `userId`만 쓴다(같은 URL 호출 7곳) — 서버에 작성자만 주는 가벼운 응답이 생기면 교체
- [ ] 테스트의 `useSession`·`next/navigation` mock 복붙(레포 19개 파일) — `src/test/`에 `mockSession()` 같은 헬퍼로(그 폴더 테스트를 고칠 때)
- [ ] `vitest.setup.ts`의 `asyncUtilTimeout: 3000`은 부하로 인한 flaky 대응 — 원인이 해결되면 되돌린다

## 1차 범위 밖 (나중에 정함)
- [x] 메모 여러 장 (헤더 탭) → 위 "2차"로 옮김 (2026-11-10)
- [ ] 독서 기록 화면(`/reading/write`)에 메모 마운트
- [ ] 댓글
- [ ] 참고/참조 페이지
