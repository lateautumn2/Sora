import { Edit3, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";

import { restoreContentAction } from "@/app/(admin)/admin/content-actions";
import { PostPagination } from "@/components/site/post-pagination";
import type { ContentSummary } from "@/lib/content/service";

const statusLabels = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
  TRASHED: "回收站",
} as const;

const statusClasses = {
  DRAFT: "admin-status admin-status-muted",
  PUBLISHED: "admin-status admin-status-success",
  ARCHIVED: "admin-status admin-status-warning",
  TRASHED: "admin-status admin-status-danger",
} as const;

export function ContentList({
  kind,
  items,
  page,
  showTrash = false,
  totalPages,
}: {
  kind: "POST" | "PAGE";
  items: ContentSummary[];
  page?: number;
  showTrash?: boolean;
  totalPages?: number;
}) {
  const segment = kind === "POST" ? "posts" : "pages";
  const noun = kind === "POST" ? "文章" : "页面";

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>{showTrash ? `${noun}回收站` : noun}</h1>
          <p>{showTrash ? "查看已删除内容并恢复为草稿" : "管理草稿、发布状态与内容修订"}</p>
        </div>
        {!showTrash ? (
          <Link className="primary-button" href={`/admin/${segment}/new`}>
            <Plus aria-hidden="true" size={17} />
            新建{noun}
          </Link>
        ) : (
          <Link className="icon-button" href={`/admin/${segment}`} title={`返回${noun}列表`}>
            <Edit3 aria-hidden="true" size={17} />
          </Link>
        )}
      </header>

      <nav aria-label={`${noun}视图`} className="admin-filter-bar mt-5">
        <Link
          className={showTrash ? "admin-filter" : "admin-filter admin-filter-active"}
          href={`/admin/${segment}`}
        >
          全部{noun}
        </Link>
        <Link
          className={showTrash ? "admin-filter admin-filter-active" : "admin-filter"}
          href={`/admin/${segment}?status=TRASHED`}
        >
          回收站
        </Link>
      </nav>

      {items.length === 0 ? (
        <div className="admin-empty mt-6">{showTrash ? "回收站为空" : `还没有${noun}`}</div>
      ) : (
        <section aria-label={`${noun}列表`} className="admin-panel mt-6">
          <div className="admin-panel-header">
            <h2>{showTrash ? "已删除内容" : `全部${noun}`}</h2>
            <span className="text-sm text-[var(--muted)]">共 {items.length} 条当前页记录</span>
          </div>
          <div className="admin-list mt-4">
            {items.map((item) => (
              <article className="admin-list-row flex flex-wrap items-center gap-4" key={item.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-[#292631]">{item.title}</h3>
                    <span className={statusClasses[item.status]}>{statusLabels[item.status]}</span>
                    {item.visibility === "PRIVATE" ? (
                      <span className="admin-status admin-status-warning">私密</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                    /{kind === "POST" ? "posts" : "pages"}/{item.slug}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                {showTrash ? (
                  <form action={restoreContentAction}>
                    <input name="id" type="hidden" value={item.id} />
                    <input name="kind" type="hidden" value={kind} />
                    <button
                      aria-label={`恢复${item.title}`}
                      className="icon-button"
                      title="恢复为草稿"
                      type="submit"
                    >
                      <RotateCcw aria-hidden="true" size={17} />
                    </button>
                  </form>
                ) : (
                  <Link
                    aria-label={`编辑${item.title}`}
                    className="icon-button"
                    href={`/admin/${segment}/${item.id}`}
                    title="编辑"
                  >
                    <Edit3 aria-hidden="true" size={17} />
                  </Link>
                )}
              </article>
            ))}
          </div>
          {page !== undefined && totalPages !== undefined ? (
            <PostPagination
              basePath={`/admin/${segment}`}
              className="admin-pagination mt-5"
              extraQuery={showTrash ? { status: "TRASHED" } : undefined}
              page={page}
              totalPages={totalPages}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}
