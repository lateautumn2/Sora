import nodemailer from "nodemailer";

import { getSmtpConfig } from "@/lib/email/config";

export interface CommentMailMessage {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  heading: string;
  introduction: string;
  authorName: string;
  content: string;
  postTitle: string;
  postUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function createTransport(config: ReturnType<typeof getSmtpConfig>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

/** 验证 SMTP 连接与认证，不发送邮件。 */
export async function verifySmtpConnection(): Promise<void> {
  const config = getSmtpConfig();
  await createTransport(config).verify();
}

/** 使用当前 SMTP 配置发送一封经过转义的评论提醒邮件。 */
export async function sendCommentMail(message: CommentMailMessage): Promise<void> {
  const config = getSmtpConfig();
  const transporter = createTransport(config);
  const recipientName = singleLine(message.recipientName);
  const subject = singleLine(message.subject);
  const text = [
    recipientName ? `${recipientName}，你好：` : "你好：",
    "",
    message.introduction,
    "",
    `${message.authorName}：`,
    message.content,
    "",
    `文章：${message.postTitle}`,
    `查看：${message.postUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#1f2937;max-width:680px;margin:auto">
      <h2 style="font-size:20px;margin:0 0 16px">${escapeHtml(message.heading)}</h2>
      <p>${escapeHtml(recipientName ? `${recipientName}，你好：` : "你好：")}</p>
      <p>${escapeHtml(message.introduction)}</p>
      <blockquote style="margin:20px 0;padding:12px 16px;border-left:4px solid #94a3b8;background:#f8fafc">
        <strong>${escapeHtml(singleLine(message.authorName))}</strong>
        <div style="white-space:pre-wrap;margin-top:8px">${escapeHtml(message.content)}</div>
      </blockquote>
      <p>文章：<strong>${escapeHtml(message.postTitle)}</strong></p>
      <p><a href="${escapeHtml(message.postUrl)}">查看文章与评论</a></p>
      <p style="color:#64748b;font-size:12px;margin-top:28px">此邮件由站点评论提醒功能自动发送，请勿直接回复本邮件。</p>
    </div>
  `;

  await transporter.sendMail({
    from: { name: singleLine(config.fromName), address: config.fromAddress },
    to: { name: recipientName, address: message.recipientEmail },
    subject,
    text,
    html,
  });
}
