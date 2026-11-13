# handoff 정리

> 시작 2026-11-13. 이 파일은 세션이 바뀌어도(다른 PC 포함) 이어 갈 수 있게 하는 작업 지시서다. 끝나면 삭제한다(포트폴리오로 건질 것은 건진 뒤 — `/wrap`).
> 근거: [ADR 0008](../adr/0008-direction-and-working-model.md) 5절 3번 — 진행 중 문서는 끝나면 삭제한다. 백로그 8절의 "`HANDOFF.md` 현행화" 항목을 이 지시서로 옮겼다.

## 목표
`handoff` 문서들 중 **끝난 것은 지우고**, 남길 정보는 "지금 상태" 한 곳으로 줄인다. 낡은 사실을 사실로 믿고 작업하는 일(HANDOFF 헤더가 스스로 "낡았을 수 있다"고 적고 있었음)을 없앤다.

## 영향받는 레포·브랜치
| 레포 | 브랜치 | PR |
|---|---|---|
| `inote` | `docs/handoff-cleanup` (최신 `origin/main`에서 시작) | 없음(커밋 전) |
| `inote-server` | `docs/handoff-cleanup` | 없음(커밋 전) |

## 정리 대상과 결과 (2026-11-13)
| 파일 | 결과 |
|---|---|
| `inote/docs/handoff/HANDOFF.md` (148→약 85줄) | **축소 완료(A안)** — "새 PC 시작 순서·인프라 현황·규칙·주의"만 남기고 낡는 "다음 할 일 A~G"와 "최근 한 일"은 뺐다. 유효한 항목은 백로그 10절(운영 확인, 안정화 후 정리, `inote-money`, 카테고리 경로 후속 등)과 1·6절로 옮겼다 |
| `inote/docs/handoff/write-editor-update.md` (60줄) | **삭제 완료** — FE #29·#30·#31, BE #12가 모두 병합된 것을 `gh`로 확인. 구현 설계 기록(react-rnd 플로팅 패널, slot-actions 설계 이유, 번들 크기, 메모 모델)은 `docs/devlog/fe.md` 2026-11-05~06 항목으로 옮겼고, 메모 API 계약은 `memo.md`, 분기 기준은 `editor-tablet-check.md`에 이미 있었다 |
| `inote/docs/handoff/chat-update/` (4개) | **유지** — 삭제 후보로 봤으나 **구현 미착수**임을 코드로 확인했다(FE에 "글에 넣기"·연결 UI 없음, `inote-ai`에 이름 수정 API·연결 컬럼·제목 생성 없음, README 체크리스트 11개 전부 미체크, ADR 0006 "구현 미착수"). 승인된 계획이므로 구현 시작 때 `/start`로 작업 지시서를 만들고 이 폴더를 흡수한다 |
| `inote-server/docs/handoff/HANDOFF.md` (109→약 90줄) | **"현재 상태"만 축소** — 낡은 BE 기능 목록·커밋 해시·#7/#8 이력을 빼고 오래 가는 정보(임베딩 플래그, 개발 DB 명령, 테스트 현황, dbml 주의)만 남겼다. 위쪽 "규칙"(Claude↔Cursor 인수인계)은 Cursor 규칙이 참조해서 **그대로 둠** |
| `inote/docs/kure/HANDOFF.md` (214줄) | 이번에는 손대지 않음. 위치 정리는 백로그 8절 `docs/kure/`와 함께 |

## 계약 (결정)
1. **HANDOFF를 남길까, 폐기할까? → (A) 남기되 한 장으로 축소** (사용자 승인 2026-11-13).
2. **Cursor 규칙(`inote-server/.cursor/rules/*handoff*.mdc`)은 바꾸지 않았다.** 서버 HANDOFF의 규칙 부분이 그대로라 규칙과 어긋나지 않는다. 다만 ADR 0008은 "세션 인수인계는 작업 지시서가 맡는다"고 하므로, Cursor 쪽 규칙이 "「현재 상태」를 매번 갱신"하라고 요구하는 부분은 그 모델과 겹친다. **정할 것(사용자): Cursor 규칙도 작업 지시서 모델에 맞출지.**

## 한 일
- 2026-11-13: `/start`로 두 레포에 `docs/handoff-cleanup` 브랜치 생성, 정리 대상·의존성 목록 작성.
- 2026-11-13: `HANDOFF.md`(inote) 축소, `write-editor-update.md` 일지로 이전 후 삭제, 서버 `HANDOFF.md` 현재 상태 축소, 백로그 10절 신설(HANDOFF에서 옮긴 항목) 및 KURE 후속 항목 추가, `memo.md`의 삭제된 문서 링크 수정.
- 2026-11-13: 이 과정에서 **백로그의 잘못된 서술을 바로잡았다** — "채팅 업데이트 1차(PR로 병합됨)"는 근거 없는 서술이었고 실제로는 구현 미착수(백로그 6절에 항목 추가).

## 다음 할 일
- [ ] 커밋(`/commit`) — 레포별로 기능 단위로 나눈다. `inote`: 백로그·HANDOFF·일지 이전·링크 수정 등, `inote-server`: HANDOFF
- [ ] Cursor 규칙을 작업 지시서 모델에 맞출지 결정(사용자) — 바꾼다면 `.cursor/rules/handoff-session.mdc`·`qa-handoff.mdc`·`cursor-role.mdc`·`be-context.mdc`, `docs/CURSOR.md`
- [ ] 병합 뒤 이 지시서를 삭제하고 ADR 0008 5절 3번(남은 문서 정리: learning, 나머지 ADR, `docs/kure/`)을 이어서 진행

## 막힌 것·결정 대기
- Cursor 규칙 방향(위 계약 2).
- HANDOFF 인프라 표의 "확인 필요"(cron-job 활성화, Neon 삭제 여부, 카테고리 이동 BE 운영 배포)는 코드로 확인할 수 없어 사용자 확인이 필요하다 — 백로그 10절에 있다.
- `inote` 로컬 `main`에 `origin/main`에 없는 커밋 4개(할일 탭 구현)가 있고 다른 브랜치에는 없다(`feat/todo-redesign`을 지움). 이 작업과 무관하지만 `main`을 되돌리기 전에 살릴지 정해야 한다.

## 포트폴리오 메모
- 채팅 업데이트 1차는 구현 전이라 아직 대상이 아니다. 구현이 끝나면 `portfolio-recorder`로 기록할지 정한다.
- 이번 정리 자체: "근거 없는 서술을 코드로 검증해 바로잡았다"(채팅 1차 완료 오해)는 문서 신뢰도 관점의 사례가 될 수 있다. 다만 이력서에 쓸 정도의 성과는 아니다.
