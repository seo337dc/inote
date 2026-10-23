@AGENTS.md

> 레포 전체 공통 규칙은 [`../../CLAUDE.md`](../../CLAUDE.md) 참고 (여기서 걸어서 못 오는
> 위치라 놓치기 쉬움 — FE 작업 원칙, 커밋 규칙, **커밋 전 체크리스트** 등 대부분 거기 있음).
> 체크리스트를 이 파일에 따로 복사해 두지 않는다 — 두 벌이 되면 서로 어긋남(E2E 보류 상태가 실제로
> 충돌했던 적 있음).

## 이 폴더(`apps/web`)에서 쓰는 명령

```bash
pnpm dev        # http://localhost:3011
pnpm test       # Vitest (단위·컴포넌트, MSW)
pnpm lint       # ESLint — FSD 레이어 위반도 여기서 잡힘
pnpm build      # 타입 에러 확인
pnpm test:e2e   # Playwright (로컬에 inote-server가 :3200에 떠 있어야 함 — 현재 보류 중, 루트 CLAUDE.md 참고)
```

FE 테스트 개념(단위/컴포넌트/E2E 차이, Vitest를 쓰는 이유 등)이 처음이라면
[`../../docs/learning/FE_TESTING.md`](../../docs/learning/FE_TESTING.md) 먼저 읽을 것.
