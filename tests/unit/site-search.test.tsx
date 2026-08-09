// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteSearch } from "@/components/site/site-search";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("site search overlay", () => {
  it("searches after a short delay and keeps results inside the current-page dialog", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          {
            id: "post-1",
            title: "SQLite 内容测试",
            slug: "sqlite-content-test",
            excerpt: "工程实践",
            publishedAt: new Date(2026, 7, 9).getTime(),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    render(<SiteSearch variant="header" />);
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    const dialog = screen.getByRole("dialog", { name: "搜索文章" });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveClass("ui-dialog-content", "sora-search-dialog-shell");
    fireEvent.change(within(dialog).getByRole("searchbox", { name: "搜索文章" }), {
      target: { value: "SQLite 内容" },
    });

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/public/search?q=SQLite%20%E5%86%85%E5%AE%B9",
        expect.objectContaining({
          cache: "no-store",
          signal: expect.any(AbortSignal),
        }),
      ),
    );
    expect(await within(dialog).findByRole("link", { name: /SQLite 内容测试/ })).toHaveAttribute(
      "href",
      "/posts/sqlite-content-test",
    );
    expect(within(dialog).getByText("工程实践")).toBeVisible();
    expect(window.location.pathname).toBe("/");
  });

  it("renders a query-specific empty state without navigating away", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [] })));

    render(<SiteSearch variant="home" />);
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索文章" }), {
      target: { value: "没有结果" },
    });

    expect(await screen.findByText("暂未找到与“没有结果”匹配的文章")).toBeVisible();
  });
});
