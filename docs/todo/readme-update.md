# 할 일 — README 현행화 (inote)

> 2026-10-21, `inote-server` README를 점검하다가 같은 문제가 이 레포에도 있을 것 같아 적어 둔다.
> **이 레포의 `README.md`는 아직 점검하지 않았다**(마지막 수정 2026-09-30). 항목은 점검한 뒤 채운다.
> 점검 결과가 있는 쪽: `inote-server` 레포 `docs/todo/readme-update.md`.
> 규칙: 나중에 하기로 한 일은 `docs/todo/`에 기록한다.

## 점검 항목 (inote-server에서 나온 것을 이 레포에 맞게 확인)
- [ ] **DB·인프라 표기** — 운영 DB가 Supabase로 이전된 것이 반영돼 있는지 (Neon이 남아 있는지)
- [ ] **기능·화면 목록** — 글쓰기·카테고리(id 기반)·독서 기록·할 일·만다르트·관리자·에디터 이미지 업로드 등 지금 있는 기능이 모두 적혀 있는지
- [ ] **프로젝트 구조(FSD)** — 실제 `apps/web/src` 구조와 맞는지 (`docs/FSD.md`와 중복이면 링크로 줄이기)
- [ ] **로컬 실행 방법** — BE 연결을 안전하게 안내하는지. 로컬 FE가 운영 BE를 가리키는 `.env.local` 문제와 `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev` 덮어쓰기, BE는 `scripts/dev-db.sh start`로 띄우는 것
- [ ] **환경변수** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_API_URL` 등 현재 값이 맞는지
- [ ] **관련 문서 링크** — `docs/`(`EDITOR_IMAGE_UPLOAD`, `CATEGORY_ID`, `devlog`, `todo` 등)가 목록에 있는지, 깨진 링크가 없는지
- [ ] **`CLAUDE.md`와의 중복** — README와 `CLAUDE.md`가 같은 내용을 따로 들고 있으면 한 곳을 기준으로 정리

## 완료
(아직 없음)
