import { PenLine } from "lucide-react";

export default function InoteBlogBrand() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 겹쳐진 메모지 일러스트 */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute h-24 w-20 rotate-6 rounded-lg border border-zinc-300 bg-zinc-200 shadow-sm" />
        <div className="absolute h-24 w-20 -rotate-3 rounded-lg border border-zinc-300 bg-zinc-100 shadow-md" />
        <div className="absolute flex h-24 w-20 flex-col justify-between rounded-lg border-2 border-zinc-900 bg-white p-2.5 shadow-lg">
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-zinc-900/20" />
            <div className="h-2 w-5/6 rounded bg-zinc-900/20" />
            <div className="h-2 w-4/6 rounded bg-zinc-900/10" />
          </div>
          <div className="mt-auto flex items-center justify-end">
            <PenLine className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>
      </div>

      <h1 className="flex items-center gap-1 font-serif text-2xl font-extrabold italic tracking-tight text-zinc-900">
        <span className="font-sans text-lg font-light not-italic text-zinc-400">i</span>
        <span>Note Blog</span>
      </h1>
    </div>
  );
}
