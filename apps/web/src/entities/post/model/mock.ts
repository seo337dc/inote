import type { Post } from "./types";

// NavMobile/CategoryManager의 카테고리 개수 표시용으로만 남아있는 목업 (Category CRUD API 붙을 때 정리 예정)
export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "RAG 파이프라인 설계할 때 헷갈렸던 것들",
    content: "",
    excerpt: "임베딩 모델을 고르는 기준과, 통합 테이블 vs 분리 테이블 설계 고민을 정리했다.",
    category: "학습",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "2",
    title: "이직 준비 — 이번 주 지원 현황 정리",
    content: "",
    excerpt: "지원한 곳과 진행 상태, 다음 주에 준비할 것들을 기록해둔다.",
    category: "이직",
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    id: "3",
    title: "inote 시리즈로 devlog-llm을 다시 잡은 이유",
    content: "",
    excerpt: "혼자 쓰는 실험 프로젝트에서, 이미 있는 inote-server를 재사용하는 구조로 전환한 기록.",
    category: "블로그",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
  },
  {
    id: "4",
    title: "오늘의 회고",
    content: "",
    excerpt: "만다라트로 프로젝트 큰 틀을 다시 잡았다. 생각보다 정리가 잘 됐다.",
    category: "일기",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  },
  {
    id: "5",
    title: "Groq 무료 티어로 LLM 채팅 붙인 기록",
    content: "",
    excerpt: "SSE 스트리밍 연동 과정과 막혔던 부분들.",
    category: "기록",
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
  },
];
