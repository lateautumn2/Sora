// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import AdminCommentsPage from "@/app/(admin)/admin/comments/page";
import AdminDashboardPage from "@/app/(admin)/admin/page";
import { ContentList } from "@/components/admin/content-list";

vi.mock("@/app/(admin)/admin/comments/actions", () => ({
  changeCommentStatusAction: vi.fn(),
  replyCommentAction: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/content-actions", () => ({
  restoreContentAction: vi.fn(),
}));

vi.mock("@/lib/comments/service", () => ({
  countAdminCommentPosts: () => 1,
  listAdminCommentPosts: () => [
    {
      postId: "00000000-0000-4000-8000-000000000001",
      postTitle: "测试文章",
      postSlug: "test-post",
      commentCount: 1,
      latestCommentAt: Date.UTC(2026, 7, 8),
      comments: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          postId: "00000000-0000-4000-8000-000000000001",
          postTitle: "测试文章",
          parentId: null,
          rootId: null,
          status: "PENDING",
          authorName: "访客",
          authorEmail: "reader@example.com",
          authorWebsite: "",
          avatarHash: "baa0f4114eafbdd39ce828d01b849ae6",
          browserName: "Chrome",
          browserVersion: "139.0.0.0",
          ipCity: "杭州",
          content: "待审核评论",
          renderedHtml: "<p>待审核评论</p>",
          createdAt: Date.UTC(2026, 7, 8),
        },
      ],
    },
  ],
}));

vi.mock("@/lib/content/service", () => ({
  getDashboardStats: () => ({
    publishedPosts: 1,
    pendingComments: 1,
    totalViews: 12,
    totalComments: 2,
    topPosts: [],
  }),
  listTopPostsByViews: () => ({ posts: [], total: 0 }),
}));

let adminStyles: HTMLStyleElement;

beforeEach(() => {
  adminStyles = document.createElement("style");
  adminStyles.textContent = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");
  document.head.append(adminStyles);
});

afterEach(() => {
  cleanup();
  adminStyles.remove();
});

const items = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    kind: "POST" as const,
    title: "后台 UI 重构",
    slug: "admin-ui",
    excerpt: "",
    status: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    pinned: false,
    publishedAt: Date.UTC(2026, 7, 8),
    updatedAt: Date.UTC(2026, 7, 8),
    wordCount: 800,
    readingMinutes: 3,
    viewCount: 12,
    upvoteCount: 1,
    commentCount: 2,
    categories: [],
    tags: [],
  },
];

test("content list exposes status tabs, filter toolbar, trash, and semantic rows", () => {
  render(<ContentList items={items} kind="POST" page={1} totalPages={2} />);

  expect(screen.getByRole("tab", { name: "全部文章" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "回收站" })).toBeVisible();
  expect(screen.getByRole("toolbar", { name: "文章筛选" })).toBeVisible();
  expect(screen.getByRole("table", { name: "文章列表" })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "文章" })).toBeVisible();
  expect(screen.getByRole("link", { name: "下一页" })).toHaveAttribute(
    "href",
    "/admin/posts?page=2",
  );
});

test("dashboard does not render a create-post action", async () => {
  render(await AdminDashboardPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "新建文章" })).not.toBeInTheDocument();
});

test("admin comments show the same avatar and environment metadata as public comments", async () => {
  render(await AdminCommentsPage({ searchParams: Promise.resolve({}) }));

  const group = screen.getByRole("region", { name: "测试文章" });
  expect(within(group).getByRole("img", { name: "访客的头像" })).toHaveAttribute(
    "src",
    "https://gravatar.com/avatar/baa0f4114eafbdd39ce828d01b849ae6?s=80&d=404",
  );
  const browserTag = within(group).getByText("Chrome 139.0.0.0");
  const cityTag = within(group).getByText("杭州");
  expect(browserTag).toHaveClass("comment-environment-tag", "comment-environment-browser");
  expect(cityTag).toHaveClass("comment-environment-tag", "comment-environment-city");
  expect(browserTag.parentElement).toBe(cityTag.parentElement);
});

test("comments keep reply fields collapsed until requested", async () => {
  const { container } = render(await AdminCommentsPage({ searchParams: Promise.resolve({}) }));

  const group = screen.getByRole("region", { name: "测试文章" });
  const actions = container.querySelector<HTMLElement>(".admin-comment-actions");
  if (!actions) throw new Error("Comment actions did not render.");
  expect(within(group).getByText("待审核评论")).toBeVisible();
  expect(within(group).queryByRole("textbox", { name: "回复 访客" })).not.toBeInTheDocument();

  expect(within(actions).getByRole("button", { name: "垃圾" })).toBeVisible();
  expect(within(actions).getByRole("button", { name: "删除" })).toBeVisible();
  const replyButton = within(actions).getByRole("button", { name: "回复 访客" });
  expect(replyButton).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(replyButton);

  expect(within(group).getByRole("textbox", { name: "回复 访客" })).toHaveClass("ui-textarea");
  expect(within(actions).getByRole("button", { name: "提交" })).toBeVisible();
  expect(within(actions).queryByRole("button", { name: "取消回复" })).not.toBeInTheDocument();
  expect(replyButton).toHaveAttribute("aria-expanded", "true");
  const replyForm = actions.querySelector<HTMLElement>(".admin-comment-reply");
  if (!replyForm) throw new Error("Comment reply form did not render.");
  expect(getComputedStyle(replyForm).flexBasis).toBe("100%");
  expect(getComputedStyle(replyForm).width).toBe("100%");

  fireEvent.click(replyButton);
  expect(within(group).queryByRole("textbox", { name: "回复 访客" })).not.toBeInTheDocument();
  expect(replyButton).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("tab", { name: "待审核" })).toBeVisible();
});
