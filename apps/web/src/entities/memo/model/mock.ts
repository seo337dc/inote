import { ApiError } from "@/shared/lib/api";
import { MEMO_MAX_COUNT } from "./constants";
import type { Memo, MemoTarget } from "./types";

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
];

// ---- 메모리 안의 가짜 서버: 메모장(대상별 조회·저장)과 메모 관리(전체 조회)가 같은 저장소를 본다. 새로고침하면 처음으로 돌아간다.
let store: Memo[] = MOCK_MEMOS.map((m) => ({ ...m }));
let seq = 0;

export function resetMockMemos() {
  store = MOCK_MEMOS.map((m) => ({ ...m }));
  seq = 0;
}

const sameTarget = (m: Memo, t: MemoTarget) => m.targetType === t.type && (t.type === "general" || m.targetId === t.id);
const byUpdatedDesc = (a: Memo, b: Memo) => b.updatedAt.localeCompare(a.updatedAt);

export const mockMemoApi = {
  getAll: async (): Promise<Memo[]> => [...store].sort(byUpdatedDesc).map((m) => ({ ...m })),
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
