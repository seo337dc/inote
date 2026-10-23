# apps/app — CLAUDE.md

> 모바일 앱 (예정). **아직 미착수, 코드 없음** — 착수 시점에 이 파일을 실제 체크리스트로 채울 것.
> 지금은 방향과 협업 방식만 미리 정해둠.

## 협업 방식 (착수 시 적용)

`inote-money`의 `apps/app`과 동일하게 **페어 튜터 모드**로 진행 예정 — "사람이 직접 코딩, Claude는
가이드만". `apps/web`/`inote-server` 작업(Claude Code가 빠르게 구현)과는 다른 모드이니 혼동하지
말 것. 상세 규칙은 [`inote-money/apps/app/CLAUDE.md`](https://github.com/seo337dc/inote-money/blob/main/apps/app/CLAUDE.md) 참고.

## 아키텍처 방향 (2026-09-10 기준, 미확정)

- React Native(Expo) + WebView 하이브리드 구조를 검토 중 — `apps/web`의 배포 URL을 WebView로
  그대로 로드하고, 네이티브 모듈이 꼭 필요한 기능만 RN으로 추가
- 상세 결정(로그인 방식, 플랫폼 우선순위 등)은 착수 시점에 확정
- 동일 패턴 선행 사례: [`inote-money/apps/app`](https://github.com/seo337dc/inote-money/tree/main/apps/app)

## 작업 후 문서 최신화

착수해서 진행 상황이 바뀌면(체크리스트 진행, 아키텍처 결정 등) 커밋 전에 이 파일을 그 자리에서
최신 상태로 갱신한다.
