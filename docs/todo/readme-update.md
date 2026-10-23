# 할 일 — README 현행화 (inote)

> 2026-10-21, `inote-server` README를 점검하다가 같은 문제가 이 레포에도 있을 것 같아 적어 둔다.
> **이 레포의 `README.md`는 아직 점검하지 않았다**(마지막 수정 2026-09-30). 항목은 점검한 뒤 채운다.
> 점검 결과가 있는 쪽: `inote-server` 레포 `docs/todo/readme-update.md`.
> 규칙: 나중에 하기로 한 일은 `docs/todo/`에 기록한다.

## 점검 결과 (2026-10-23 README 현행화로 반영)
- [x] **DB·인프라 표기** — Neon → Supabase로 고침, 배포(Vercel/Render) 행 추가
- [x] **기능·화면 목록** — 독서·할 일·만다라트·관리자·이미지 업로드를 반영하고, 화면 목록은 `apps/web/src/app`이 소스라고 링크로 대체
- [x] **프로젝트 구조(FSD)** — README에서 구조를 풀어 쓰지 않고 `docs/design/FSD.md`로 링크 (그 문서의 낡은 폴더 목록도 제거)
- [x] **로컬 실행 방법** — 운영 BE를 가리키는 `.env.local` 위험, `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev` 덮어쓰기, `scripts/dev-db.sh start` 안내 추가
- [x] **환경변수** — 예시 값에서 `/api/v1`을 뺐다(코드 `shared/lib/api.ts`가 `/api/v1`을 붙이므로 기존 예시가 틀렸음)
- [x] **관련 문서 링크** — 이동된 경로로 갱신, 깨진 상대 링크 0개 확인
- [x] **`CLAUDE.md`와의 중복** — README는 소개·실행법, 상태·규칙은 CLAUDE.md로 역할 분리

## 남은 것
- [ ] README의 "구현된 기능" 한 줄은 기능이 늘면 같이 고쳐야 한다 — 길게 늘어나기 전에 devlog 링크로만 두는 것도 고려
