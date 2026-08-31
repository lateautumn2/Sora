import Link from "next/link";

import {
  changeCommentStatusAction,
  replyCommentAction,
} from "@/app/(admin)/admin/comments/actions";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { CommentReplyForm } from "@/components/admin/comment-reply-form";
import { CommentAvatar } from "@/components/comment-avatar";
import { CommentEnvironment } from "@/components/comment-environment";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { PostPagination } from "@/components/site/post-pagination";
import {
  countAdminCommentPosts,
  listAdminCommentPosts,
  type AdminComment,
  type CommentStatus,
} from "@/lib/comments/service";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";

const COMMENTS_PAGE_SIZE = 10;

const filters: Array<{ label: string; value: CommentStatus | "ALL" }> = [
  { label: "全部", value: "ALL" },
  { label: "待审核", value: "PENDING" },
  { label: "已公开", value: "APPROVED" },
  { label: "垃圾", value: "SPAM" },
  { label: "回收站", value: "TRASHED" },
];

const statusLabels: Record<CommentStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已公开",
  SPAM: "垃圾",
  TRASHED: "回收站",
};

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const activeFilter = filters.find((item) => item.value === query.status)?.value ?? "ALL";
  const status = activeFilter === "ALL" ? undefined : activeFilter;
  const page = resolvePage(query.page);
  const total = countAdminCommentPosts(status);
  const groups = listAdminCommentPosts(status, COMMENTS_PAGE_SIZE, (page - 1) * COMMENTS_PAGE_SIZE);

  return (
    <AdminPage>
      <AdminPageHeader
        actions={<span className="admin-count-badge">{total} 篇文章</span>}
        description="按文章查看讨论、审核状态与管理员回复。"
        title="评论"
      >
        {query.notice ? (
          <p className="admin-notice" role="status">
            {query.notice === "replied"
              ? "回复已公开"
              : query.notice === "replied-mail-failed"
                ? "回复已公开，但提醒邮件发送失败，请检查 SMTP 设置和服务日志"
                : query.notice === "approved-mail-failed"
                  ? "评论已通过，但提醒邮件发送失败，请检查 SMTP 设置和服务日志"
                  : "回复内容格式不正确"}
          </p>
        ) : null}
        <AdminToolbar label="评论筛选">
          <AdminTabs
            activeValue={activeFilter}
            label="评论状态"
            tabs={filters.map((filter) => ({
              href:
                filter.value === "ALL"
                  ? "/admin/comments"
                  : `/admin/comments?status=${filter.value}`,
              label: filter.label,
              value: filter.value,
            }))}
          />
        </AdminToolbar>
      </AdminPageHeader>

      {groups.length === 0 ? (
        <AdminSurface aria-label="评论列表">
          <p className="admin-record-empty">当前筛选下没有评论</p>
        </AdminSurface>
      ) : (
        <div className="admin-comment-groups">
          {groups.map((group) => (
            <AdminSurface aria-labelledby={`comment-post-${group.postId}`} key={group.postId}>
              <header className="admin-comment-group-header">
                <div className="admin-data-primary">
                  <Link href={`/admin/posts/${group.postId}`} id={`comment-post-${group.postId}`}>
                    {group.postTitle}
                  </Link>
                  <span>/posts/{group.postSlug}</span>
                </div>
                <div className="admin-comment-group-meta">
                  <span>{group.commentCount} 条评论</span>
                  <time dateTime={new Date(group.latestCommentAt).toISOString()}>
                    最近 {new Date(group.latestCommentAt).toLocaleString("zh-CN")}
                  </time>
                </div>
              </header>
              <div className="admin-comment-list">
                {group.comments.map((comment) => (
                  <AdminCommentRow comment={comment} key={comment.id} />
                ))}
              </div>
            </AdminSurface>
          ))}
        </div>
      )}

      <PostPagination
        basePath="/admin/comments"
        className="admin-pagination"
        extraQuery={status ? { status } : undefined}
        page={page}
        totalPages={resolveTotalPages(total, COMMENTS_PAGE_SIZE)}
        variant="admin"
      />
    </AdminPage>
  );
}

function AdminCommentRow({ comment }: { comment: AdminComment }) {
  return (
    <article className="admin-comment-row">
      <CommentAvatar avatarHash={comment.avatarHash} name={comment.authorName} size={40} />
      <div className="admin-comment-copy">
        <div className="admin-comment-byline">
          <strong>{comment.authorName}</strong>
          <span
            className={`admin-comment-role admin-comment-role-${comment.authorRole.toLowerCase()}`}
          >
            {comment.authorRole === "OWNER" ? "博主" : "游客"}
          </span>
          <span className={`admin-status admin-status-${comment.status.toLowerCase()}`}>
            {statusLabels[comment.status]}
          </span>
          <time dateTime={new Date(comment.createdAt).toISOString()}>
            {new Date(comment.createdAt).toLocaleString("zh-CN")}
          </time>
          <CommentEnvironment
            browserName={comment.browserName}
            browserVersion={comment.browserVersion}
            className="admin-comment-environment"
            ipCity={comment.ipCity}
          />
        </div>
        <p className="admin-comment-email">{comment.authorEmail}</p>
        <div className="admin-comment-relation">
          <strong>
            {!comment.parentId
              ? "评论博主文章"
              : comment.parentAuthorRole === "OWNER"
                ? "回复博主评论"
                : "回复游客评论"}
          </strong>
          {comment.parentId ? (
            <span>被回复者：{comment.parentAuthorName || "未知用户"}</span>
          ) : null}
          {comment.parentContent ? <blockquote>{comment.parentContent}</blockquote> : null}
        </div>
        <div
          className="prose-content admin-comment-content"
          dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
        />
        <div className="admin-comment-actions">
          {comment.status !== "APPROVED" ? (
            <StatusButton id={comment.id} label="通过" status="APPROVED" />
          ) : null}
          {comment.status !== "SPAM" ? (
            <StatusButton id={comment.id} label="垃圾" status="SPAM" />
          ) : null}
          {comment.status !== "TRASHED" ? (
            <StatusButton danger id={comment.id} label="删除" status="TRASHED" />
          ) : (
            <StatusButton id={comment.id} label="恢复待审核" status="PENDING" />
          )}
          <CommentReplyForm
            action={replyCommentAction}
            authorName={comment.authorName}
            parentId={comment.id}
          />
        </div>
      </div>
    </article>
  );
}

function StatusButton({
  danger = false,
  id,
  label,
  status,
}: {
  danger?: boolean;
  id: string;
  label: string;
  status: CommentStatus;
}) {
  return (
    <form action={changeCommentStatusAction}>
      <input name="id" type="hidden" value={id} />
      <input name="status" type="hidden" value={status} />
      <Tooltip content={label}>
        <Button
          className={
            danger ? "ui-button-danger ui-button-compact" : "ui-button-secondary ui-button-compact"
          }
          type="submit"
        >
          {label}
        </Button>
      </Tooltip>
    </form>
  );
}
