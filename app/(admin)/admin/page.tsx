import { FilePenLine, MessageSquareText, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

import { getDashboardStats } from "@/lib/content/service";

export default function AdminDashboardPage() {
  const summary = getDashboardStats();
  const stats = [
    { label: "已发布文章", value: summary.publishedPosts, icon: FilePenLine },
    { label: "待审核评论", value: summary.pendingComments, icon: MessageSquareText },
    { label: "累计浏览", value: summary.totalViews, icon: TrendingUp },
  ] as const;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">仪表盘</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">内容与互动概览</p>
        </div>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          href="/admin/posts/new"
        >
          <Plus aria-hidden="true" size={17} />
          新建文章
        </Link>
      </div>

      <section aria-label="站点统计" className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              className="rounded-[var(--radius)] border border-[var(--border)] p-5"
              key={item.label}
            >
              <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                <span>{item.label}</span>
                <Icon aria-hidden="true" size={17} />
              </div>
              <p className="mt-4 font-mono text-3xl font-semibold">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-10" aria-labelledby="recent-activity">
        <h2
          className="border-b border-[var(--border)] pb-3 text-lg font-semibold"
          id="recent-activity"
        >
          最近动态
        </h2>
        <div className="py-12 text-center text-sm text-[var(--muted)]">暂无内容变更</div>
      </section>
    </div>
  );
}
