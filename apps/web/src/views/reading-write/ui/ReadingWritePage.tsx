import { WriteReadingLogForm } from "@/features/write-reading-log";

type Props = {
  id: string | null;
};

export default function ReadingWritePage({ id }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <WriteReadingLogForm id={id} />
    </div>
  );
}
