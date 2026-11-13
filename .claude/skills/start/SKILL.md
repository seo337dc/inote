---
name: start
description: 새 기능·수정 작업을 시작할 때 쓴다. 세 레포(inote·inote-server·inote-ai)의 상태를 점검 → 최신 origin/main에서 새 브랜치를 안전하게 만들고 → docs/todo/<기능>.md 작업 지시서를 만들거나 연다. 코드 작성·커밋·push는 하지 않는다. 사용자가 /start를 입력했거나 "작업 시작", "새 기능 시작"이라고 했을 때만 쓴다.
---

사용자가 새 작업을 시작하려는 상태다. 아래 순서를 그대로 따른다. CLAUDE.md의 규칙이 우선이며 어긋나면 CLAUDE.md가 맞다. 배경은 [ADR 0008](../../../docs/adr/0008-direction-and-working-model.md)이다.

**실행 규칙 (가장 중요)**
- git 명령은 **한 단계씩 실행하고 결과를 확인한 뒤** 다음으로 간다. 줄바꿈으로 여러 명령을 이어 붙이지 않는다. 앞 단계가 실패했는데 다음 단계가 실행되면 엉뚱한 브랜치에 커밋이 생긴다(2026-11-13 겪은 일).
- 묶어서 실행할 때는 `set -e`나 `&&`를 쓰고, 실패하면 멈춰서 원인을 보고한다.
- 작업 트리의 변경을 사용자 확인 없이 stash·삭제·되돌리지 않는다.

## 1. 무엇을 시작하는지 정한다
- 기능 이름(영문 kebab-case)과 접두어(`feat/`·`fix/`·`docs/`·`chore/`), 변경할 레포를 확인한다. 말이 모호하면 묻는다.
- 이미 `docs/todo/backlog.md`에 같은 주제의 항목이 있으면 그 항목이 이번 작업인지 확인한다(5단계에서 옮긴다).

## 2. 세 레포 상태를 점검한다 (읽기 전용)
세 레포는 같은 부모 폴더에 있다. 아래를 그대로 실행하고 결과를 표로 보여준다.

```bash
P=$(cd "$(git rev-parse --show-toplevel)/.." && pwd)
for r in inote inote-server inote-ai; do
  d="$P/$r"
  [ -e "$d/.git" ] || { echo "== $r: 폴더 없음($d)"; continue; }
  git -C "$d" fetch -q --prune 2>/dev/null
  b=$(git -C "$d" branch --show-current)
  echo "== $r"; echo "  브랜치: $b"
  n=$(git -C "$d" status --short | grep -c .); echo "  미커밋 파일: $n"
  [ "$n" != "0" ] && git -C "$d" status --short | head -5 | sed 's/^/    /'
  git -C "$d" branch -r --merged origin/main | grep -qx "  origin/$b" && echo "  이 브랜치: origin/main에 병합됨(재사용 금지)"
  echo "  origin/main보다 앞선 커밋: $(git -C "$d" rev-list --count origin/main..HEAD 2>/dev/null)"
  if git -C "$d" show-ref -q --verify refs/heads/main; then m=$(git -C "$d" rev-list --count origin/main..main); [ "$m" != "0" ] && echo "  ⚠️ 로컬 main이 origin/main보다 $m 커밋 앞섬(main에 직접 커밋한 흔적)"; fi
  pr=$(cd "$d" && gh pr list --head "$b" --state all --json number,state -q '.[] | "#\(.number) \(.state)"' 2>/dev/null | head -2 | tr '\n' ' '); echo "  PR: ${pr:-없음}"
  git -C "$d" worktree list | sed 's/^/  worktree: /'
done
```

`gh`가 `seo-dongchan` 계정이면 PR 조회는 읽기만 되고 비어 보일 수 있다. 쓰기(PR 생성)는 `seo337dc` 계정이어야 한다(`gh auth status`로 확인).

## 3. 막는 상황을 처리한다
다음 중 하나라도 있으면 **브랜치를 만들지 않고 멈춰서** 어떻게 할지 묻는다.
- **작업 트리에 미커밋 변경이 있다** — 선택지를 보여준다: (a) 먼저 커밋 (b) stash(사용자 승인 후) (c) 그대로 두고 새 폴더에서 시작(`git worktree`, 아래 4단계). 어떤 레포의 어떤 파일인지 함께 보여준다.
- 현재 브랜치가 이번 작업과 무관하고 **열린 PR이 있다** — 그 브랜치에 이어서 커밋하지 않는다.
- 로컬 `main`이 `origin/main`보다 앞서 있다 — 알리기만 한다. `main`을 임의로 되돌리지 않는다(그 커밋이 다른 브랜치에 있는지 `git branch --contains`로 보고 사용자와 정한다).

## 4. 새 브랜치를 만든다
- 변경할 레포마다, 브랜치 이름을 사용자에게 먼저 보여주고 승인받는다.
- `git checkout -b <접두어>/<이름> origin/main` 을 실행하고 **결과를 확인한 뒤** `git branch --unset-upstream`(안 끊으면 `git push`가 main으로 간다)을 실행한다. 이미 main에 병합된 브랜치·PR이 열린 브랜치는 재사용하지 않는다.
- 다른 작업이 진행 중이라 폴더를 분리해야 하면: `git worktree add ../<레포>-<이름> -b <접두어>/<이름> origin/main`. 이 폴더에서는 새 세션을 열도록 안내한다(같은 폴더를 여러 세션이 쓰면 브랜치가 바뀐다).
- 끝나면 `git branch --show-current`와 `git rev-parse --short HEAD`, `git rev-parse --short origin/main`으로 새 브랜치가 최신 `origin/main`에서 시작했는지 확인해 보여준다.

## 5. 작업 지시서를 만들거나 연다
작업 지시서는 **`inote/docs/todo/<이름>.md`** 한 곳에 둔다(레포가 여럿이어도 `inote`에).
- 이미 있으면 읽고 "지금 어디까지 했는지"를 요약한다.
- 없으면 아래 템플릿으로 만든다. 1단계에서 백로그 항목을 찾았다면 그 내용을 "목표"로 옮기고, `docs/todo/backlog.md`에서는 그 항목을 지운다(승인받고).

```markdown
# <기능 이름>

> 시작 YYYY-MM-DD. 이 파일은 세션이 바뀌어도 이어 갈 수 있게 하는 작업 지시서다. 끝나면 삭제한다(포트폴리오로 건질 것은 건진 뒤 — `/wrap`).

## 목표
## 영향받는 레포·브랜치
| 레포 | 브랜치 | PR |
|---|---|---|
## 계약 (API·타입 — 새 기능이면 사용자 승인을 받는다: 계약 → FE → BE → 통합)
## 한 일
## 다음 할 일
- [ ]
## 막힌 것·결정 대기
## 포트폴리오 메모 (측정 가능한 개선, 구조 결정, 원인을 파고든 버그)
```

- 새 기능이면 `strategist` 에이전트로 접근 전략을 조사할지 **묻는다**(자동으로 부르지 않는다). 작은 수정(문구·스타일·한두 줄 버그)이면 지시서를 간단히 쓰거나 생략할지 묻는다.
- 지시서 파일은 이번 작업의 커밋에 함께 들어간다(`/commit`).

## 6. 보고하고 멈춘다
만든 브랜치(레포별), 지시서 경로, 다음 단계(계약 합의 또는 구현)만 알려주고 멈춘다.

## 하지 않는 것
- 코드 작성, 커밋, push, PR 생성.
- 설계·계약 결정(사람이 승인한다).
- 사용자 승인 없이 stash·삭제·`main` 되돌리기.
