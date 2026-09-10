import { CategoryManager } from "@/features/manage-categories";

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">카테고리 수정</h1>
      <p className="mb-6 text-sm text-zinc-500">
        내 글의 카테고리를 조회·추가합니다. (목업 데이터 · 저장 API 연동 전)
      </p>
      <CategoryManager />
    </div>
  );
}
