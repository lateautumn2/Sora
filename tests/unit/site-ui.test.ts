// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { PostList } from "@/components/site/post-list";
import { PostBackButton } from "@/components/site/post-back-button";
import { PostContent } from "@/components/site/post-content";
import { PostToc } from "@/components/site/post-toc";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import HomePage from "@/app/(site)/page";
import PostPage from "@/app/(site)/posts/[slug]/page";
import { siteSettingsSchema } from "@/lib/content/validation";

const siteNavigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => siteNavigationState.pathname,
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

const siteSettingsState = vi.hoisted(() => ({ footerHitokotoEnabled: false }));

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
        footerText: "静态页脚回退",
        footerHitokotoEnabled: siteSettingsState.footerHitokotoEnabled,
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

afterEach(() => {
  cleanup();
  siteNavigationState.pathname = "/";
  siteSettingsState.footerHitokotoEnabled = false;
  vi.unstubAllGlobals();
});

function getSiteFooterElement() {
  const footer = SiteFooter();
  expect(footer).not.toBeInstanceOf(Promise);
  if (footer instanceof Promise) {
    throw new Error("SiteFooter must render before the browser fetch completes.");
  }
  return footer;
}

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
    expect(screen.getByRole("button", { name: "搜索" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "搜索" })).not.toBeInTheDocument();
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

  test("defaults the hitokoto footer setting to disabled", () => {
    expect(siteSettingsSchema.parse({}).footerHitokotoEnabled).toBe(false);
  });

  test("shows the configured footer text without requesting hitokoto when disabled", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(getSiteFooterElement());

    expect(screen.getByText("静态页脚回退")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("keeps an enabled footer blank until the browser receives hitokoto", async () => {
    siteSettingsState.footerHitokotoEnabled = true;
    let resolveResponse: (response: Response) => void = () => {};
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(responsePromise);
    vi.stubGlobal("fetch", fetchMock);

    render(getSiteFooterElement());

    expect(screen.queryByText("静态页脚回退")).not.toBeInTheDocument();
    expect(document.querySelector(".sora-footer-note")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveResponse(
        new Response(JSON.stringify({ hitokoto: "  山高水长，自有回声。  " }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    });

    expect(await screen.findByText("山高水长，自有回声。")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://v1.hitokoto.cn/?encode=json",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  test.each([
    ["network error", () => Promise.reject(new Error("offline"))],
    ["http error", () => Promise.resolve(new Response("unavailable", { status: 503 }))],
    ["invalid payload", () => Promise.resolve(new Response(JSON.stringify({ hitokoto: " " })))],
  ])("keeps the enabled footer blank after a %s", async (_case, response) => {
    siteSettingsState.footerHitokotoEnabled = true;
    const fetchMock = vi.fn(response);
    vi.stubGlobal("fetch", fetchMock);

    render(getSiteFooterElement());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(screen.queryByText("静态页脚回退")).not.toBeInTheDocument();
    expect(document.querySelector(".sora-footer-note")).not.toBeInTheDocument();
  });

  test("requests a fresh hitokoto after the public pathname changes", async () => {
    siteSettingsState.footerHitokotoEnabled = true;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ hitokoto: "第一句" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hitokoto: "第二句" })));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(getSiteFooterElement());
    expect(await screen.findByText("第一句")).toBeVisible();

    siteNavigationState.pathname = "/about";
    rerender(getSiteFooterElement());

    expect(await screen.findByText("第二句")).toBeVisible();
    expect(screen.queryByText("第一句")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toEqual(
        expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
      );
    }
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

  test("sizes the article table of contents for comfortable reading", () => {
    const style = document.createElement("style");
    style.textContent = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    document.head.append(style);

    const { container } = render(createElement(PostToc));
    const toc = container.querySelector<HTMLElement>(".sora-post-toc");
    if (!toc) throw new Error("Article table of contents did not render.");
    const navigation = toc.querySelector<HTMLElement>("nav");
    if (!navigation) throw new Error("Article table of contents navigation did not render.");

    expect(getComputedStyle(toc).width).toBe("10rem");
    expect(getComputedStyle(navigation).fontSize).toBe("0.88rem");

    style.remove();
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
