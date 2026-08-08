"use client";

import { Eye, Heart, MessageSquare, Reply } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { CommentAvatar } from "@/components/comment-avatar";
import type { PublicComment } from "@/lib/comments/service";

interface PostInteractionsProps {
  allowComment: boolean;
  comments: PublicComment[];
  initialUpvoteCount: number;
  initialViewCount: number;
  postId: string;
}

interface InteractionResponse {
  data?: { upvoteCount: number; viewCount?: number; upvoted: boolean; status?: "PENDING" | "APPROVED" };
  error?: { message?: string };
}

/** 评论列表初始展示的顶层评论数量，点击"加载更多"后按批追加。 */
const COMMENTS_PAGE_SIZE = 10;

export function PostInteractions({
  allowComment,
  comments,
  initialUpvoteCount,
  initialViewCount,
  postId,
}: PostInteractionsProps) {
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [upvoted, setUpvoted] = useState(false);
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/public/posts/${postId}/view`, {
      method: "POST",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<InteractionResponse>)
      .then((payload) => {
        if (!payload.data) return;
        setViewCount(payload.data.viewCount ?? initialViewCount);
        setUpvoteCount(payload.data.upvoteCount);
        setUpvoted(payload.data.upvoted);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialViewCount, postId]);

  async function handleUpvote() {
    const response = await fetch(`/api/v1/public/posts/${postId}/upvote`, { method: "POST" });
    const payload = (await response.json()) as InteractionResponse;
    if (payload.data) {
      setUpvoteCount(payload.data.upvoteCount);
      setUpvoted(payload.data.upvoted);
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage("");
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/v1/public/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: form.get("authorName"),
          authorEmail: form.get("authorEmail"),
          authorWebsite: form.get("authorWebsite"),
          content: form.get("content"),
          company: form.get("company"),
          parentId: replyTo?.id ?? null,
          requestToken: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as InteractionResponse;
      if (!response.ok) {
        setMessage(payload.error?.message ?? "提交失败，请稍后重试");
        return;
      }
      formElement.reset();
      setReplyTo(null);
      setMessage("评论已提交，审核通过后会显示在这里。");
    } catch {
      setMessage("网络请求失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="sora-interactions" aria-labelledby="post-comments">
      <div className="sora-interaction-summary">
        <span className="inline-flex items-center gap-1.5">
          <Eye aria-hidden="true" size={17} /> {viewCount}
        </span>
        <button
          aria-label={upvoted ? "取消点赞" : "点赞"}
          aria-pressed={upvoted}
          className={`inline-flex items-center gap-1.5 hover:text-[var(--primary)] ${upvoted ? "text-[var(--primary)]" : ""}`}
          onClick={handleUpvote}
          type="button"
        >
          <Heart aria-hidden="true" fill={upvoted ? "currentColor" : "none"} size={17} />
          <span aria-hidden="true">{upvoteCount}</span>
        </button>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare aria-hidden="true" size={17} /> {comments.length}
        </span>
      </div>

      <h2 className="sora-comments-title" id="post-comments">
        评论
        <span className="sora-comments-count">{comments.length}</span>
      </h2>
      <CommentList comments={comments} onReply={setReplyTo} />

      {allowComment ? (
        <CommentForm
          message={message}
          onSubmit={handleComment}
          pending={pending}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
        />
      ) : (
        <p className="mt-8 text-sm text-[var(--muted)]">这篇文章已关闭评论。</p>
      )}
    </section>
  );
}

function CommentForm({
  message,
  onSubmit,
  pending,
  replyTo,
  setReplyTo,
}: {
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  replyTo: PublicComment | null;
  setReplyTo: (comment: PublicComment | null) => void;
}) {
  return (
    <form className="sora-comment-form" onSubmit={onSubmit}>
      <div className="sora-comment-form-head">
        <h3>{replyTo ? `回复 ${replyTo.authorName}` : "发表评论"}</h3>
        {replyTo ? (
          <button
            className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
            onClick={() => setReplyTo(null)}
            type="button"
          >
            取消回复
          </button>
        ) : null}
      </div>
      <textarea
        aria-label="评论内容"
        className="sora-comment-textarea"
        maxLength={5000}
        name="content"
        placeholder="友善评论，理性发言…"
        required
      />
      <div className="sora-comment-fields">
        <input
          aria-label="昵称"
          className="form-input"
          maxLength={60}
          name="authorName"
          placeholder="昵称 *"
          required
        />
        <input
          aria-label="邮箱"
          className="form-input"
          maxLength={254}
          name="authorEmail"
          placeholder="邮箱 *（不会公开）"
          required
          type="email"
        />
        <input
          aria-label="个人网站"
          className="form-input"
          name="authorWebsite"
          placeholder="个人网站（可选）"
          type="url"
        />
      </div>
      <label className="absolute -left-[10000px] top-auto size-px overflow-hidden">
        公司
        <input autoComplete="off" name="company" tabIndex={-1} />
      </label>
      <div className="sora-comment-form-foot">
        {message ? (
          <p className="text-sm text-[var(--muted)]" role="status">
            {message}
          </p>
        ) : null}
        <button className="primary-button justify-center" disabled={pending} type="submit">
          {pending ? "正在提交…" : "提交评论"}
        </button>
      </div>
    </form>
  );
}

function CommentList({
  comments,
  onReply,
}: {
  comments: PublicComment[];
  onReply: (comment: PublicComment) => void;
}) {
  const children = useMemo(() => {
    const map = new Map<string | null, PublicComment[]>();
    for (const comment of comments) {
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [comments]);

  const topLevel = children.get(null) ?? [];
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PAGE_SIZE);
  const visibleTop = topLevel.slice(0, visibleCount);

  if (comments.length === 0) {
    return <p className="sora-comments-empty">还没有公开评论。</p>;
  }

  const renderBranch = (
    parentId: string | null,
    depth: number,
    visibleList?: PublicComment[],
  ): React.ReactNode =>
    (visibleList ?? children.get(parentId) ?? []).map((comment) => (
      <article className="sora-comment-item" key={comment.id}>
        <CommentAvatar name={comment.authorName} size={36} />
        <div className="sora-comment-body">
          <div className="sora-comment-meta">
            {comment.authorWebsite ? (
              <a
                className="sora-comment-author"
                href={comment.authorWebsite}
                rel="nofollow noreferrer"
                target="_blank"
              >
                {comment.authorName}
              </a>
            ) : (
              <span className="sora-comment-author">{comment.authorName}</span>
            )}
            <time className="sora-comment-time">
              {new Date(comment.createdAt).toLocaleString("zh-CN")}
            </time>
          </div>
          <div
            className="prose-content sora-comment-content"
            dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
          />
          <button
            className="sora-comment-reply"
            onClick={() => onReply(comment)}
            type="button"
          >
            <Reply aria-hidden="true" size={13} />
            回复
          </button>
          {depth < 3 ? (
            <div className="sora-comment-children">{renderBranch(comment.id, depth + 1)}</div>
          ) : null}
        </div>
      </article>
    ));

  return (
    <div className="sora-comment-list">
      {renderBranch(null, 0, visibleTop)}
      {visibleTop.length < topLevel.length ? (
        <button
          className="sora-comments-load-more"
          onClick={() => setVisibleCount((count) => count + COMMENTS_PAGE_SIZE)}
          type="button"
        >
          加载更多评论（还有 {topLevel.length - visibleTop.length} 条）
        </button>
      ) : null}
    </div>
  );
}
