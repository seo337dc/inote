import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("children 텍스트를 렌더링한다", () => {
    render(<Badge>관리자</Badge>);
    expect(screen.getByText("관리자")).toBeInTheDocument();
  });

  it("variant에 따라 다른 클래스를 적용한다", () => {
    render(<Badge variant="secondary">관리자</Badge>);
    expect(screen.getByText("관리자")).toHaveClass("bg-secondary");
  });
});
