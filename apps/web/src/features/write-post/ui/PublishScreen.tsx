"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Globe, ImageIcon, Lock, Star } from "lucide-react";
import { api } from "@/shared/lib/api";
import { cn } from "@/shared/lib/utils";

type CategoryOption = { id: string; name: string; depth: number };

type Props = {
  open: boolean;
  onClose: () => void;
  // 제출은 바깥 <form>(formId)이 받는다 — 이 화면은 포털로 body에 그려지기 때문
  formId: string;
  publishLabel: string;
  isPublishing: boolean;
  error: string | null;
  title: string;
  thumbnailUrl: string;
  onThumbnailChange: (url: string) => void;
  category: string;
  onCategoryChange: (name: string) => void;
  categories: CategoryOption[];
  isPrivate: boolean;
  onPrivateChange: (value: boolean) => void;
  pinned: boolean;
  onPinnedChange: (value: boolean) => void;
};

// 글을 저장하기 직전에 뜨는 설정 화면 — 위에서 아래로 내려오듯 화면을 덮는다.
// 왼쪽은 썸네일·제목 미리보기, 오른쪽은 카테고리·공개 설정·즐겨찾기.
export default function PublishScreen({
  open,
  onClose,
  formId,
  publishLabel,
  isPublishing,
  error,
  title,
  thumbnailUrl,
  onThumbnailChange,
  category,
  onCategoryChange,
  categories,
  isPrivate,
  onPrivateChange,
  pinned,
  onPinnedChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/uploads/image", file),
    onSuccess: (result) => {
      setUploadError(null);
      onThumbnailChange(result.url);
    },
    onError: () => {
      setUploadError("이미지 업로드에 실패했어요. 5MB 이하 jpg·png·webp·gif만 올릴 수 있어요.");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 onChange가 발동하도록
    if (file) uploadMutation.mutate(file);
  }

  // 포털 대상(document.body)이 없는 서버 렌더에서는 그리지 않는다 (이 화면은 세션 확인 뒤에만 렌더돼 hydration 불일치는 없음)
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="저장 설정"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-50 px-6 py-10",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        open ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="grid w-full max-w-3xl gap-10 sm:grid-cols-2 sm:gap-0">
        <section className="sm:border-r sm:border-zinc-200 sm:pr-10">
          <h2 className="mb-3 text-lg font-bold">포스트 미리보기</h2>
          <div className="flex aspect-[1.91/1] items-center justify-center overflow-hidden rounded bg-zinc-200">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시
              <img src={thumbnailUrl} alt="썸네일 미리보기" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-16 text-zinc-400" aria-hidden />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            aria-label="썸네일 파일 선택"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              {uploadMutation.isPending
                ? "업로드 중..."
                : thumbnailUrl
                  ? "썸네일 다시 올리기"
                  : "썸네일 업로드"}
            </button>
            {thumbnailUrl && (
              <button
                type="button"
                onClick={() => onThumbnailChange("")}
                className="text-sm text-zinc-500 underline hover:text-zinc-700"
              >
                제거
              </button>
            )}
          </div>
          {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
          <p className="mt-6 line-clamp-2 break-words text-base font-semibold">{title}</p>
        </section>

        <section className="flex flex-col sm:pl-10">
          <h2 className="mb-2 text-lg font-bold">카테고리</h2>
          {/* 브라우저 기본 화살표는 오른쪽 끝에 붙어서, 기본 모양을 끄고 안쪽으로 띄운 아이콘을 얹는다 */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="카테고리"
              className="w-full appearance-none rounded border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {"　".repeat(c.depth - 1)}
                  {c.depth > 1 ? "└ " : ""}
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
          </div>
          <Link href="/categories" className="mt-1.5 text-xs text-zinc-500 hover:text-zinc-700">
            카테고리 관리
          </Link>

          <h2 className="mb-2 mt-8 text-lg font-bold">공개 설정</h2>
          <div className="grid grid-cols-2 gap-3">
            <VisibilityButton
              active={!isPrivate}
              onClick={() => onPrivateChange(false)}
              icon={<Globe className="size-4" aria-hidden />}
              label="전체 공개"
            />
            <VisibilityButton
              active={isPrivate}
              onClick={() => onPrivateChange(true)}
              icon={<Lock className="size-4" aria-hidden />}
              label="비공개"
            />
          </div>

          <button
            type="button"
            onClick={() => onPinnedChange(!pinned)}
            aria-pressed={pinned}
            className="mt-6 flex items-center gap-1.5 self-start text-sm text-zinc-600 hover:text-zinc-800"
          >
            <Star className={cn("size-4", pinned && "fill-amber-400 text-amber-400")} aria-hidden />
            즐겨찾기 (목록 상단에 고정)
          </button>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <div className="mt-10 flex items-center justify-end gap-3 sm:mt-auto sm:pt-10">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="rounded px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              form={formId}
              disabled={isPublishing}
              className="rounded bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPublishing ? "저장 중..." : publishLabel}
            </button>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

function VisibilityButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded border px-3 py-3 text-sm",
        active
          ? "border-zinc-900 bg-white font-medium text-zinc-900"
          : "border-transparent bg-white text-zinc-400 hover:text-zinc-600",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
