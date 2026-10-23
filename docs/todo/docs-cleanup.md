# 할 일 — 문서 정리 후속 (inote)

> 2026-10-23 문서 구조 정리(`docs/learning`·`adr`·`design`·`blog` 분리, 중복 문서 통합, 낡은 정보 정리)에서
> **일부러 손대지 않고 남긴 것**. 사용자가 "다음에 확인하고 정리"로 정했다.

## 남긴 것
- [ ] **`TODO.md`** — Phase 1 초기 계획(스캐폴드·목업 화면)이 전부 미체크로 남아 있어 현재와 맞지 않는다. 지워도 되는지 확인 후 삭제하거나 현행 후속 목록으로 교체 (`CLAUDE.md`·`README`가 이 파일을 가리키는 곳이 없는지 확인)
- [ ] **`docs/UI_SCREENS.md`** — 같은 Phase 1 화면 7개 계획서. `STRATEGY.md:66`이 링크로 가리킨다. 정리하면 그 링크도 같이 고친다. 남아 있는 `inote-blog` 표기도 그때 같이 사라진다
- [ ] **`docs/kure/` 위치** — `PLAN.md`(설계)·`HANDOFF.md`(인수인계)·`DOCKER-SETUP-GUIDE.md`(세팅)가 한 폴더에 섞여 있다. `adr/`·`handoff/`·`runbooks/`로 나눌 수 있지만 **`inote-server/CLAUDE.md`가 `inote/docs/kure/HANDOFF.md`·`PLAN.md` 경로를 가리키고 있어서**, 옮기면 그 레포의 링크도 같은 시점에 고쳐야 한다. 또 `docs/kure/HANDOFF.md`에는 "브랜치 `docs/kure-handoff`, main 병합 전"이라는 서술이 있는데 이미 PR #3으로 병합됐으므로 낡았다
- [ ] **`docs/handoff/HANDOFF.md`** — 10/8~23 변경은 git 이력 기준으로 추가했다(2026-10-23). 남은 것: 운영(Vercel·Render) 반영 여부, 3절 "다음 할 일"의 각 항목 현재 상태, 독서·할 일 목록 등 10/7 이전 시기에 생긴 변경 반영, 이름 수정 API 테스트 통과 여부 — 전부 **확인 필요**로 표시만 해 뒀다
- [ ] **코드 안의 `inote-blog` 문자열** — `DesktopChatPanel.tsx`의 localStorage 키(`inote-blog:llm-panel-width` 등)와 `MandalartGrid.tsx` 화면 문구. 문서 정리 범위 밖이라 코드는 그대로 뒀다. 키를 바꾸면 저장된 패널 너비가 초기화된다
- [ ] 문서 안의 `src/...` 경로를 `apps/web/src/...`로 통일 (`CLAUDE.md` "다음 할 일"과 같은 항목)

## 완료
(아직 없음)
