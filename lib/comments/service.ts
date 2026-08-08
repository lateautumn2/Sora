import { randomUUID } from "node:crypto";

import { renderComment } from "@/lib/content/render";
import { getSiteSettings } from "@/lib/content/service";
import { getDatabaseConnection } from "@/lib/db/client";
import { hashRequestToken } from "@/lib/interactions/request";
import type { PublicCommentInput } from "@/lib/comments/validation";

export type CommentStatus = "PENDING" | "APPROVED" | "SPAM" | "TRASHED";

export interface PublicComment {
  id: string;
  parentId: string | null;
  rootId: string | null;
  authorName: string;
  authorWebsite: string | null;
  renderedHtml: string;
  createdAt: number;
}

export interface AdminComment extends PublicComment {
  postId: string;
  postTitle: string;
  status: CommentStatus;
  authorEmail: string;
  content: string;
}

export interface AdminCommentPostGroup {
  postId: string;
  postTitle: string;
  postSlug: string;
  commentCount: number;
  latestCommentAt: number;
  comments: AdminComment[];
}

export class InteractionError extends Error {
  constructor(
    public readonly code: "POST_NOT_FOUND" | "COMMENTS_CLOSED" | "PARENT_INVALID" | "RATE_LIMITED",
  ) {
    super(code);
  }
}

export function listPublicComments(postId: string): PublicComment[] {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, parent_id AS parentId, root_id AS rootId, author_name AS authorName,
              author_website AS authorWebsite, rendered_html AS renderedHtml,
              created_at AS createdAt
       FROM comments
       WHERE post_id = ? AND status = 'APPROVED'
       ORDER BY created_at`,
    )
    .all(postId) as PublicComment[];
}

export function createPublicComment(
  postId: string,
  input: PublicCommentInput,
  visitorHash: string,
  userAgentSummary: string | null,
): { id: string; status: CommentStatus; duplicate: boolean } {
  const sqlite = getDatabaseConnection().sqlite;
  return sqlite.transaction(() => {
    const tokenHash = hashRequestToken(input.requestToken);
    const duplicate = sqlite
      .prepare(
        `SELECT c.id, c.status FROM comment_requests cr
         JOIN comments c ON c.id = cr.comment_id WHERE cr.token_hash = ?`,
      )
      .get(tokenHash) as { id: string; status: CommentStatus } | undefined;
    if (duplicate) return { ...duplicate, duplicate: true };

    const post = sqlite
      .prepare(
        `SELECT id, allow_comment AS allowComment FROM posts
         WHERE id = ? AND kind = 'POST' AND status = 'PUBLISHED'
           AND visibility = 'PUBLIC' AND published_at <= ?`,
      )
      .get(postId, Date.now()) as { id: string; allowComment: number } | undefined;
    if (!post) throw new InteractionError("POST_NOT_FOUND");
    const settings = getSiteSettings();
    if (!settings.allowComments || !post.allowComment) {
      throw new InteractionError("COMMENTS_CLOSED");
    }
    const status: CommentStatus = settings.requireCommentModeration ? "PENDING" : "APPROVED";

    const now = Date.now();
    const bucketStart = Math.floor(now / 600_000) * 600_000;
    const rateKey = `comment:${visitorHash}`;
    sqlite
      .prepare(
        `INSERT INTO public_rate_limits (key, bucket_start, count, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(key, bucket_start) DO UPDATE
         SET count = count + 1, updated_at = excluded.updated_at`,
      )
      .run(rateKey, bucketStart, now);
    const rate = sqlite
      .prepare("SELECT count FROM public_rate_limits WHERE key = ? AND bucket_start = ?")
      .get(rateKey, bucketStart) as { count: number };
    if (rate.count > 5) throw new InteractionError("RATE_LIMITED");

    let rootId: string | null = null;
    if (input.parentId) {
      const parent = sqlite
        .prepare(
          `SELECT id, root_id AS rootId FROM comments
           WHERE id = ? AND post_id = ? AND status = 'APPROVED'`,
        )
        .get(input.parentId, postId) as { id: string; rootId: string | null } | undefined;
      if (!parent) throw new InteractionError("PARENT_INVALID");
      rootId = parent.rootId ?? parent.id;
    }

    const id = randomUUID();
    sqlite
      .prepare(
        `INSERT INTO comments (
           id, post_id, parent_id, root_id, status, author_name, author_email,
           author_website, content, rendered_html, ip_hash, user_agent_summary,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        postId,
        input.parentId,
        rootId,
        status,
        input.authorName,
        input.authorEmail,
        input.authorWebsite || null,
        input.content,
        renderComment(input.content),
        visitorHash,
        userAgentSummary,
        now,
        now,
      );
    if (status === "APPROVED") {
      sqlite.prepare("UPDATE comments SET approved_at = ? WHERE id = ?").run(now, id);
      sqlite.prepare("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?").run(postId);
    }
    sqlite
      .prepare("INSERT INTO comment_requests (token_hash, comment_id, created_at) VALUES (?, ?, ?)")
      .run(tokenHash, id, now);
    return { id, status, duplicate: false };
  })();
}

export function listAdminComments(
  status: CommentStatus | undefined,
  limit = 20,
  offset = 0,
): AdminComment[] {
  const where = status ? "WHERE c.status = ?" : "";
  const params = status ? [status, limit, offset] : [limit, offset];
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT c.id, c.post_id AS postId, p.title AS postTitle, c.parent_id AS parentId,
              c.root_id AS rootId, c.status, c.author_name AS authorName,
              c.author_email AS authorEmail, c.author_website AS authorWebsite,
              c.content, c.rendered_html AS renderedHtml,
              c.created_at AS createdAt
       FROM comments c JOIN posts p ON p.id = c.post_id
       ${where} ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as AdminComment[];
}

export function countAdminCommentPosts(status?: CommentStatus): number {
  const where = status ? "WHERE c.status = ?" : "";
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT COUNT(DISTINCT c.post_id) AS total
       FROM comments c
       ${where}`,
    )
    .get(...(status ? [status] : [])) as { total: number };
  return row.total;
}

export function listAdminCommentPosts(
  status: CommentStatus | undefined,
  limit = 20,
  offset = 0,
): AdminCommentPostGroup[] {
  const sqlite = getDatabaseConnection().sqlite;
  const where = status ? "WHERE c.status = ?" : "";
  const groups = sqlite
    .prepare(
      `SELECT p.id AS postId, p.title AS postTitle, p.slug AS postSlug,
              COUNT(c.id) AS commentCount, MAX(c.created_at) AS latestCommentAt
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       ${where}
       GROUP BY p.id
       ORDER BY latestCommentAt DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...(status ? [status, limit, offset] : [limit, offset])) as Array<
    Omit<AdminCommentPostGroup, "comments">
  >;

  if (groups.length === 0) return [];

  const placeholders = groups.map(() => "?").join(", ");
  const commentWhere = status
    ? `c.post_id IN (${placeholders}) AND c.status = ?`
    : `c.post_id IN (${placeholders})`;
  const comments = sqlite
    .prepare(
      `SELECT c.id, c.post_id AS postId, p.title AS postTitle, c.parent_id AS parentId,
              c.root_id AS rootId, c.status, c.author_name AS authorName,
              c.author_email AS authorEmail, c.author_website AS authorWebsite,
              c.content, c.rendered_html AS renderedHtml, c.created_at AS createdAt
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       WHERE ${commentWhere}
       ORDER BY c.created_at DESC`,
    )
    .all(...(status ? [...groups.map((group) => group.postId), status] : groups.map((group) => group.postId))) as AdminComment[];

  return groups.map((group) => ({
    ...group,
    comments: comments.filter((comment) => comment.postId === group.postId),
  }));
}

/** 按状态统计评论数量，供评论管理页筛选标签显示计数。 */
export function countAdminCommentsByStatus(): Record<CommentStatus, number> {
  const rows = getDatabaseConnection()
    .sqlite.prepare("SELECT status, COUNT(*) AS total FROM comments GROUP BY status")
    .all() as Array<{ status: CommentStatus; total: number }>;
  const result: Record<CommentStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    SPAM: 0,
    TRASHED: 0,
  };
  for (const row of rows) {
    result[row.status] = row.total;
  }
  return result;
}

export function setCommentStatus(id: string, nextStatus: CommentStatus): void {
  const sqlite = getDatabaseConnection().sqlite;
  sqlite.transaction(() => {
    const current = sqlite
      .prepare("SELECT post_id AS postId, status FROM comments WHERE id = ?")
      .get(id) as { postId: string; status: CommentStatus } | undefined;
    if (!current || current.status === nextStatus) return;
    const now = Date.now();
    sqlite
      .prepare("UPDATE comments SET status = ?, approved_at = ?, updated_at = ? WHERE id = ?")
      .run(nextStatus, nextStatus === "APPROVED" ? now : null, now, id);
    if (current.status !== "APPROVED" && nextStatus === "APPROVED") {
      sqlite
        .prepare("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?")
        .run(current.postId);
    } else if (current.status === "APPROVED" && nextStatus !== "APPROVED") {
      sqlite
        .prepare("UPDATE posts SET comment_count = MAX(comment_count - 1, 0) WHERE id = ?")
        .run(current.postId);
    }
  })();
}

export function replyToComment(
  parentId: string,
  authorName: string,
  authorEmail: string,
  content: string,
): string {
  const sqlite = getDatabaseConnection().sqlite;
  return sqlite.transaction(() => {
    const parent = sqlite
      .prepare("SELECT id, post_id AS postId, root_id AS rootId FROM comments WHERE id = ?")
      .get(parentId) as { id: string; postId: string; rootId: string | null } | undefined;
    if (!parent) throw new InteractionError("PARENT_INVALID");
    const id = randomUUID();
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO comments (
           id, post_id, parent_id, root_id, status, author_name, author_email,
           content, rendered_html, ip_hash, created_at, updated_at, approved_at
         ) VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, 'administrator', ?, ?, ?)`,
      )
      .run(
        id,
        parent.postId,
        parent.id,
        parent.rootId ?? parent.id,
        authorName,
        authorEmail,
        content,
        renderComment(content),
        now,
        now,
        now,
      );
    sqlite
      .prepare("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?")
      .run(parent.postId);
    return id;
  })();
}
