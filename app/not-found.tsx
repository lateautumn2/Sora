import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5" id="main-content">
      <div className="text-center">
        <p className="font-mono text-sm text-[var(--primary)]">404</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">没有找到这个页面</h1>
        <Link
          className="mt-7 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          返回首页
        </Link>
      </div>
    </main>
  );
}
