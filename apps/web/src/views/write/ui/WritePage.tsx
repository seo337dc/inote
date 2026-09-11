import { WritePostForm } from "@/features/write-post";

type Props = {
  id: string | null;
};

export default function WritePage({ id }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <WritePostForm id={id} />
    </div>
  );
}
