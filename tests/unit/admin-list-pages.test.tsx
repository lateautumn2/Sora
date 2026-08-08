// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

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

afterEach(cleanup);

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

test("comments retain article groups and use shared reply fields", async () => {
  render(await AdminCommentsPage({ searchParams: Promise.resolve({}) }));

  const group = screen.getByRole("region", { name: "测试文章" });
  expect(within(group).getByText("待审核评论")).toBeVisible();
  expect(within(group).getByRole("textbox", { name: "回复 访客" })).toHaveClass("ui-textarea");
  expect(screen.getByRole("tab", { name: "待审核" })).toBeVisible();
});
