import { Edit3, Plus } from "lucide-react";
import Link from "next/link";

import type { ContentSummary } from "@/lib/content/service";

const statusLabels = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
  TRASHED: "回收站",
} as const;

export function ContentList({ kind, items }: { kind: "POST" | "PAGE"; items: ContentSummary[] }) {
  const segment = kind === "POST" ? "posts" : "pages";
  const noun = kind === "POST" ? "文章" : "页面";
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold">{noun}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">管理草稿、发布状态与内容修订</p>
        </div>
        <Link className="primary-button" href={`/admin/${segment}/new`}>
          <Plus aria-hidden="true" size={17} />
          新建{noun}
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">还没有{noun}</div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <article className="flex flex-wrap items-center gap-4 py-5" key={item.id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-medium">{item.title}</h2>
                  <span className="rounded bg-[var(--surface-strong)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {statusLabels[item.status]}
                  </span>
                  {item.visibility === "PRIVATE" ? (
                    <span className="text-xs text-[var(--warning)]">私密</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                  /{kind === "POST" ? "posts" : "pages"}/{item.slug}
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <Link
                aria-label={`编辑${item.title}`}
                className="icon-button"
                href={`/admin/${segment}/${item.id}`}
                title="编辑"
              >
                <Edit3 aria-hidden="true" size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
