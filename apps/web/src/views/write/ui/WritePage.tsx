import { notFound } from "next/navigation";
import { WritePostForm } from "@/features/write-post";
import type { Post } from "@/entities/post";
import { api, ApiError } from "@/shared/lib/api";

type Props = {
  id: string | null;
};

export default async function WritePage({ id }: Props) {
  let post: Post | undefined;

  if (id) {
    try {
      post = await api.get<Post>(`/blog/posts/${id}`, { cache: "no-store" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">{post ? "글 수정" : "글쓰기"}</h1>
      <WritePostForm post={post} />
    </div>
  );
}
