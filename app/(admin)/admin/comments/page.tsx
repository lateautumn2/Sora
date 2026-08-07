import Link from "next/link";

import { listAdminComments, type CommentStatus } from "@/lib/comments/service";

import { changeCommentStatusAction, replyCommentAction } from "./actions";

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
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const status = filters.find((item) => item.value === query.status)?.value;
  const comments = listAdminComments(status);
  return (
    <div>
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">评论</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">审核访客评论、公开回复并处理垃圾内容</p>
      </header>
      {query.notice ? (
        <p
          className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          role="status"
        >
          {query.notice === "replied" ? "回复已公开" : "回复内容格式不正确"}
        </p>
      ) : null}
      <nav aria-label="评论筛选" className="mt-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm ${status === filter.value ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted)]"}`}
            href={filter.value ? `/admin/comments?status=${filter.value}` : "/admin/comments"}
            key={filter.label}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {comments.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--muted)]">当前筛选下没有评论</p>
      ) : (
        <div className="mt-6 divide-y divide-[var(--border)]">
          {comments.map((comment) => (
            <article className="py-6" key={comment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{comment.authorName}</span>
                    <span className="rounded bg-[var(--surface-strong)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {statusLabels[comment.status]}
                    </span>
                    <span className="text-xs text-[var(--muted)]">{comment.authorEmail}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    《{comment.postTitle}》 · {new Date(comment.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {comment.status !== "APPROVED" ? (
                    <StatusButton id={comment.id} label="通过" status="APPROVED" />
                  ) : null}
                  {comment.status !== "SPAM" ? (
                    <StatusButton id={comment.id} label="垃圾" status="SPAM" />
                  ) : null}
                  {comment.status !== "TRASHED" ? (
                    <StatusButton id={comment.id} label="删除" status="TRASHED" />
                  ) : (
                    <StatusButton id={comment.id} label="恢复待审" status="PENDING" />
                  )}
                </div>
              </div>
              <div
                className="prose-content mt-4 rounded-[var(--radius)] bg-[var(--surface)] p-4 text-base"
                dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
              />
              <form action={replyCommentAction} className="mt-4 flex gap-2">
                <input name="parentId" type="hidden" value={comment.id} />
                <input
                  aria-label={`回复 ${comment.authorName}`}
                  className="form-input flex-1"
                  maxLength={5000}
                  name="content"
                  placeholder="以管理员身份公开回复"
                  required
                />
                <button className="primary-button" type="submit">
                  回复
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({ id, label, status }: { id: string; label: string; status: CommentStatus }) {
  return (
    <form action={changeCommentStatusAction}>
      <input name="id" type="hidden" value={id} />
      <input name="status" type="hidden" value={status} />
      <button
        className="rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1 text-xs hover:border-[var(--primary)]"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
