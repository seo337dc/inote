import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ReadingLogList from "./ReadingLogList";
import type { ReadingLog } from "@/entities/reading-log";

function makeLog(overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: "r1",
    userId: "u1",
    title: "어린 왕자",
    author: "생텍쥐페리",
    coverImageUrl: null,
    startedAt: null,
    finishedAt: null,
    content: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: null,
    aiSummary: null,
    ...overrides,
  };
}

describe("ReadingLogList — 표지 로딩", () => {
  // 목록은 화면 밖에 있는 항목이 많아서, 표지를 한꺼번에 받으면 첫 화면이 느려진다. 보이기 직전에 받도록 한다.
  it("표지는 지연 로딩·비동기 디코딩으로 불러온다", () => {
    render(<ReadingLogList logs={[makeLog({ coverImageUrl: "https://img.test/c.png" })]} />);

    const img = screen.getByRole("img", { name: "어린 왕자" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("표지가 없으면 이미지를 그리지 않는다", () => {
    render(<ReadingLogList logs={[makeLog()]} />);

    expect(screen.queryByRole("img")).toBeNull();
  });
});
