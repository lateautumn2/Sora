import { getSiteSettings } from "@/lib/content/service";
import { getDatabaseConnection } from "@/lib/db/client";
import { getSmtpConfig } from "@/lib/email/config";
import { sendCommentMail } from "@/lib/email/mailer";
import { getAppUrl } from "@/lib/runtime-config";

type CommentAuthorRole = "VISITOR" | "OWNER";
type CommentStatus = "PENDING" | "APPROVED" | "SPAM" | "TRASHED";

interface NotificationComment {
  id: string;
  authorRole: CommentAuthorRole;
  authorName: string;
  authorEmail: string;
  content: string;
  status: CommentStatus;
  replyNotifiedAt: number | null;
  postTitle: string;
  postSlug: string;
  parentId: string | null;
  parentAuthorRole: CommentAuthorRole | null;
  parentAuthorName: string | null;
  parentAuthorEmail: string | null;
}

export type CommentNotificationResult =
  "SENT" | "DISABLED" | "SUPPRESSED" | "PENDING_APPROVAL" | "ALREADY_SENT" | "FAILED";

function getNotificationComment(id: string): NotificationComment | null {
  return (
    (getDatabaseConnection()
      .sqlite.prepare(
        `SELECT c.id, c.author_role AS authorRole, c.author_name AS authorName,
                c.author_email AS authorEmail, c.content, c.status,
                c.reply_notified_at AS replyNotifiedAt,
                p.title AS postTitle, p.slug AS postSlug,
                parent.id AS parentId, parent.author_role AS parentAuthorRole,
                parent.author_name AS parentAuthorName,
                parent.author_email AS parentAuthorEmail
         FROM comments c
         JOIN posts p ON p.id = c.post_id
         LEFT JOIN comments parent ON parent.id = c.parent_id
         WHERE c.id = ?
         LIMIT 1`,
      )
      .get(id) as NotificationComment | undefined) ?? null
  );
}

function postUrl(slug: string): string {
  return new URL(`/posts/${encodeURIComponent(slug)}`, getAppUrl()).toString();
}

function markReplyNotified(id: string): void {
  getDatabaseConnection()
    .sqlite.prepare(
      "UPDATE comments SET reply_notified_at = ? WHERE id = ? AND reply_notified_at IS NULL",
    )
    .run(Date.now(), id);
}

function sameEmail(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

async function sendReplyNotification(
  comment: NotificationComment,
  recipientEmail: string,
  recipientName: string,
): Promise<CommentNotificationResult> {
  if (comment.replyNotifiedAt) return "ALREADY_SENT";
  if (!recipientEmail || sameEmail(recipientEmail, comment.authorEmail)) return "SUPPRESSED";

  const settings = getSiteSettings();
  try {
    await sendCommentMail({
      recipientEmail,
      recipientName,
      subject: `[${settings.title}] ${comment.authorName} 回复了你的评论`,
      heading: "你收到了一条新回复",
      introduction: `${comment.authorName} 在《${comment.postTitle}》中回复了你：`,
      authorName: comment.authorName,
      content: comment.content,
      postTitle: comment.postTitle,
      postUrl: postUrl(comment.postSlug),
    });
    markReplyNotified(comment.id);
    return "SENT";
  } catch (error) {
    console.error("Comment reply email failed", {
      commentId: comment.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return "FAILED";
  }
}

/**
 * 游客提交评论后的通知规则：
 * - 顶层评论或回复博主：立即通知博主；
 * - 回复游客：按开关决定是否通知，待审核时延后至审核通过。
 */
export async function notifyForVisitorComment(
  commentId: string,
): Promise<CommentNotificationResult> {
  try {
    const config = getSmtpConfig();
    if (!config.enabled) return "DISABLED";
    const comment = getNotificationComment(commentId);
    if (!comment || comment.authorRole !== "VISITOR") return "SUPPRESSED";

    if (comment.parentId && comment.parentAuthorRole === "VISITOR") {
      if (config.suppressVisitorReplies) return "SUPPRESSED";
      if (comment.status !== "APPROVED") return "PENDING_APPROVAL";
      return sendReplyNotification(
        comment,
        comment.parentAuthorEmail ?? "",
        comment.parentAuthorName ?? "",
      );
    }

    const settings = getSiteSettings();
    try {
      await sendCommentMail({
        recipientEmail: config.ownerEmail,
        recipientName: settings.authorName,
        subject: `[${settings.title}] ${comment.authorName} 发表了新评论`,
        heading: "你的文章收到了一条新评论",
        introduction: `${comment.authorName} 在《${comment.postTitle}》中留下了评论：`,
        authorName: comment.authorName,
        content: comment.content,
        postTitle: comment.postTitle,
        postUrl: postUrl(comment.postSlug),
      });
      return "SENT";
    } catch (error) {
      console.error("Owner comment email failed", {
        commentId: comment.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return "FAILED";
    }
  } catch (error) {
    console.error("Comment notification planning failed", {
      commentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "FAILED";
  }
}

/**
 * 游客回复游客且需要审核时，只在首次审核通过后补发提醒。
 * 顶层评论和回复博主的评论已经在提交阶段通知博主，不在这里重复发送。
 */
export async function notifyForApprovedVisitorReply(
  commentId: string,
): Promise<CommentNotificationResult> {
  try {
    const config = getSmtpConfig();
    if (!config.enabled) return "DISABLED";
    if (config.suppressVisitorReplies) return "SUPPRESSED";

    const comment = getNotificationComment(commentId);
    if (
      !comment ||
      comment.status !== "APPROVED" ||
      comment.authorRole !== "VISITOR" ||
      comment.parentAuthorRole !== "VISITOR"
    ) {
      return "SUPPRESSED";
    }

    return sendReplyNotification(
      comment,
      comment.parentAuthorEmail ?? "",
      comment.parentAuthorName ?? "",
    );
  } catch (error) {
    console.error("Approved visitor reply notification planning failed", {
      commentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "FAILED";
  }
}

/** 博主在后台回复游客后，立即向父评论留下的邮箱发送回复内容。 */
export async function notifyForOwnerReply(commentId: string): Promise<CommentNotificationResult> {
  try {
    const config = getSmtpConfig();
    if (!config.enabled) return "DISABLED";
    const comment = getNotificationComment(commentId);
    if (!comment || comment.authorRole !== "OWNER" || comment.parentAuthorRole !== "VISITOR") {
      return "SUPPRESSED";
    }
    return sendReplyNotification(
      comment,
      comment.parentAuthorEmail ?? "",
      comment.parentAuthorName ?? "",
    );
  } catch (error) {
    console.error("Owner reply notification planning failed", {
      commentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "FAILED";
  }
}
