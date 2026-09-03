"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/my-posts", label: "나의 글" },
  { href: "/write", label: "글쓰기" },
  { href: "/categories", label: "카테고리" },
  { href: "/dev-guide", label: "dev-guide" },
  { href: "/profile", label: "내 정보" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold">
          inote-blog
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-2 rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
