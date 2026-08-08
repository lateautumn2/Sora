import Link from "next/link";

import { CommentAvatar } from "@/components/comment-avatar";
import { PostPagination } from "@/components/site/post-pagination";
import {
  countAdminCommentPosts,
  listAdminCommentPosts,
  type AdminComment,
  type CommentStatus,
} from "@/lib/comments/service";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";

import { changeCommentStatusAction, replyCommentAction } from "./actions";

const COMMENTS_PAGE_SIZE = 10;

const filters: Array<{ label: string; value?: CommentStatus }> = [
  { label: "全部" },
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
  const status = filters.find((item) => item.value === query.status)?.value;
  const page = resolvePage(query.page);
  const total = countAdminCommentPosts(status);
  const groups = listAdminCommentPosts(status, COMMENTS_PAGE_SIZE, (page - 1) * COMMENTS_PAGE_SIZE);
  const totalPages = resolveTotalPages(total, COMMENTS_PAGE_SIZE);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>评论</h1>
          <p>按文章查看讨论、审核状态与管理员回复</p>
        </div>
        <span className="admin-page-badge">{total} 篇文章</span>
      </header>

      {query.notice ? (
        <p className="admin-notice mt-5" role="status">
          {query.notice === "replied" ? "回复已公开" : "回复内容格式不正确"}
        </p>
      ) : null}

      <nav aria-label="评论筛选" className="admin-filter-bar mt-6">
        {filters.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              className={active ? "admin-filter admin-filter-active" : "admin-filter"}
              href={filter.value ? `/admin/comments?status=${filter.value}` : "/admin/comments"}
              key={filter.label}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {groups.length === 0 ? (
        <p className="admin-empty mt-6">当前筛选下没有评论</p>
      ) : (
        <div className="admin-comment-groups mt-6">
          {groups.map((group) => (
            <section aria-labelledby={`comment-post-${group.postId}`} className="admin-panel" key={group.postId}>
              <header className="admin-comment-group-header">
                <div className="min-w-0">
                  <Link
                    className="admin-comment-group-title"
                    href={`/admin/posts/${group.postId}`}
                    id={`comment-post-${group.postId}`}
                  >
                    {group.postTitle}
                  </Link>
                  <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                    /posts/{group.postSlug}
                  </p>
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
            </section>
          ))}
        </div>
      )}

      <PostPagination
        basePath="/admin/comments"
        className="admin-pagination"
        extraQuery={status ? { status } : undefined}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}

function AdminCommentRow({ comment }: { comment: AdminComment }) {
  return (
    <article className="admin-comment-row">
      <CommentAvatar name={comment.authorName} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{comment.authorName}</span>
          <span className={`admin-comment-status admin-comment-status-${comment.status.toLowerCase()}`}>
            {statusLabels[comment.status]}
          </span>
          <time className="text-xs text-[var(--muted)]" dateTime={new Date(comment.createdAt).toISOString()}>
            {new Date(comment.createdAt).toLocaleString("zh-CN")}
          </time>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{comment.authorEmail}</p>
        <div
          className="prose-content admin-comment-content mt-3"
          dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {comment.status !== "APPROVED" ? (
            <StatusButton id={comment.id} label="通过" status="APPROVED" />
          ) : null}
          {comment.status !== "SPAM" ? <StatusButton id={comment.id} label="垃圾" status="SPAM" /> : null}
          {comment.status !== "TRASHED" ? (
            <StatusButton id={comment.id} label="删除" status="TRASHED" />
          ) : (
            <StatusButton id={comment.id} label="恢复待审核" status="PENDING" />
          )}
        </div>
        <form action={replyCommentAction} className="admin-comment-reply mt-4">
          <input name="parentId" type="hidden" value={comment.id} />
          <input
            aria-label={`回复 ${comment.authorName}`}
            className="form-input min-w-0 flex-1"
            maxLength={5000}
            name="content"
            placeholder={`以管理员身份公开回复 ${comment.authorName}`}
            required
          />
          <button className="primary-button" type="submit">
            回复
          </button>
        </form>
      </div>
    </article>
  );
}

function StatusButton({ id, label, status }: { id: string; label: string; status: CommentStatus }) {
  return (
    <form action={changeCommentStatusAction}>
      <input name="id" type="hidden" value={id} />
      <input name="status" type="hidden" value={status} />
      <button className="admin-comment-action" type="submit">
        {label}
      </button>
    </form>
  );
}
