import type { EmbeddingStatus } from "../model/useAdminEmbeddings";

const STATUS_VIEW: Record<EmbeddingStatus, { label: string; className: string; hint?: string }> = {
  excluded: { label: "대상 아님", className: "bg-zinc-100 text-zinc-500", hint: "임시저장·비공개·보관 글은 임베딩하지 않습니다." },
  unknown: { label: "확인 불가", className: "bg-zinc-100 text-zinc-500", hint: "임베딩 관리 서버가 응답하지 않아 상태를 알 수 없습니다." },
  processing: { label: "처리 중", className: "bg-blue-50 text-blue-700" },
  pending: { label: "대기", className: "bg-yellow-50 text-yellow-700" },
  failed: { label: "실패", className: "bg-red-50 text-red-600" },
  incomplete: { label: "미완료", className: "bg-orange-50 text-orange-700", hint: "글 벡터 또는 조각이 아직 없습니다." },
  outdated: {
    label: "재임베딩 필요",
    className: "bg-purple-50 text-purple-700",
    hint: "임베딩한 시각이 글을 마지막으로 고친 시각보다 이전입니다. 시각을 비교한 추정이라 실제와 다를 수 있습니다.",
  },
  done: { label: "완료", className: "bg-green-50 text-green-700" },
};

// 회원 목록의 UsageBadge와 같은 알약 모양 — 상태마다 색만 다르다.
export default function EmbeddingStatusBadge({
  status,
  detail,
}: {
  status: EmbeddingStatus;
  // 실패 원인처럼 배지에 마우스를 올렸을 때 보여줄 추가 설명
  detail?: string | null;
}) {
  const view = STATUS_VIEW[status];
  return (
    <span
      title={detail ?? view.hint}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${view.className}`}
    >
      {view.label}
    </span>
  );
}
