import { ApiError } from "@/shared/lib/api";
import { MEMO_MAX_COUNT } from "./constants";
import { compareGroups, keyOf } from "./groupRules";
import type { Memo, MemoGroup, MemoGroupPage, MemoTarget } from "./types";

export const isMemosMock = () => process.env.NEXT_PUBLIC_MEMOS_MOCK === "true";

// UI 확인용 목 데이터 — 서버의 일반 메모·전체 메모 조회(계약: docs/todo/memo.md 3차)가 준비되기 전에
// NEXT_PUBLIC_MEMOS_MOCK=true 로 화면을 확인할 때만 쓴다. 최근 수정순.
// 시각은 불러온 때 기준 "몇 시간 전"으로 만든다 — 고정 날짜면 새로 만든 메모가 맨 위로 오지 않는 일이 생긴다
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const MOCK_MEMOS: Memo[] = [
  { id: "mm1", targetType: "general", targetId: "", targetTitle: null, title: "장보기", content: "우유, 계란, 두부\n주말에 대청소 하기 전에 세제 사 둘 것", createdAt: ago(1.5), updatedAt: ago(1) },
  { id: "mm2", targetType: "post", targetId: "p1", targetTitle: "RAG 파이프라인 설계 메모", title: "청크 크기", content: "청크 크기와 오버랩을 얼마로 할지 아직 결론을 못 냈다. 500/50, 1000/100을 비교해서 검색 품질을 확인해 볼 것.", createdAt: ago(26.5), updatedAt: ago(26) },
  { id: "mm3", targetType: "reading", targetId: "r1", targetTitle: "클린 코드", content: "3장 함수 — 한 가지 일만 하라. 인상 깊었던 문장을 나중에 글감으로 정리하기.", title: "", createdAt: ago(50.5), updatedAt: ago(50) },
  { id: "mm4", targetType: "general", targetId: "", targetTitle: null, title: "", content: "", createdAt: ago(74.5), updatedAt: ago(74) },
  { id: "mm5", targetType: "post", targetId: "p2", targetTitle: "미완성인 아주 아주 긴 제목의 글은 한 줄로 잘려서 보여야 합니다 말줄임 처리 확인용 제목", title: "나중에 확인", content: "모르는 용어 정리: 임베딩, 코사인 유사도, 재순위화(rerank). 각각 한 줄 설명 추가하기.", createdAt: ago(98.5), updatedAt: ago(98) },
  { id: "mm6", targetType: "reading", targetId: "r2", targetTitle: "함께 자라기", title: "독서 메모", content: "팀 회고 방식 — 킵/프라블럼/트라이. 다음 스프린트에 적용해 보기.", createdAt: ago(122.5), updatedAt: ago(122) },
  // 같은 글·독서 기록에 메모가 여러 장인 경우(묶기 화면 확인용)
  { id: "mm7", targetType: "post", targetId: "p1", targetTitle: "RAG 파이프라인 설계 메모", title: "평가 지표", content: "검색 품질은 recall@k와 MRR로 본다. 질문 20개짜리 평가 세트를 먼저 만들 것.", createdAt: ago(27.5), updatedAt: ago(27) },
  { id: "mm8", targetType: "post", targetId: "p1", targetTitle: "RAG 파이프라인 설계 메모", title: "", content: "재순위화(rerank)는 마지막에 붙이기.", createdAt: ago(28.5), updatedAt: ago(28) },
  { id: "mm9", targetType: "reading", targetId: "r1", targetTitle: "클린 코드", title: "10장 클래스", content: "클래스는 작아야 한다 — 책임이 하나여야 한다.", createdAt: ago(51.5), updatedAt: ago(51) },
  { id: "mm10", targetType: "general", targetId: "", targetTitle: null, title: "독서 계획", content: "이번 달: 클린 코드, 함께 자라기 마무리.", createdAt: ago(150.5), updatedAt: ago(150) },
];

// 무한 스크롤·성능 확인용 대량 데이터 — NEXT_PUBLIC_MEMOS_MOCK_EXTRA=1000 이면 일반 메모 1000개를 더 만든다.
// 가장 오래된 기본 메모보다 더 예전 시각으로 만들어 목록 맨 뒤에 이어 붙는다(번호가 클수록 오래됨 → 스크롤하며 #1, #2, … 순서로 나온다).
function bulkMemos(): Memo[] {
  const count = Number(process.env.NEXT_PUBLIC_MEMOS_MOCK_EXTRA);
  if (!Number.isInteger(count) || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `bulk-${n}`,
      targetType: "general" as const,
      targetId: "",
      targetTitle: null,
      title: `대량 메모 #${n}`,
      content: `무한 스크롤 확인용 ${n}번째 일반 메모입니다.\n여러 줄 내용이 어떻게 보이는지 확인합니다. (${n} / ${count})`,
      createdAt: ago(200 + n / 10 + 0.05),
      updatedAt: ago(200 + n / 10),
    };
  });
}

const initialStore = () => [...MOCK_MEMOS, ...bulkMemos()].map((m) => ({ ...m }));

// ---- 메모리 안의 가짜 서버: 메모장(대상별 조회·저장)과 메모 관리(전체 조회)가 같은 저장소를 본다. 새로고침하면 처음으로 돌아간다.
let store: Memo[] = initialStore();
let seq = 0;

export function resetMockMemos() {
  store = initialStore();
  seq = 0;
}

const sameTarget = (m: Memo, t: MemoTarget) => m.targetType === t.type && (t.type === "general" || m.targetId === t.id);

export const mockMemoApi = {
  // 서버의 GET /memos/groups를 흉내 낸다: 글·독서는 대상별, 일반은 한 장씩 묶고, 그룹의 최근 수정순 + 키셋 페이지네이션
  getGroups: async (query: { targetType?: string; cursor?: string; limit?: number } = {}): Promise<MemoGroupPage> => {
    const limit = query.limit ?? 20;
    const byKey = new Map<string, Memo[]>();
    for (const m of store) {
      if (query.targetType && m.targetType !== query.targetType) continue;
      const key = keyOf(m.targetType, m.targetId, m.id);
      byKey.set(key, [...(byKey.get(key) ?? []), m]);
    }
    let groups: MemoGroup[] = [...byKey].map(([key, list]) => {
      const memos = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((m) => ({ ...m }));
      return { key, targetType: memos[0].targetType, targetId: memos[0].targetId, targetTitle: memos[0].targetTitle ?? null, updatedAt: memos[0].updatedAt, memos };
    });
    groups.sort(compareGroups);
    if (query.cursor) {
      const [updatedAt, key] = query.cursor.split("|");
      groups = groups.filter((g) => g.updatedAt < updatedAt || (g.updatedAt === updatedAt && g.key < key));
    }
    const items = groups.slice(0, limit);
    const last = items[items.length - 1];
    return { items, nextCursor: groups.length > limit && last ? `${last.updatedAt}|${last.key}` : null };
  },
  // 대상별 조회는 만든 순서(오래된 것부터)
  get: async (target: MemoTarget): Promise<Memo[]> =>
    store
      .filter((m) => sameTarget(m, target))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ ...m })),
  create: async (target: MemoTarget, fields: { title?: string; content?: string }): Promise<Memo> => {
    if (store.filter((m) => sameTarget(m, target)).length >= MEMO_MAX_COUNT) throw new ApiError(409, "메모는 최대 10장까지 만들 수 있습니다");
    const now = new Date().toISOString();
    const memo: Memo = {
      id: `mock-${++seq}`,
      targetType: target.type,
      targetId: target.type === "general" ? "" : target.id,
      targetTitle: null,
      title: fields.title ?? "",
      content: fields.content ?? "",
      createdAt: now,
      updatedAt: now,
    };
    store.push(memo);
    return { ...memo };
  },
  update: async (id: string, fields: { title?: string; content?: string }): Promise<Memo> => {
    const memo = store.find((m) => m.id === id);
    if (!memo) throw new ApiError(404, "메모를 찾을 수 없습니다");
    Object.assign(memo, fields, { updatedAt: new Date().toISOString() });
    return { ...memo };
  },
  remove: async (id: string): Promise<void> => {
    store = store.filter((m) => m.id !== id);
  },
};
