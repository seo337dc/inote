import { CategoryFilter } from "@/features/filter-posts-by-category";
import { MOCK_POSTS } from "@/entities/post";
import { PostList } from "@/widgets/post-list";

type Props = {
  category: string | null;
};

export default function HomePage({ category }: Props) {
  const posts = category
    ? MOCK_POSTS.filter((post) => post.category === category)
    : MOCK_POSTS;

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-6 py-10">
      <CategoryFilter posts={MOCK_POSTS} activeCategory={category} />

      <div className="flex-1">
        <h1 className="mb-1 text-2xl font-bold">모든 글</h1>
        <p className="mb-6 text-sm text-zinc-500">
          로그인 없이 누구나 볼 수 있는 공개 피드입니다. (목업 데이터)
        </p>

        <PostList posts={posts} emptyMessage="이 카테고리엔 아직 글이 없습니다." />
      </div>
    </div>
  );
}
