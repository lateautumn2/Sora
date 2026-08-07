"use client";

import { Eye, Heart, MessageSquare, Reply } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { PublicComment } from "@/lib/comments/service";

interface PostInteractionsProps {
  allowComment: boolean;
  comments: PublicComment[];
  initialUpvoteCount: number;
  initialViewCount: number;
  postId: string;
}

interface InteractionResponse {
  data?: { upvoteCount: number; viewCount?: number; upvoted: boolean };
  error?: { message?: string };
}

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
      </h2>
      <CommentList comments={comments} onReply={setReplyTo} />

      {allowComment ? (
        <form className="sora-comment-form" onSubmit={handleComment}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{replyTo ? `回复 ${replyTo.authorName}` : "发表评论"}</h3>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              昵称
              <input className="form-input" maxLength={60} name="authorName" required />
            </label>
            <label className="grid gap-2 text-sm">
              邮箱
              <input
                className="form-input"
                maxLength={254}
                name="authorEmail"
                required
                type="email"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            个人网站
            <input className="form-input" name="authorWebsite" placeholder="https://" type="url" />
          </label>
          <label className="absolute -left-[10000px] top-auto size-px overflow-hidden">
            公司
            <input autoComplete="off" name="company" tabIndex={-1} />
          </label>
          <label className="grid gap-2 text-sm">
            评论
            <textarea className="form-textarea min-h-32" maxLength={5000} name="content" required />
          </label>
          {message ? (
            <p className="text-sm text-[var(--muted)]" role="status">
              {message}
            </p>
          ) : null}
          <button className="primary-button w-fit" disabled={pending} type="submit">
            {pending ? "正在提交..." : "提交评论"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-[var(--muted)]">这篇文章已关闭评论。</p>
      )}
    </section>
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

  if (comments.length === 0)
    return <p className="mt-5 text-sm text-[var(--muted)]">还没有公开评论。</p>;

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode =>
    (children.get(parentId) ?? []).map((comment) => (
      <article
        className={`${depth > 0 ? "ml-5 border-l border-[var(--border)] pl-4" : ""} py-4`}
        key={comment.id}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {comment.authorWebsite ? (
            <a
              className="font-medium hover:text-[var(--primary)]"
              href={comment.authorWebsite}
              rel="nofollow noreferrer"
              target="_blank"
            >
              {comment.authorName}
            </a>
          ) : (
            <span className="font-medium">{comment.authorName}</span>
          )}
          <time className="text-xs text-[var(--muted)]">
            {new Date(comment.createdAt).toLocaleString("zh-CN")}
          </time>
        </div>
        <div
          className="prose-content mt-2 text-base"
          dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
        />
        <button
          className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary)]"
          onClick={() => onReply(comment)}
          type="button"
        >
          <Reply aria-hidden="true" size={13} />
          回复
        </button>
        {depth < 3 ? renderBranch(comment.id, depth + 1) : null}
      </article>
    ));

  return <div className="mt-5 divide-y divide-[var(--border)]">{renderBranch(null, 0)}</div>;
}
