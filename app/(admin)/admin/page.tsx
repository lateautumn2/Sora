import { BarChart3, Eye, FilePenLine, MessageSquareText, TrendingUp } from "lucide-react";
import Link from "next/link";

import { AdminDataList, type AdminDataListColumn } from "@/components/admin/admin-data-list";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { PostPagination } from "@/components/site/post-pagination";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { getDashboardStats, listTopPostsByViews } from "@/lib/content/service";

const TABLE_PAGE_SIZE = 10;

type DashboardPost = ReturnType<typeof listTopPostsByViews>["posts"][number];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = resolvePage((await searchParams).page);
  const summary = getDashboardStats();
  const table = listTopPostsByViews(TABLE_PAGE_SIZE, (page - 1) * TABLE_PAGE_SIZE);
  const stats = [
    { label: "已发布文章", value: summary.publishedPosts, icon: FilePenLine },
    { label: "待审评论", value: summary.pendingComments, icon: MessageSquareText },
    { label: "累计浏览", value: summary.totalViews, icon: Eye },
    { label: "累计评论", value: summary.totalComments, icon: MessageSquareText },
  ] as const;
  const chartPosts = summary.topPosts.slice(0, 10);
  const maxViews = Math.max(...chartPosts.map((post) => post.viewCount), 1);
  const columns: readonly AdminDataListColumn<DashboardPost>[] = [
    {
      key: "post",
      label: "文章",
      render: (post) => <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>,
    },
    {
      key: "published",
      label: "发布时间",
      render: (post) =>
        post.publishedAt ? (
          <time dateTime={new Date(post.publishedAt).toISOString()}>
            {new Date(post.publishedAt).toLocaleDateString("zh-CN")}
          </time>
        ) : (
          "—"
        ),
    },
    { key: "comments", label: "评论", render: (post) => post.commentCount },
    {
      align: "end",
      key: "views",
      label: "访问量",
      render: (post) => <strong>{post.viewCount}</strong>,
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader description="内容、互动与流量概览。" title="仪表盘" />

      <section aria-label="站点统计" className="admin-dashboard-stats">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <AdminSurface className="admin-stat-card" key={item.label}>
              <div className="admin-stat-heading">
                <span>{item.label}</span>
                <span className="admin-stat-icon">
                  <Icon aria-hidden="true" size={17} />
                </span>
              </div>
              <p className="admin-stat-value">{item.value}</p>
            </AdminSurface>
          );
        })}
      </section>

      <div className="admin-dashboard-grid">
        <AdminSurface aria-labelledby="traffic-chart-title">
          <div className="admin-surface-heading">
            <h2 id="traffic-chart-title">
              <BarChart3 aria-hidden="true" size={18} />
              访问量排行 Top 10
            </h2>
          </div>
          {chartPosts.length === 0 ? (
            <p className="admin-record-empty">暂无已发布文章</p>
          ) : (
            <div className="admin-chart-list">
              {chartPosts.map((post, index) => (
                <div className="admin-chart-row" key={post.id}>
                  <span className="admin-chart-rank">{index + 1}</span>
                  <div className="admin-chart-copy">
                    <Link className="admin-chart-title" href={`/admin/posts/${post.id}`}>
                      {post.title}
                    </Link>
                    <div className="admin-chart-track">
                      <div
                        className="admin-chart-bar"
                        style={{ width: `${Math.max((post.viewCount / maxViews) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                  <strong className="admin-chart-value">{post.viewCount}</strong>
                </div>
              ))}
            </div>
          )}
        </AdminSurface>

        <AdminSurface aria-labelledby="traffic-table-title">
          <div className="admin-surface-heading">
            <h2 id="traffic-table-title">
              <TrendingUp aria-hidden="true" size={18} />
              每篇文章访问量
            </h2>
          </div>
          {table.posts.length === 0 ? (
            <p className="admin-record-empty">暂无已发布文章</p>
          ) : (
            <AdminDataList
              columns={columns}
              getRowKey={(post) => post.id}
              getRowLabel={(post) => post.title}
              label="每篇文章访问量"
              rows={table.posts}
            />
          )}
          <PostPagination
            basePath="/admin"
            className="admin-pagination"
            page={page}
            totalPages={resolveTotalPages(table.total, TABLE_PAGE_SIZE)}
            variant="admin"
          />
        </AdminSurface>
      </div>
    </AdminPage>
  );
}
