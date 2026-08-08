import { BarChart3, Eye, FilePenLine, MessageSquareText, TrendingUp } from "lucide-react";
import Link from "next/link";

import { PostPagination } from "@/components/site/post-pagination";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { getDashboardStats, listTopPostsByViews } from "@/lib/content/service";

const TABLE_PAGE_SIZE = 10;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = resolvePage((await searchParams).page);
  const summary = getDashboardStats();
  const table = listTopPostsByViews(TABLE_PAGE_SIZE, (page - 1) * TABLE_PAGE_SIZE);
  const totalPages = resolveTotalPages(table.total, TABLE_PAGE_SIZE);
  const stats = [
    { label: "已发布文章", value: summary.publishedPosts, icon: FilePenLine },
    { label: "待审评论", value: summary.pendingComments, icon: MessageSquareText },
    { label: "累计浏览", value: summary.totalViews, icon: Eye },
    { label: "累计评论", value: summary.totalComments, icon: MessageSquareText },
  ] as const;

  const chartPosts = summary.topPosts.slice(0, 10);
  const maxViews = Math.max(...chartPosts.map((post) => post.viewCount), 1);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>仪表盘</h1>
          <p>内容、互动与流量概览</p>
        </div>
      </header>

      <section aria-label="站点统计" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div className="admin-stat-card" key={item.label}>
              <div className="flex items-start justify-between gap-3 text-sm text-[var(--muted)]">
                <span>{item.label}</span>
                <span className="admin-stat-icon">
                  <Icon aria-hidden="true" size={17} />
                </span>
              </div>
              <p className="admin-stat-value">{item.value}</p>
            </div>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="traffic-chart-title" className="admin-panel">
          <h2
            className="admin-panel-title flex items-center gap-2 text-lg font-semibold"
            id="traffic-chart-title"
          >
            <BarChart3 aria-hidden="true" size={18} />
            访问量排行 Top 10
          </h2>
          {chartPosts.length === 0 ? (
            <div className="admin-empty mt-5">暂无已发布文章</div>
          ) : (
            <div className="mt-5 space-y-3">
              {chartPosts.map((post, index) => (
                <div className="admin-chart-row" key={post.id}>
                  <span className="admin-chart-rank">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="admin-chart-title"
                      href={`/admin/posts/${post.id}`}
                      title={post.title}
                    >
                      {post.title}
                    </Link>
                    <div className="admin-chart-track">
                      <div
                        className="admin-chart-bar"
                        style={{ width: `${Math.max((post.viewCount / maxViews) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                  <span className="admin-chart-value">{post.viewCount}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="traffic-table-title" className="admin-panel">
          <h2
            className="admin-panel-title flex items-center gap-2 text-lg font-semibold"
            id="traffic-table-title"
          >
            <TrendingUp aria-hidden="true" size={18} />
            每篇文章访问量
          </h2>
          {table.posts.length === 0 ? (
            <div className="admin-empty mt-5">暂无已发布文章</div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-105 text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                    <th className="pb-2 pr-4 font-medium">文章</th>
                    <th className="pb-2 pr-4 font-medium">发布时间</th>
                    <th className="pb-2 pr-4 font-medium">评论</th>
                    <th className="pb-2 text-right font-medium">访问量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {table.posts.map((post) => (
                    <tr key={post.id}>
                      <td className="max-w-70 truncate py-3 pr-4">
                        <Link
                          className="hover:text-[var(--primary)]"
                          href={`/admin/posts/${post.id}`}
                          title={post.title}
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-[var(--muted)]">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString("zh-CN")
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-[var(--muted)]">{post.commentCount}</td>
                      <td className="py-3 text-right font-mono font-semibold">{post.viewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PostPagination
            basePath="/admin"
            className="admin-pagination mt-5"
            page={page}
            totalPages={totalPages}
          />
        </section>
      </div>
    </div>
  );
}
