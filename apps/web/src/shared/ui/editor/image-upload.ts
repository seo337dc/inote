import { api } from "@/shared/lib/api";

// BE `POST /uploads/post-image`와 같은 규칙 — 올리기 전에 막아서 헛된 요청을 줄인다 (서버가 최종 판정).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");

export type UploadImage = (file: File) => Promise<{ url: string }>;

// 글 이미지는 먼저 tmp에 올라가고(응답의 url이 tmp 주소), 저장(발행)할 때 BE가 영구 폴더로 옮긴다.
export const uploadPostImage: UploadImage = (file) => api.upload<{ url: string }>("/uploads/post-image", file);

export function validateImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) return "이미지는 JPEG, PNG, WEBP, GIF만 올릴 수 있어요.";
  if (file.size > MAX_IMAGE_BYTES) return "이미지는 5MB 이하만 올릴 수 있어요.";
  return null;
}

// 붙여넣기·드롭으로 들어온 파일 중 이미지(형식이 맞지 않는 이미지 포함)만 골라낸다. 이미지가 없으면 빈 배열 — 에디터의 기본 동작에 맡긴다.
export function pickImageFiles(files: FileList | File[] | null | undefined): File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
}
