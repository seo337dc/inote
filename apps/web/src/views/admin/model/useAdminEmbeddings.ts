"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

// 글 하나의 임베딩 상태 (우선순위 순서는 BE가 정한다).
// - excluded: 임시저장·비공개·보관 글 — 임베딩 대상이 아님
// - unknown: 임베딩 관리 서버(inote-ai)가 응답하지 않아 알 수 없음
// - outdated: 임베딩한 시각이 글을 마지막으로 고친 시각보다 이전 (시각 비교라 추정이다)
export type EmbeddingStatus =
  | "excluded"
  | "unknown"
  | "processing"
  | "pending"
  | "failed"
  | "incomplete"
  | "outdated"
  | "done";

// 상태 탭 — "incomplete"는 incomplete·outdated·pending·processing(아직 끝나지 않은 것 전부)을 묶는다.
export type EmbeddingFilter = "all" | "incomplete" | "failed" | "done" | "excluded";

export type AdminEmbeddingJob = {
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  lastError: string | null;
};

export type AdminEmbeddingItem = {
  postId: string;
  title: string;
  category: string;
  isPrivate: boolean;
  isArchived: boolean;
  isPublished: boolean;
  lastEditedAt: string | null;
  status: EmbeddingStatus;
  chunkCount: number;
  embeddedAt: string | null;
  job: AdminEmbeddingJob | null;
};

export type AdminEmbeddingCounts = {
  done: number;
  incomplete: number;
  outdated: number;
  pending: number;
  processing: number;
  failed: number;
};

export type AdminEmbeddingsPage = {
  items: AdminEmbeddingItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // 페이지가 아니라 **전체 글** 기준. counts는 상태를 알 수 없으면(aiAvailable=false) null.
  summary: {
    eligible: number;
    excluded: number;
    counts: AdminEmbeddingCounts | null;
  };
  // 임베딩 서버(KURE)에 닿는지 — inote-ai가 확인한 값
  embedder: { reachable: boolean };
  // inote-ai 자체가 응답했는지. false면 목록은 오고 상태는 모두 unknown이다.
  aiAvailable: boolean;
};

export function useAdminEmbeddings(page: number, status: EmbeddingFilter, pageSize = 20) {
  return useQuery({
    queryKey: ["admin-embeddings", page, status, pageSize],
    queryFn: () =>
      api.get<AdminEmbeddingsPage>(
        `/admin/embeddings?page=${page}&pageSize=${pageSize}&status=${status}`,
      ),
    // 페이지·탭을 옮길 때 이전 목록을 유지한 채 로딩 — 매번 깜빡이며 빈 화면이 되는 것 방지
    placeholderData: keepPreviousData,
  });
}
