// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { describe, expect, test, vi } from "vitest";

import { PostList } from "@/components/site/post-list";
import { PostBackButton } from "@/components/site/post-back-button";
import { PostContent } from "@/components/site/post-content";
import { SiteHeader } from "@/components/site/site-header";
import HomePage from "@/app/(site)/page";
import PostPage from "@/app/(site)/posts/[slug]/page";
import { siteSettingsSchema } from "@/lib/content/validation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

const samplePost = {
  id: "post-1",
  kind: "POST" as const,
  title: "Sora 视觉还原",
  slug: "sora-ui",
  excerpt: "保持轻量、克制，并把内容放在第一位。",
  status: "PUBLISHED" as const,
  visibility: "PUBLIC" as const,
  pinned: false,
  publishedAt: new Date(2025, 8, 3).getTime(),
  updatedAt: new Date(2025, 8, 3).getTime(),
  wordCount: 900,
  readingMinutes: 3,
  viewCount: 12,
  upvoteCount: 2,
  commentCount: 1,
  categories: [{ id: "category-1", name: "前端", slug: "frontend", description: "", count: 1 }],
  tags: [],
};

vi.mock("@/lib/content/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/service")>();
  return {
    ...actual,
    getSiteSettings: () =>
      siteSettingsSchema.parse({
        title: "Sora",
        description: "记录技术与生活。",
        authorName: "Sora",
        avatarUrl: "",
        email: "hello@example.com",
        githubUrl: "https://github.com/example",
        footerText: "Powered by Sora",
      }),
    listPrimaryMenuItems: () => [],
    listPublishedPosts: () => [samplePost],
    countPublishedPosts: () => 1,
    getPublishedContentBySlug: () => ({
      ...samplePost,
      sourceContent: "# 正文标题\n\n内容。",
      sourceFormat: "MARKDOWN" as const,
      renderedHtml: '<h2 id="section">正文标题</h2><p>内容。</p>',
      plainText: "正文标题 内容。",
      allowComment: true,
      seoTitle: "",
      seoDescription: "",
      canonicalUrl: "",
    }),
  };
});

vi.mock("@/lib/comments/service", () => ({ listPublicComments: () => [] }));
vi.mock("@/components/site/post-interactions", () => ({ PostInteractions: () => null }));

describe("Sora public UI", () => {
  test("retains public typography, article images, navigation, and ByteMD vendor styles", () => {
    const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(styles).toMatch(/\.prose-content\s*\{/);
    expect(styles).toMatch(/\.prose-content img\s*\{/);
    expect(styles).toMatch(/\.sora-inner-navigation\s*\{/);
    expect(styles).toContain(".bytemd");
  });

  test("ships a site icon so browsers do not fall back to a missing favicon", () => {
    expect(existsSync(join(process.cwd(), "app", "icon.svg"))).toBe(true);
  });

  test("renders post summaries as compact Sora cards with an ISO-style date", () => {
    const { container } = render(createElement(PostList, { posts: [samplePost] }));

    expect(screen.getByRole("article")).toHaveClass("sora-post-card");
    expect(screen.getByRole("time")).toHaveTextContent("2025-09-03");
    expect(screen.queryByText("3 分钟")).not.toBeInTheDocument();
    expect(container.querySelector(".sora-post-list")).toBeInTheDocument();
  });

  test("uses the original compact inner header structure", () => {
    const { container } = render(createElement(SiteHeader));

    expect(container.querySelector(".sora-inner-header")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sora" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeVisible();
    expect(screen.getByRole("link", { name: "搜索" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "RSS 订阅" })).not.toBeInTheDocument();
  });

  test("accepts an optional avatar URL in site settings", () => {
    const settings = siteSettingsSchema.parse({
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(settings.avatarUrl).toBe("https://example.com/avatar.png");
    expect(siteSettingsSchema.parse({}).avatarUrl).toBe("");
  });

  test("defaults global comment settings to enabled moderation", () => {
    expect(siteSettingsSchema.parse({})).toMatchObject({
      allowComments: true,
      requireCommentModeration: true,
    });
  });

  test("uses the homepage identity composition without inner-page headings", async () => {
    const page = await HomePage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect(container.querySelector(".sora-home")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "首页导航" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "最近文章" })).not.toBeInTheDocument();
    expect(within(container).getByRole("article")).toBeVisible();
  });

  test("includes the Sora article notice, table of contents, and license ending", async () => {
    const article = await PostPage({ params: Promise.resolve({ slug: "sora-ui" }) });
    render(article);

    expect(screen.getByRole("navigation", { name: "文章目录" })).toBeVisible();
    expect(screen.getByText(/部分内容可能已经发生变化/)).toBeVisible();
    expect(screen.getByText("文章许可")).toBeVisible();
  });

  test("opens article images in an accessible lightbox", () => {
    const { container } = render(
      createElement(PostContent, {
        html: '<p>正文</p><img alt="示例图" src="/media/example.png" />',
      }),
    );

    fireEvent.click(container.querySelector("img") as HTMLImageElement);

    expect(screen.getByRole("dialog", { name: "图片预览" })).toBeVisible();
    const dialog = screen.getByRole("dialog", { name: "图片预览" });
    expect(within(dialog).getByRole("img", { name: "示例图" })).toHaveAttribute(
      "src",
      "http://localhost:3000/media/example.png",
    );
  });

  test("renders a fixed previous-page control for article details", () => {
    const { container } = render(createElement(PostBackButton));

    expect(within(container).getByRole("button", { name: "返回上一页" })).toHaveAttribute(
      "title",
      "返回上一页",
    );
  });
});
