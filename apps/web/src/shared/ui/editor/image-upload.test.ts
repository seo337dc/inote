import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, pickImageFiles, validateImageFile } from "./image-upload";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe("validateImageFile", () => {
  it("JPEG·PNG·WEBP·GIF는 통과한다", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validateImageFile(file("a", type))).toBeNull();
    }
  });

  it("다른 형식은 안내 문구를 돌려준다", () => {
    expect(validateImageFile(file("a.svg", "image/svg+xml"))).toContain("JPEG, PNG, WEBP, GIF");
  });

  it("5MB를 넘으면 안내 문구를 돌려준다 (5MB 정확히는 통과)", () => {
    expect(validateImageFile(file("a.png", "image/png", MAX_IMAGE_BYTES))).toBeNull();
    expect(validateImageFile(file("a.png", "image/png", MAX_IMAGE_BYTES + 1))).toContain("5MB");
  });
});

describe("pickImageFiles", () => {
  it("이미지 파일만 골라낸다", () => {
    const image = file("a.png", "image/png");
    expect(pickImageFiles([file("a.txt", "text/plain"), image])).toEqual([image]);
  });

  it("없으면 빈 배열이다", () => {
    expect(pickImageFiles(null)).toEqual([]);
    expect(pickImageFiles(undefined)).toEqual([]);
  });
});
