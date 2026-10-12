import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import type { DayCard as DayCardData } from "@/entities/daily";
import DayCard from "./DayCard";

const card: DayCardData = {
  date: "2026-10-11",
  entries: [
    { id: "e1", date: "2026-10-11", title: "독서", done: true, routineId: "r1" },
    { id: "e2", date: "2026-10-11", title: "이력서 수정", done: false, routineId: null },
  ],
};

describe("DayCard (날짜 카드)", () => {
  it("날짜 헤더와 항목, 루틴 칩, 합계 줄을 보여준다", () => {
    renderWithQueryClient(<DayCard card={card} />);

    const region = screen.getByRole("region", { name: "10월 11일 (일)" });
    expect(within(region).getByText("독서")).toBeInTheDocument();
    expect(within(region).getAllByText("매일")).toHaveLength(1); // 루틴에만 칩
    expect(within(region).getByText("2개 중 1개 완료")).toBeInTheDocument();
  });

  it("체크박스는 완료 상태를 반영한다", () => {
    renderWithQueryClient(<DayCard card={card} />);

    expect(screen.getByRole("checkbox", { name: "독서 완료" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "이력서 수정 완료" })).not.toBeChecked();
  });

  it("작업 일정은 오늘의 할일 카드에 나오지 않는다 ('할 일' 탭에서 본다)", () => {
    renderWithQueryClient(<DayCard card={card} isToday />);

    expect(screen.queryByRole("heading", { name: "작업 일정" })).not.toBeInTheDocument();
  });

  it("지난 카드에는 입력줄과 ⋯ 메뉴가 없다 (오늘 카드에만 있다)", () => {
    renderWithQueryClient(<DayCard card={card} />);

    expect(screen.queryByLabelText("할 일 입력")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /메뉴$/ })).not.toBeInTheDocument();
  });

  it("오늘 카드에는 '오늘' 표시와 입력줄, 모든 항목의 ⋯ 메뉴가 있다", () => {
    renderWithQueryClient(<DayCard card={card} isToday />);

    expect(screen.getByText("· 오늘")).toBeInTheDocument();
    expect(screen.getByLabelText("할 일 입력")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "독서 메뉴" })).toBeInTheDocument(); // 루틴
    expect(screen.getByRole("button", { name: "이력서 수정 메뉴" })).toBeInTheDocument(); // 그날 항목
  });

  it("입력줄에는 '매일 반복' 체크가 없다 (루틴은 ⋯ 메뉴에서 만든다)", () => {
    renderWithQueryClient(<DayCard card={card} isToday />);

    expect(screen.queryByLabelText("매일 반복")).not.toBeInTheDocument();
  });

  it("항목이 없으면 합계 줄이 안내 문구가 된다", () => {
    renderWithQueryClient(<DayCard card={{ ...card, entries: [] }} isToday />);

    expect(screen.getByText("아직 항목이 없어요")).toBeInTheDocument();
  });
});
