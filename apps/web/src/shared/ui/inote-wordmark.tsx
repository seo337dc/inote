type Props = {
  className?: string;
};

export function InoteWordmark({ className = "text-lg" }: Props) {
  return (
    <span className={`flex items-center gap-0.5 font-serif font-extrabold italic tracking-tight text-zinc-900 ${className}`}>
      <span className="font-sans font-light not-italic text-zinc-400">i</span>
      <span>Note</span>
    </span>
  );
}
