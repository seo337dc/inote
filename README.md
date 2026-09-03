# inote-blog

노션처럼 쓰는 블로그 + 그 기록을 LLM이 분석·평가·검색해주는 iNote 시리즈의 블로그 서비스.

- **FE (이 레포)**: Next.js — 아직 미배포
- **BE**: `inote-server`의 `blog` 모듈 (기존 인증·DB 재사용)
- **AI 서비스**: 별도 Python/FastAPI 레포 (아직 이름 미정) — LLM 채팅·임베딩·RAG 전용

왜 만드는지/목표/성공 기준은 [`PLANNING.md`](./PLANNING.md), 전체 구조·단계별 전략은
[`STRATEGY.md`](./STRATEGY.md), 세션 간 맥락 유지 규칙은 [`CLAUDE.md`](./CLAUDE.md) 참고.

devlog-llm(개인 실험용 선행 프로젝트)에서 검증된 패턴(Groq 연동, RAG 설계, 대화 저장)을 최대한
재사용하며 진행 중.
