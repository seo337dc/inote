import { ApiError } from "@/shared/lib/api";

export const MOVE_FAILED_MESSAGE = "카테고리를 옮기지 못했어요. 원래대로 되돌렸어요.";

// 서버가 "왜 안 되는지"를 직접 알려준 오류(400 규칙 위반·404 없음·409 같은 이름)는 그 message를 그대로 보여준다.
// 네트워크 오류·5xx처럼 사용자에게 이유를 말해 줄 수 없는 오류는 일반 안내로 대신한다.
const SERVER_EXPLAINED_STATUSES = new Set([400, 404, 409]);

export function moveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && SERVER_EXPLAINED_STATUSES.has(error.status) && error.message) {
    return error.message;
  }
  return MOVE_FAILED_MESSAGE;
}
