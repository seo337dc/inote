import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { getLastListUrl } from "@/shared/lib/list-url";
import ListUrlRecorder from "./ListUrlRecorder";

let pathname = "/";
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

describe("ListUrlRecorder", () => {
  afterEach(() => sessionStorage.clear());

  it("지금 보고 있는 목록 주소(경로+쿼리)를 기록한다", () => {
    pathname = "/my-posts";
    search = "categoryId=3&page=2";

    render(<ListUrlRecorder />);

    expect(getLastListUrl()).toBe("/my-posts?categoryId=3&page=2");
  });

  it("쿼리가 없으면 경로만 기록한다", () => {
    pathname = "/";
    search = "";

    render(<ListUrlRecorder />);

    expect(getLastListUrl()).toBe("/");
  });
});
