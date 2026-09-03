import { WritePostForm } from "@/features/write-post";

export default function WritePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">글쓰기</h1>
      <WritePostForm />
    </div>
  );
}
