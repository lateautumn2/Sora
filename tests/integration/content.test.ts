import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getAdminContentById,
  getPublishedContentBySlug,
  getSiteSettings,
  listCategories,
  saveContent,
  saveSiteSettings,
  saveTaxonomy,
  searchPublishedPosts,
} from "@/lib/content/service";
import {
  createPublicComment,
  InteractionError,
  listPublicComments,
  replyToComment,
  setCommentStatus,
} from "@/lib/comments/service";
import type { CommentRequestContext } from "@/lib/comments/request-context";
import { getDatabaseConnection, resetDatabaseConnectionForTests } from "@/lib/db/client";
import { resetEnvironmentForTests } from "@/lib/env";
import { registerView, toggleUpvote } from "@/lib/interactions/service";

let directory: string;
let previousDatabasePath: string | undefined;

function commentRequestContext(userAgentSummary = "test-agent"): CommentRequestContext {
  return {
    ipAddress: null,
    ipCity: null,
    userAgentSummary,
    browserName: null,
    browserVersion: null,
  };
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "sora-blog-content-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "blog.db");
  resetEnvironmentForTests();
  resetDatabaseConnectionForTests();
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    cwd: process.cwd(),
    env: process.env,
  });
});

afterEach(() => {
  resetDatabaseConnectionForTests();
  resetEnvironmentForTests();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(directory, { recursive: true, force: true });
});

describe("content service", () => {
  it("publishes sanitized Markdown with taxonomy, revision, and FTS search", () => {
    const categoryId = saveTaxonomy("category", {
      name: "技术",
      slug: "technology",
      description: "工程实践",
    });
    const tagId = saveTaxonomy("tag", {
      name: "SQLite",
      slug: "sqlite",
      description: "",
    });
    const postId = saveContent({
      kind: "POST",
      title: "SQLite 内容测试",
      slug: "sqlite-content-test",
      sourceContent: "# 安全正文\n\n<script>alert(1)</script>\n\nSQLite search marker",
      sourceFormat: "MARKDOWN",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      allowComment: true,
      pinned: false,
      categoryIds: [categoryId],
      tagIds: [tagId],
    });

    const post = getPublishedContentBySlug("sqlite-content-test", "POST");
    expect(post).toMatchObject({ id: postId, title: "SQLite 内容测试" });
    expect(post?.renderedHtml).not.toContain("<script");
    expect(post?.categories[0]?.name).toBe("技术");
    expect(post?.tags[0]?.name).toBe("SQLite");
    expect(listCategories()[0]?.count).toBe(1);
    expect(searchPublishedPosts("marker")[0]?.id).toBe(postId);
    expect(searchPublishedPosts("mark")[0]?.id).toBe(postId);
    expect(searchPublishedPosts("内容测")[0]?.id).toBe(postId);
    expect(searchPublishedPosts("SQLite 内容测试")[0]?.id).toBe(postId);

    const draftId = saveContent({
      kind: "POST",
      title: "内容测试草稿",
      slug: "content-search-draft",
      sourceContent: "SQLite search marker draft",
      sourceFormat: "MARKDOWN",
      status: "DRAFT",
      visibility: "PUBLIC",
      allowComment: true,
      pinned: false,
      categoryIds: [],
      tagIds: [],
    });
    expect(searchPublishedPosts("内容测").map((result) => result.id)).not.toContain(draftId);

    const revision = getDatabaseConnection()
      .sqlite.prepare("SELECT COUNT(*) AS count FROM post_revisions WHERE post_id = ?")
      .get(postId) as { count: number };
    expect(revision.count).toBe(1);
  });

  it("applies global comment settings to new submissions", () => {
    const postId = saveContent({
      kind: "POST",
      title: "全局评论设置",
      slug: "global-comment-settings",
      sourceContent: "正文",
      sourceFormat: "MARKDOWN",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      allowComment: true,
      pinned: false,
      categoryIds: [],
      tagIds: [],
    });
    const baseInput = {
      authorName: "访客",
      authorEmail: "reader@example.com",
      authorWebsite: "",
      content: "一条评论",
      parentId: null,
      company: "",
    };

    saveSiteSettings({ ...getSiteSettings(), requireCommentModeration: false });
    const published = createPublicComment(
      postId,
      { ...baseInput, requestToken: randomUUID() },
      "visitor-settings",
      commentRequestContext(),
    );
    expect(published.status).toBe("APPROVED");

    saveSiteSettings({ ...getSiteSettings(), allowComments: false });
    expect(() =>
      createPublicComment(
        postId,
        { ...baseInput, requestToken: randomUUID(), content: "关闭后的评论" },
        "visitor-settings-closed",
        commentRequestContext(),
      ),
    ).toThrowError(new InteractionError("COMMENTS_CLOSED"));
  });

  it("stores comment request context without exposing private fields publicly", () => {
    const postId = saveContent({
      kind: "POST",
      title: "评论环境信息",
      slug: "comment-request-context",
      sourceContent: "正文",
      sourceFormat: "MARKDOWN",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      allowComment: true,
      pinned: false,
      categoryIds: [],
      tagIds: [],
    });
    saveSiteSettings({ ...getSiteSettings(), requireCommentModeration: false });

    const result = createPublicComment(
      postId,
      {
        authorName: "访客",
        authorEmail: "reader@example.com",
        authorWebsite: "https://example.com",
        content: "携带环境信息的评论",
        parentId: null,
        requestToken: randomUUID(),
        company: "",
      },
      "visitor-context",
      {
        ipAddress: "203.0.113.8",
        ipCity: "杭州",
        userAgentSummary: "Mozilla/5.0 Chrome/139.0.0.0",
        browserName: "Chrome",
        browserVersion: "139.0.0.0",
      },
    );

    expect(result.comment).toMatchObject({
      id: result.id,
      avatarHash: "baa0f4114eafbdd39ce828d01b849ae6",
      browserName: "Chrome",
      browserVersion: "139.0.0.0",
      ipCity: "杭州",
    });
    expect(result.comment).not.toHaveProperty("authorEmail");
    expect(result.comment).not.toHaveProperty("ipAddress");
    expect(listPublicComments(postId)).toEqual([result.comment]);

    expect(
      getDatabaseConnection()
        .sqlite.prepare(
          `SELECT ip_address AS ipAddress, ip_city AS ipCity,
                  browser_name AS browserName, browser_version AS browserVersion
           FROM comments WHERE id = ?`,
        )
        .get(result.id),
    ).toEqual({
      ipAddress: "203.0.113.8",
      ipCity: "杭州",
      browserName: "Chrome",
      browserVersion: "139.0.0.0",
    });
  });

  it("does not persist post taxonomy for page content", () => {
    const categoryId = saveTaxonomy("category", {
      name: "页面分类",
      slug: "page-category",
      description: "",
    });
    const tagId = saveTaxonomy("tag", {
      name: "页面标签",
      slug: "page-tag",
      description: "",
    });
    const pageId = saveContent({
      kind: "PAGE",
      title: "页面内容",
      slug: "page-content",
      sourceContent: "正文",
      sourceFormat: "MARKDOWN",
      status: "DRAFT",
      visibility: "PUBLIC",
      allowComment: false,
      pinned: false,
      categoryIds: [categoryId],
      tagIds: [tagId],
    });

    expect(getAdminContentById(pageId)?.categories).toEqual([]);
    expect(getAdminContentById(pageId)?.tags).toEqual([]);
  });

  it("persists idempotent comments, moderation counts, views, upvotes, and rate limits", () => {
    const postId = saveContent({
      kind: "POST",
      title: "互动测试",
      slug: "interaction-test",
      sourceContent: "正文",
      sourceFormat: "MARKDOWN",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      allowComment: true,
      pinned: false,
      categoryIds: [],
      tagIds: [],
    });
    const requestToken = randomUUID();
    const input = {
      authorName: "访客",
      authorEmail: "reader@example.com",
      authorWebsite: "",
      content: "第一条评论",
      parentId: null,
      requestToken,
      company: "",
    };
    const first = createPublicComment(postId, input, "visitor-a", commentRequestContext());
    const duplicate = createPublicComment(postId, input, "visitor-a", commentRequestContext());
    expect(first.status).toBe("PENDING");
    expect(duplicate).toMatchObject({ id: first.id, duplicate: true });
    expect(listPublicComments(postId)).toHaveLength(0);

    setCommentStatus(first.id, "APPROVED");
    expect(listPublicComments(postId)).toHaveLength(1);
    replyToComment(first.id, "管理员", "admin@example.com", "公开回复");
    expect(listPublicComments(postId)).toHaveLength(2);

    expect(registerView(postId, "visitor-a").viewCount).toBe(1);
    expect(registerView(postId, "visitor-a").viewCount).toBe(1);
    expect(toggleUpvote(postId, "visitor-a")).toMatchObject({ upvoteCount: 1, upvoted: true });
    expect(toggleUpvote(postId, "visitor-a")).toMatchObject({ upvoteCount: 0, upvoted: false });

    for (let index = 0; index < 4; index += 1) {
      createPublicComment(
        postId,
        { ...input, content: `评论 ${index}`, requestToken: randomUUID() },
        "visitor-a",
        commentRequestContext(),
      );
    }
    expect(() =>
      createPublicComment(
        postId,
        { ...input, requestToken: randomUUID() },
        "visitor-a",
        commentRequestContext(),
      ),
    ).toThrowError(new InteractionError("RATE_LIMITED"));

    const counts = getDatabaseConnection()
      .sqlite.prepare(
        "SELECT comment_count AS commentCount, view_count AS viewCount, upvote_count AS upvoteCount FROM posts WHERE id = ?",
      )
      .get(postId) as { commentCount: number; viewCount: number; upvoteCount: number };
    expect(counts).toEqual({ commentCount: 2, viewCount: 1, upvoteCount: 0 });
  });
});
