import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
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
import { getDatabaseConnection, resetDatabaseConnectionForTests } from "@/lib/db/client";
import { resetEnvironmentForTests } from "@/lib/env";
import { registerView, toggleUpvote } from "@/lib/interactions/service";

let directory: string;
let previousDatabasePath: string | undefined;

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
      "test-agent",
    );
    expect(published.status).toBe("APPROVED");

    saveSiteSettings({ ...getSiteSettings(), allowComments: false });
    expect(() =>
      createPublicComment(
        postId,
        { ...baseInput, requestToken: randomUUID(), content: "关闭后的评论" },
        "visitor-settings-closed",
        "test-agent",
      ),
    ).toThrowError(new InteractionError("COMMENTS_CLOSED"));
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
    const first = createPublicComment(postId, input, "visitor-a", "test-agent");
    const duplicate = createPublicComment(postId, input, "visitor-a", "test-agent");
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
        "test-agent",
      );
    }
    expect(() =>
      createPublicComment(
        postId,
        { ...input, requestToken: randomUUID() },
        "visitor-a",
        "test-agent",
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
