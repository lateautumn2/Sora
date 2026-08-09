"use client";

import { Eye, Heart, MessageSquare, Reply } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { CommentAvatar } from "@/components/comment-avatar";
import { CommentEnvironment } from "@/components/comment-environment";
import type { PublicComment } from "@/lib/comments/service";

interface PostInteractionsProps {
  allowComment: boolean;
  comments: PublicComment[];
  initialUpvoteCount: number;
  initialViewCount: number;
  postId: string;
}

interface InteractionResponse {
  data?: {
    id?: string;
    duplicate?: boolean;
    comment?: PublicComment | null;
    upvoteCount?: number;
    viewCount?: number;
    upvoted?: boolean;
    status?: "PENDING" | "APPROVED";
  };
  error?: { message?: string };
}

/** 评论列表初始展示的顶层评论数量，点击"加载更多"后按批追加。 */
const COMMENTS_PAGE_SIZE = 10;
const COMMENT_PROFILE_KEY = "sora.comment-profile.v1";

interface CommentProfile {
  authorName: string;
  authorEmail: string;
  authorWebsite: string;
}

function readCommentProfile(): CommentProfile {
  const emptyProfile = { authorName: "", authorEmail: "", authorWebsite: "" };
  if (typeof window === "undefined") return emptyProfile;
  try {
    const saved = window.localStorage.getItem(COMMENT_PROFILE_KEY);
    if (!saved) return emptyProfile;
    const profile = JSON.parse(saved) as Record<string, unknown>;
    return {
      authorName: typeof profile.authorName === "string" ? profile.authorName : "",
      authorEmail: typeof profile.authorEmail === "string" ? profile.authorEmail : "",
      authorWebsite: typeof profile.authorWebsite === "string" ? profile.authorWebsite : "",
    };
  } catch {
    return emptyProfile;
  }
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
  const [submittedComments, setSubmittedComments] = useState<PublicComment[]>([]);
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState("");
  const [profile, setProfile] = useState<CommentProfile>(readCommentProfile);
  const commentItems = useMemo(() => {
    const ids = new Set(comments.map((comment) => comment.id));
    return [...comments, ...submittedComments.filter((comment) => !ids.has(comment.id))];
  }, [comments, submittedComments]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMMENT_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // 存储不可用时静默降级，不影响评论提交。
    }
  }, [profile]);

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
        setUpvoteCount(payload.data.upvoteCount ?? initialUpvoteCount);
        setUpvoted(payload.data.upvoted ?? false);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialUpvoteCount, initialViewCount, postId]);

  async function handleUpvote() {
    const response = await fetch(`/api/v1/public/posts/${postId}/upvote`, { method: "POST" });
    const payload = (await response.json()) as InteractionResponse;
    if (payload.data) {
      setUpvoteCount(payload.data.upvoteCount ?? upvoteCount);
      setUpvoted(payload.data.upvoted ?? upvoted);
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
          content,
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
      if (payload.data?.status === "APPROVED" && payload.data.comment) {
        setSubmittedComments((items) =>
          items.some((item) => item.id === payload.data?.comment?.id)
            ? items
            : [...items, payload.data!.comment!],
        );
        setMessage("评论已发表。");
      } else {
        setMessage("评论已提交，审核通过后会显示在这里。");
      }
      setContent("");
      const company = formElement.elements.namedItem("company");
      if (company instanceof HTMLInputElement) company.value = "";
      setReplyTo(null);
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
          <MessageSquare aria-hidden="true" size={17} /> {commentItems.length}
        </span>
      </div>

      <h2 className="sora-comments-title" id="post-comments">
        评论
        <span className="sora-comments-count">{commentItems.length}</span>
      </h2>
      <CommentList comments={commentItems} onReply={setReplyTo} />

      {allowComment ? (
        <CommentForm
          authorEmail={profile.authorEmail}
          authorName={profile.authorName}
          authorWebsite={profile.authorWebsite}
          content={content}
          message={message}
          onSubmit={handleComment}
          pending={pending}
          replyTo={replyTo}
          setAuthorEmail={(authorEmail) => setProfile((value) => ({ ...value, authorEmail }))}
          setAuthorName={(authorName) => setProfile((value) => ({ ...value, authorName }))}
          setAuthorWebsite={(authorWebsite) => setProfile((value) => ({ ...value, authorWebsite }))}
          setContent={setContent}
          setReplyTo={setReplyTo}
        />
      ) : (
        <p className="mt-8 text-sm text-[var(--muted)]">这篇文章已关闭评论。</p>
      )}
    </section>
  );
}

function CommentForm({
  authorEmail,
  authorName,
  authorWebsite,
  content,
  message,
  onSubmit,
  pending,
  replyTo,
  setAuthorEmail,
  setAuthorName,
  setAuthorWebsite,
  setContent,
  setReplyTo,
}: {
  authorEmail: string;
  authorName: string;
  authorWebsite: string;
  content: string;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  replyTo: PublicComment | null;
  setAuthorEmail: (value: string) => void;
  setAuthorName: (value: string) => void;
  setAuthorWebsite: (value: string) => void;
  setContent: (value: string) => void;
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
        onChange={(event) => setContent(event.target.value)}
        placeholder="友善评论，理性发言…"
        required
        value={content}
      />
      <div className="sora-comment-fields">
        <input
          aria-label="昵称"
          className="form-input"
          maxLength={60}
          name="authorName"
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="昵称 *"
          required
          value={authorName}
        />
        <input
          aria-label="邮箱"
          className="form-input"
          maxLength={254}
          name="authorEmail"
          onChange={(event) => setAuthorEmail(event.target.value)}
          placeholder="邮箱 *（不会公开）"
          required
          type="email"
          value={authorEmail}
        />
        <input
          aria-label="个人网站"
          className="form-input"
          name="authorWebsite"
          onChange={(event) => setAuthorWebsite(event.target.value)}
          placeholder="个人网站（可选）"
          type="url"
          value={authorWebsite}
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
  const previousCommentCount = useRef(comments.length);
  const visibleTop = topLevel.slice(0, visibleCount);

  useEffect(() => {
    const added = comments.length - previousCommentCount.current;
    if (added > 0) setVisibleCount((count) => count + added);
    previousCommentCount.current = comments.length;
  }, [comments.length]);

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
        <CommentAvatar avatarHash={comment.avatarHash} name={comment.authorName} size={36} />
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
            <CommentEnvironment
              browserName={comment.browserName}
              browserVersion={comment.browserVersion}
              className="sora-comment-environment"
              ipCity={comment.ipCity}
            />
          </div>
          <div
            className="prose-content sora-comment-content"
            dangerouslySetInnerHTML={{ __html: comment.renderedHtml }}
          />
          <button className="sora-comment-reply" onClick={() => onReply(comment)} type="button">
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
