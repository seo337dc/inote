---
name: commit
description: 작업을 커밋할 때 쓴다. 브랜치 확인 → 커밋 전 체크리스트(test/lint/build) → 기능 단위 커밋 → PR description 초안 작성까지 한다. push와 PR 생성은 하지 않는다. 사용자가 /commit을 입력했거나 "커밋해줘"라고 했을 때만 쓴다.
---

사용자가 커밋을 요청한 상태다. 아래 순서를 그대로 따른다. CLAUDE.md의 규칙이 우선이며 어긋나면 CLAUDE.md가 맞다.

## 1. 브랜치 확인
- `git branch --show-current`, `git status --short`로 현재 상태를 본다.
- `main`이면 커밋하지 않는다. 최신 `origin/main`에서 새 브랜치를 만든다 (`git fetch` → `git checkout -b <브랜치> origin/main`). 만든 뒤 `git branch --unset-upstream`으로 upstream 추적을 끊는다 (안 끊으면 `git push`가 main으로 간다).
- 현재 브랜치가 이번 작업과 무관하거나 이미 main에 병합됐으면(`git branch -r --merged origin/main`으로 확인) 그 위에 커밋하지 않고 같은 방식으로 새 브랜치를 판다.
- 브랜치 이름: `feat/`·`fix/`·`docs/`·`chore/` + 영문 kebab-case 한 줄 요약. 새로 만들 때는 이름을 사용자에게 먼저 보여준다.
- 작업과 무관한 untracked/수정 파일이 있으면 같이 커밋하지 않고 어떻게 할지 묻는다.

## 2. 체크리스트 (apps/web에서, 코드 변경이 있을 때만)
순서대로 실행하고 결과를 그대로 보여준다. 하나라도 실패하면 커밋하지 않고 보고한다.
1. `pnpm test`  2. `pnpm lint`  3. `pnpm build`
- E2E는 보류 중이라 건너뛴다. PR 초안의 테스트 항목에 "안 돌림, 보류 중"이라고 적는다.
- 문서만 바꿨으면 이 단계는 건너뛰고 건너뛴 사실을 PR 초안에 적는다.
- 새 로직·컴포넌트에 테스트가 없으면 커밋 전에 사용자에게 알린다.
- 이번 작업으로 CLAUDE.md에 적힌 사실(구조·상태·규칙)이 바뀌었는지 확인하고, 바뀌었으면 같은 커밋 묶음에서 갱신한다.

## 3. 커밋
- 기능 단위로 쪼갠다. 한 번에 몰아서 커밋하지 않는다. 쪼개는 계획(어떤 파일이 어느 커밋에 들어가는지)을 먼저 보여주고 확인받는다.
- 메시지: `feat:`/`fix:`/`docs:`/`chore:` + 한 줄 요약. 최근 `git log --oneline`의 어투를 따른다.
- 메시지 끝에 시스템이 지정한 attribution 줄을 붙인다.
- `git add`는 파일을 명시해서 한다 (`-A`, `.` 금지). `.env*` 등 시크릿이 들어가지 않았는지 `git diff --cached`로 확인한다.
- 커밋 훅이 실패하면 `--no-verify`로 우회하지 않고 원인을 보고한다.

## 4. PR description 초안
커밋 직후 `.github/pull_request_template.md` 형식(개요 / 변경 내용 / 배포 시 주의 / 테스트 / 문서 갱신 / 알려진 한계·후속)으로 채워 **보여주기만 한다.**
- 제목은 커밋 컨벤션과 같게. 커밋을 쪼갰으면 "변경 내용"도 커밋 단위로 묶는다. 본문 끝에 시스템이 지정한 attribution 줄.
- "테스트"는 실제로 실행한 것만 체크하고, 안 한 것은 이유와 함께 적는다.
- "배포 시 주의"는 서버 API 변경(BE 먼저/동시), inote-ai 변경, Vercel 환경변수를 반드시 확인한다. 해당 없으면 "없음".
- 이번에 남긴 후속이 있으면 `docs/todo/`에 기록했는지 확인한다.

## 하지 않는 것
- `git push`, PR 생성, 병합은 하지 않는다. 사용자가 따로 요청할 때만 한다. 요청받아도 push는 `git push -u origin <브랜치>`만 하고, `main`으로의 push·force push는 규칙을 상기시키고 확인한다.
- 끝나면 결과(커밋 목록 + PR 초안)만 보고하고 멈춘다.
