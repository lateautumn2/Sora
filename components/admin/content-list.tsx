import { Edit3, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";

import { restoreContentAction } from "@/app/(admin)/admin/content-actions";
import { AdminDataList, type AdminDataListColumn } from "@/components/admin/admin-data-list";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminNoticeToast } from "@/components/admin/admin-notice-toast";
import { IconButton } from "@/components/ui/button";
import { Tooltip, TooltipLink } from "@/components/ui/tooltip";
import { PostPagination } from "@/components/site/post-pagination";
import type { ContentSummary } from "@/lib/content/service";

const statusLabels = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
  TRASHED: "回收站",
} as const;

export function ContentList({
  kind,
  items,
  notice,
  page,
  showTrash = false,
  totalPages,
}: {
  kind: "POST" | "PAGE";
  items: ContentSummary[];
  notice?: string;
  page?: number;
  showTrash?: boolean;
  totalPages?: number;
}) {
  const segment = kind === "POST" ? "posts" : "pages";
  const noun = kind === "POST" ? "文章" : "页面";
  const columns: readonly AdminDataListColumn<ContentSummary>[] = [
    {
      key: "content",
      label: noun,
      render: (item) => (
        <div className="admin-data-primary">
          <strong>{item.title}</strong>
          <span>
            /{segment}/{item.slug}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "状态",
      render: (item) => (
        <span className={`admin-status admin-status-${item.status.toLowerCase()}`}>
          {statusLabels[item.status]}
        </span>
      ),
    },
    {
      key: "published",
      label: "发布时间",
      render: (item) =>
        item.publishedAt ? (
          <time dateTime={new Date(item.publishedAt).toISOString()}>
            {new Date(item.publishedAt).toLocaleString("zh-CN")}
          </time>
        ) : (
          <span>未发布</span>
        ),
    },
    {
      key: "updated",
      label: "更新时间",
      render: (item) => (
        <time dateTime={new Date(item.updatedAt).toISOString()}>
          {new Date(item.updatedAt).toLocaleString("zh-CN")}
        </time>
      ),
    },
    {
      align: "end",
      key: "actions",
      label: "操作",
      render: (item) =>
        showTrash ? (
          <form action={restoreContentAction}>
            <input name="id" type="hidden" value={item.id} />
            <input name="kind" type="hidden" value={kind} />
            <Tooltip content="恢复为草稿">
              <IconButton aria-label={`恢复${item.title}`} type="submit">
                <RotateCcw aria-hidden="true" size={17} />
              </IconButton>
            </Tooltip>
          </form>
        ) : (
          <TooltipLink
            aria-label={`编辑${item.title}`}
            className="ui-icon-button"
            content="编辑"
            href={`/admin/${segment}/${item.id}`}
          >
            <Edit3 aria-hidden="true" size={17} />
          </TooltipLink>
        ),
    },
  ];

  return (
    <AdminPage>
      <AdminNoticeToast notice={notice} noun={noun} />
      <AdminPageHeader
        actions={
          <Link className="ui-button ui-button-link" href={`/admin/${segment}/new`}>
            <Plus aria-hidden="true" size={17} />
            新建{noun}
          </Link>
        }
        description={showTrash ? "查看已删除内容并恢复为草稿。" : "管理草稿、发布状态与内容修订。"}
        title={showTrash ? `${noun}回收站` : noun}
      >
        <AdminToolbar label={`${noun}筛选`}>
          <AdminTabs
            activeValue={showTrash ? "trash" : "all"}
            label={`${noun}状态`}
            tabs={[
              { href: `/admin/${segment}`, label: `全部${noun}`, value: "all" },
              { href: `/admin/${segment}?status=TRASHED`, label: "回收站", value: "trash" },
            ]}
          />
        </AdminToolbar>
      </AdminPageHeader>

      {items.length === 0 ? (
        <AdminEmptyState
          description={showTrash ? "删除的内容会显示在这里。" : `新建${noun}后会显示在这里。`}
          title={showTrash ? "回收站为空" : `还没有${noun}`}
        />
      ) : (
        <AdminSurface aria-label={`${noun}列表区域`}>
          <div className="admin-surface-heading">
            <h2>{showTrash ? "已删除内容" : `全部${noun}`}</h2>
            <span>当前页 {items.length} 条</span>
          </div>
          <AdminDataList
            columns={columns}
            getRowKey={(item) => item.id}
            getRowLabel={(item) => item.title}
            label={`${noun}列表`}
            rows={items}
          />
          {page !== undefined && totalPages !== undefined ? (
            <PostPagination
              basePath={`/admin/${segment}`}
              className="admin-pagination"
              extraQuery={showTrash ? { status: "TRASHED" } : undefined}
              page={page}
              totalPages={totalPages}
              variant="admin"
            />
          ) : null}
        </AdminSurface>
      )}
    </AdminPage>
  );
}
