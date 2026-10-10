import { WritePostForm } from "@/features/write-post";

type Props = {
  id: string | null;
};

export default function WritePage({ id }: Props) {
  return (
    // 왼쪽 설정 영역이 들어갈 폭까지 넓히고, 본문 열의 폭 제한(max-w-4xl)은 WritePostForm이 건다
    <div className="mx-auto max-w-[90rem] px-6 py-10">
      <WritePostForm id={id} />
    </div>
  );
}
