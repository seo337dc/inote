export default function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
    </div>
  );
}
