"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo, type Todo } from "@/entities/todo";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDue(dueDate: string) {
  const d = new Date(dueDate);
  return `${d.getMonth() + 1}.${d.getDate()}.`;
}

export default function TodosPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: todos, isPending: isTodosPending } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [doneOpen, setDoneOpen] = useState(false);

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session || isTodosPending || !todos) {
    return <PageLoading />;
  }

  const activeTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createTodo.mutate({ title: trimmed, ...(dueDate ? { dueDate } : {}) });
    setTitle("");
    setDueDate("");
  }

  function renderRow(todo: Todo) {
    const overdue = todo.dueDate && !todo.done && todo.dueDate.slice(0, 10) < todayStr();
    return (
      <li key={todo.id} className="group flex items-center gap-2.5 border-b border-zinc-100 py-3 last:border-none">
        <button
          type="button"
          onClick={() => updateTodo.mutate({ id: todo.id, done: !todo.done })}
          aria-label="완료 표시"
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            todo.done
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 hover:border-zinc-500"
          }`}
        >
          {todo.done && <Check className="size-3" strokeWidth={2.5} />}
        </button>

        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            todo.done ? "text-zinc-400 line-through" : "text-zinc-900"
          }`}
        >
          {todo.title}
        </span>

        {todo.dueDate && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
              overdue ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {formatDue(todo.dueDate)}
          </span>
        )}

        <button
          type="button"
          onClick={() => deleteTodo.mutate(todo.id)}
          aria-label="삭제"
          className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-10">
      <div className="mb-5 flex items-baseline gap-1.5 border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-bold">할 일</h1>
        <span className="text-xl font-bold text-red-500">{activeTodos.length}</span>
      </div>

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          maxLength={200}
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-32 rounded border border-zinc-300 px-2 py-2 text-xs text-zinc-500 outline-none focus:border-zinc-500 sm:w-36 sm:text-sm"
        />
        <button
          type="submit"
          disabled={createTodo.isPending}
          className="shrink-0 rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          추가
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          아직 할 일이 없어요.
          <br />
          위에서 첫 항목을 추가해보세요.
        </p>
      ) : (
        <>
          <ul>{activeTodos.map(renderRow)}</ul>

          {doneTodos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setDoneOpen((v) => !v)}
                className="mt-2 flex w-full items-center gap-1 border-t border-zinc-200 py-3 text-left text-sm text-zinc-500 hover:text-zinc-900"
              >
                <ChevronRight
                  className={`size-3.5 transition-transform ${doneOpen ? "rotate-90" : ""}`}
                />
                완료 {doneTodos.length}개 {doneOpen ? "숨기기" : "보기"}
              </button>
              {doneOpen && <ul>{doneTodos.map(renderRow)}</ul>}
            </>
          )}
        </>
      )}
    </div>
  );
}
