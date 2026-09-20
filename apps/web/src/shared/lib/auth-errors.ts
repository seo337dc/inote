// Better Auth가 반환하는 에러 코드 → 한글 메시지
// (참고: inote-server node_modules/@better-auth/core/dist/error/codes.mjs 기준)
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 올바르지 않습니다.",
  INVALID_EMAIL: "올바른 이메일 형식이 아닙니다.",
  USER_NOT_FOUND: "가입되지 않은 이메일입니다.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일입니다.",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 합니다.",
  PASSWORD_TOO_LONG: "비밀번호가 너무 깁니다.",
  FAILED_TO_CREATE_USER: "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.",
  // 구글 로그인 콜백 에러 (better-auth OAuth callback, 소문자 snake_case — 위와 케이스 체계가 다름)
  // 뒤로가기 후 재로그인 시도 등으로 이미 소비된/만료된 state를 재사용하면 발생
  state_mismatch: "로그인 시도가 만료되었습니다. 다시 시도해주세요.",
  state_not_found: "로그인 시도가 만료되었습니다. 다시 시도해주세요.",
};

const DEFAULT_MESSAGE = "문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

export function translateAuthError(code?: string | null): string {
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  return DEFAULT_MESSAGE;
}

export type AuthFormField = "name" | "email" | "password" | "passwordConfirm";

// 서버 에러가 어느 입력칸 때문인지 — 에러 뜨면 그 칸으로 포커스 이동시키는 용도
const AUTH_ERROR_FIELDS: Record<string, AuthFormField> = {
  INVALID_EMAIL_OR_PASSWORD: "password",
  INVALID_EMAIL: "email",
  USER_NOT_FOUND: "email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "email",
  PASSWORD_TOO_SHORT: "password",
  PASSWORD_TOO_LONG: "password",
};

export function getAuthErrorField(code?: string | null): AuthFormField | null {
  if (code && AUTH_ERROR_FIELDS[code]) {
    return AUTH_ERROR_FIELDS[code];
  }
  return null;
}
