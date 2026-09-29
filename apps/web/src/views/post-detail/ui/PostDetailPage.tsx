import { cookies } from "next/headers";
import type { Post } from "@/entities/post";
import { api, ApiError } from "@/shared/lib/api";
import OwnerPostFallback from "./OwnerPostFallback";
import PostArticle from "./PostArticle";

type Props = {
  id: string;
};

export default async function PostDetailPage({ id }: Props) {
  // 서버 컴포넌트의 fetch는 브라우저 쿠키를 자동으로 안 실어줘서, 쿠키를 직접 포워딩한다.
  // 다만 배포 환경은 FE(Vercel)와 BE(Render) 도메인이 달라서 로그인 쿠키가 BE 도메인에만
  // 저장돼 있고 FE 서버는 받을 수 없다 — 그러면 작성자 본인의 비공개/draft 글도 여기선
  // 404로 보이므로, 404일 땐 바로 notFound() 하지 않고 브라우저에서(쿠키 포함) 한 번 더 확인한다.
  const cookieHeader = (await cookies()).toString();

  let post: Post;
  try {
    post = await api.get<Post>(`/blog/posts/${id}`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return <OwnerPostFallback id={id} />;
    throw e;
  }

  return <PostArticle post={post} />;
}
