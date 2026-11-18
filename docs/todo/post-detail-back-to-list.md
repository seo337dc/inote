# 글 상세 "← 목록으로" 버튼 수정

> 시작 2026-11-18. 세션이 바뀌어도 이어 갈 수 있게 하는 작업 지시서다. 끝나면 삭제한다(`/wrap`).

## 목표
`BackToListButton`이 `router.back()`으로 브라우저 직전 화면(다른 글 상세, `/write`, 메모 화면 등)으로 가는 문제를 고쳐, 항상 **마지막으로 본 목록**(필터·페이지·검색 상태 포함)으로 돌아가게 한다.

## 결정 (방안 A', 2026-11-18 승인)
- 링크마다 저장하지 않고 **목록 화면 쪽에서** 마지막 목록 주소(경로+쿼리)를 `sessionStorage`에 기록한다. 대상: 홈, 나의 글, 작성자 페이지(정확한 파일은 구현 때 확인).
- 버튼은 기록된 주소로 `push`, 기록이 없으면 `/`.
- 기록 헬퍼는 `shared/lib`, `sessionStorage`는 try/catch.
- 원인 근거: 상세 진입 경로가 사이드바(`PostOutline`)·발행(`WritePostForm` push)·채팅 패널·메모 카드·글 이동 화면 등 5곳 이상이라 링크별 처리는 누락 위험이 크다.

## 영향받는 레포·브랜치
| 레포 | 브랜치 | PR |
|---|---|---|
| inote | `fix/post-detail-back-to-list` | 없음 |

## 한 일
- 브랜치 생성(`origin/main` 444ab3f 기준)
- `shared/lib/list-url.ts`(기록·조회 헬퍼, 외부 주소 무시, sessionStorage 실패 무시) + 테스트
- `widgets/post-list/ui/ListUrlRecorder.tsx` — 홈·나의 글·작성자 페이지가 모두 쓰는 `PostFeed` 한 곳에서 기록(빈 목록 화면 포함)
- `BackToListButton`을 `router.back()` 대신 기록된 목록 → 없으면 `/`로 변경 + 테스트(브라우저 기록이 있어도 back 안 함)
- `MyPostsPage.test`의 `next/navigation` mock에 `usePathname`·`useSearchParams` 추가
- `pnpm test`(1085개)·`pnpm lint`·`pnpm build` 통과

## 다음 할 일
- [ ] 브라우저에서 직접 확인: 사이드바로 상세→상세 이동 후 "목록으로", 발행 직후 "목록으로", 필터·페이지·검색 상태 복원
- [ ] 커밋 전 `code-reviewer`·`refactor-advisor` 점검 → `/commit`

## 막힌 것·결정 대기
- 없음. 새 탭에서 상세를 바로 열면 기록이 없어 `/`로 가는 것은 허용(기존과 동일).
