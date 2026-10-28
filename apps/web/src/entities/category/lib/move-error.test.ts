import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/api";
import { MOVE_FAILED_MESSAGE, moveErrorMessage } from "./move-error";

describe("moveErrorMessage", () => {
  it("409(같은 이름이 이미 있음)는 서버 message를 그대로 쓴다", () => {
    const error = new ApiError(409, "같은 위치에 같은 이름의 카테고리가 이미 있습니다.");
    expect(moveErrorMessage(error)).toBe("같은 위치에 같은 이름의 카테고리가 이미 있습니다.");
  });

  it.each([400, 404])("%i도 서버 message를 그대로 쓴다", (status) => {
    expect(moveErrorMessage(new ApiError(status, "서버가 준 이유"))).toBe("서버가 준 이유");
  });

  it("5xx는 일반 안내를 쓴다", () => {
    expect(moveErrorMessage(new ApiError(500, "Internal Server Error"))).toBe(MOVE_FAILED_MESSAGE);
  });

  it("네트워크 오류 등 ApiError가 아니면 일반 안내를 쓴다", () => {
    expect(moveErrorMessage(new TypeError("Failed to fetch"))).toBe(MOVE_FAILED_MESSAGE);
  });

  it("서버 message가 비어 있으면 일반 안내를 쓴다", () => {
    expect(moveErrorMessage(new ApiError(409, ""))).toBe(MOVE_FAILED_MESSAGE);
  });
});
