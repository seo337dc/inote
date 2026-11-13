import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmbeddingStatusBadge from "./EmbeddingStatusBadge";
import type { EmbeddingStatus } from "../model/useAdminEmbeddings";

const CASES: [EmbeddingStatus, string, string[]][] = [
  ["done", "완료", ["bg-green-50", "text-green-700"]],
  ["failed", "실패", ["bg-red-50", "text-red-600"]],
  ["pending", "대기", ["bg-yellow-50", "text-yellow-700"]],
  ["processing", "처리 중", ["bg-blue-50", "text-blue-700"]],
  ["incomplete", "미완료", ["bg-orange-50", "text-orange-700"]],
  ["outdated", "재임베딩 필요", ["bg-purple-50", "text-purple-700"]],
  ["excluded", "대상 아님", ["bg-zinc-100", "text-zinc-500"]],
  ["unknown", "확인 불가", ["bg-zinc-100", "text-zinc-500"]],
];

describe("EmbeddingStatusBadge", () => {
  it.each(CASES)("%s 상태는 '%s'를 정해진 색으로 보여준다", (status, label, classes) => {
    render(<EmbeddingStatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(...classes);
  });

  it("재임베딩 필요는 시각을 비교한 추정이라는 설명을 툴팁으로 보여준다", () => {
    render(<EmbeddingStatusBadge status="outdated" />);
    expect(screen.getByText("재임베딩 필요")).toHaveAttribute("title", expect.stringContaining("추정"));
  });

  it("detail이 있으면(실패 원인) 기본 설명 대신 툴팁에 보여준다", () => {
    render(<EmbeddingStatusBadge status="failed" detail="임베딩 서비스가 500을 돌려줬습니다." />);
    expect(screen.getByText("실패")).toHaveAttribute("title", "임베딩 서비스가 500을 돌려줬습니다.");
  });
});
