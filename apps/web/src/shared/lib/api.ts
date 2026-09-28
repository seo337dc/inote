const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // better-auth를 감싼 엔드포인트(예: /users/set-password)는 { message, code } 형태로
    // 에러를 내려줌 — code가 있으면 auth-errors.ts의 translateAuthError로 그대로 매핑 가능.
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // 파일 업로드 전용 — FormData를 쓰므로 Content-Type을 강제로 json으로 덮어쓰면 안 됨
  // (브라우저가 알아서 multipart 경계값까지 포함해서 채워줘야 함).
  upload: async <T>(path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message ?? res.statusText, body.code);
    }
    return res.json() as Promise<T>;
  },
};
