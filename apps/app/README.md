# apps/app — 모바일 앱 (예정, 미착수)

`inote`를 모바일에서도 쓸 수 있게 하는 앱. 아직 코드 없음 — 계획만 정리된 상태.

## 방향 (2026-09-10 기준)

- `inote-money`의 `apps/app`과 동일하게 **React Native(Expo) + WebView** 하이브리드 구조를 검토 중
  (`apps/web`의 배포 URL을 WebView로 그대로 로드, 네이티브 모듈이 꼭 필요한 기능만 RN으로 추가)
- 상세 아키텍처(로그인 방식, 플랫폼 우선순위 등)는 실제 착수 시점에 확정

## 참고

- 동일 패턴 선행 사례: [`inote-money/apps/app`](https://github.com/seo337dc/inote-money/tree/main/apps/app)
- 협업 방식(사람이 직접 코딩, Claude는 가이드만 — 페어 튜터 모드)도 착수 시 `inote-money`와 동일하게 적용 예정
