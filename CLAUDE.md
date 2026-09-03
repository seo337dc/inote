# CLAUDE.md — inote-blog

새 세션(다른 PC, 다른 AI 포함)에서 이 프로젝트를 이어받을 때 먼저 읽는 파일. 자세한 배경은
`PLANNING.md`(왜 만들고 뭘 성공으로 볼지), `STRATEGY.md`(무엇을 만들지)를 참고.

---

## 프로젝트 한 줄 요약

노션처럼 쓰는 블로그 + 그 기록을 LLM이 분석·평가·검색해주는 iNote 시리즈의 블로그 서비스.
devlog-llm(개인 실험용 선행 프로젝트)의 후속으로, 인증·DB는 기존 `inote-server`를 재사용하고
LLM/AI 부분만 별도 Python 서비스로 새로 만든다.

## 현재 상태 (2026-09-01 기준)

- **기획 단계**: 큰 틀·목표·아키텍처만 확정, 코드는 아직 없음
- 다음 단계는 인프라 정리(Phase 0) — `STRATEGY.md` 참고

## 아키텍처

```
inote-blog             - Next.js (이 레포) — 블로그/노션 UI + LLM 챗 UI
inote-server(blog모듈)  - NestJS (기존 레포 확장) — 글 CRUD, 인증(Better Auth 재사용)
inote-ai               - Python + FastAPI (https://github.com/seo337dc/inote-ai, 별도 DB) — LLM 채팅·임베딩·RAG
```

- `inote-server`는 iNote 시리즈 공통 백엔드(`money/`, `daily/`, `goal/`과 같은 위치에 `blog/` 모듈 추가).
  인증·유저·DB를 새로 만들지 않고 그대로 재사용.
- Python 서비스는 자체 로그인이 없음 — FE가 이미 인증된 `user_id`/이메일을 파라미터로 넘기고,
  Python은 그 값을 신뢰해서 데이터만 태깅 (devlog-llm의 `session_id` 패턴과 동일). 실제 인증
  검증은 필요해지면 나중에 추가.
- Python이 RAG용으로 블로그 글 내용이 필요하면 `inote-server`의 blog API를 호출해서 가져옴
  (DB가 다르므로 직접 조인 불가).

상세 근거는 `PLANNING.md`의 "아키텍처 결정" 항목 참고.

## 로컬 개발

아직 세팅 전 (Phase 0 진행 중). 각 컴포넌트 세팅되면 이 섹션에 채울 것.

## 배포

아직 배포 전. devlog-llm/inote-money와 동일하게 Vercel(FE)+Render(BE)+Neon(DB) 무료 티어 조합
예정, 이후 AWS 검토 (만다라트 7번 축).

## Git / GitHub 계정 (중요 — 새 머신에서는 재설정 필요)

이 레포는 개인 계정 `seo337dc` 전용으로 쓰도록 **로컬 전용** git 설정을 해뒀음 (`.git/config`,
커밋되지 않으므로 새로 클론하면 없음):
- `user.name`/`user.email`을 `seo337dc` 명의로 로컬 설정
- push 인증도 `seo337dc` 토큰만 쓰도록 `credential.helper` 로컬 오버라이드

> `inote-server`도 원래 이 오버라이드가 없어서 회사 이메일로 커밋되고 있었음 (2026-09-01 발견,
> 같은 방식으로 로컬 오버라이드 추가해서 해결 — 이전 커밋 이력은 그대로 둠).

## AI 협업 규칙 (Claude Code ↔ Cursor)

devlog-llm과 동일한 방식 유지.

| 도구 | 담당 |
|------|------|
| **Claude Code** | 설계·구현 — 세팅, API, 페이지, 도메인 로직 |
| **Cursor** | Task 완료 후 QA, 리뷰·리팩토링, 문서·devlog·PR 정리 |
| **사람** | 기획·UX·아키텍처 판단 및 승인 |

- 기획·UX·아키텍처는 AI가 임의로 결정하지 않는다. 대안 제시 → **사람이 승인** 후 반영.
- Task 단위로 끊어서 구현하고, Task마다 확인한다.
- 커밋·PR·push는 **사람이 요청할 때만**.
- AI가 제안하는 기능 확장은 기본적으로 의심한다.

### FE 작업 원칙 (중요 — 2026-09-03 추가)

- **화면을 먼저 만들지 않는다.** "일단 만들어보고 보여준다"는 이 레포에서 하지 않는다.
- 화면이든 컴포넌트든, **뭐든 하나하나 먼저 의논하고 사용자 확인을 받은 뒤에만 작업한다.**
  여러 개를 한 번에 만들지 않는다 — 화면 하나, 결정 하나 단위로 끊는다.
- (배경: 2026-09-03에 7개 화면을 한 번에 목업으로 만들었는데, 사용자가 그 방식 대신 하나씩
  의논하며 진행하길 원한다고 명시적으로 정정함.)

## 알아둘 것 (겪었던 문제들)

- (아직 없음 — 진행하면서 채울 것)

## 다음 할 일

- [ ] 만다라트 9번 축 확정 (8번은 Playwright E2E 테스트로 확정, `docs/mandalart.html` 참고)
- [ ] Next.js 세팅 (`inote-blog`)
- [ ] `inote-server`에 `blog` 모듈 자리 만들기 (Prisma `Post` 모델)
- [ ] `inote-ai`용 별도 Neon DB 프로비저닝
