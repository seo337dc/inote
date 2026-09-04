type Props = {
  title: string;
  count: number;
};

export default function PostListHeader({ title, count }: Props) {
  return (
    <div className="mb-6 flex items-baseline gap-1.5 border-b border-zinc-200 pb-3">
      <h1 className="text-xl font-bold">{title}</h1>
      <span className="text-xl font-bold text-red-500">{count}</span>
    </div>
  );
}
