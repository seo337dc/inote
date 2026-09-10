type Props = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="text-sm text-zinc-500">{description ?? "준비 중입니다."}</p>
    </div>
  );
}
