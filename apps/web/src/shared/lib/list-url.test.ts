import { afterEach, describe, expect, it, vi } from "vitest";
import { getLastListUrl, rememberListUrl } from "./list-url";

describe("list-url", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("기록한 목록 주소(쿼리 포함)를 그대로 돌려준다", () => {
    rememberListUrl("/my-posts?categoryId=3&page=2&q=react");

    expect(getLastListUrl()).toBe("/my-posts?categoryId=3&page=2&q=react");
  });

  it("기록이 없으면 null이다", () => {
    expect(getLastListUrl()).toBeNull();
  });

  it("나중에 기록한 주소가 이전 것을 덮어쓴다", () => {
    rememberListUrl("/?page=2");
    rememberListUrl("/users/u1");

    expect(getLastListUrl()).toBe("/users/u1");
  });

  it("앱 안의 경로가 아닌 값(외부 주소·//로 시작)은 무시한다", () => {
    sessionStorage.setItem("inote:last-list-url", "https://evil.example/x");
    expect(getLastListUrl()).toBeNull();

    sessionStorage.setItem("inote:last-list-url", "//evil.example/x");
    expect(getLastListUrl()).toBeNull();
  });

  it("sessionStorage가 막혀 있어도(throw) 에러 없이 동작한다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => rememberListUrl("/")).not.toThrow();
    expect(getLastListUrl()).toBeNull();
  });
});
