import { beforeEach, describe, expect, it, vi } from "vitest";

const searchPublishedPosts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/content/service", () => ({ searchPublishedPosts }));

import { GET } from "@/app/api/v1/public/search/route";

describe("public search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty result without querying for blank input", async () => {
    const response = GET(new Request("https://blog.example/api/v1/public/search?q=%20"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
    expect(searchPublishedPosts).not.toHaveBeenCalled();
  });

  it("returns only the fields required by the search overlay", async () => {
    searchPublishedPosts.mockReturnValue([
      {
        id: "post-1",
        kind: "POST",
        title: "SQLite 内容测试",
        slug: "sqlite-content-test",
        excerpt: "工程实践",
        publishedAt: 1_786_262_400_000,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        pinned: false,
        updatedAt: 1_786_262_400_000,
        wordCount: 100,
        readingMinutes: 1,
        viewCount: 0,
        upvoteCount: 0,
        commentCount: 0,
        categories: [],
        tags: [],
      },
    ]);

    const response = GET(
      new Request("https://blog.example/api/v1/public/search?q=SQLite%20%E5%86%85%E5%AE%B9"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "post-1",
          title: "SQLite 内容测试",
          slug: "sqlite-content-test",
          excerpt: "工程实践",
          publishedAt: 1_786_262_400_000,
        },
      ],
    });
  });

  it("rejects overlong queries before reaching the database", async () => {
    const query = encodeURIComponent("长".repeat(101));
    const response = GET(new Request(`https://blog.example/api/v1/public/search?q=${query}`));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: { code: "QUERY_TOO_LONG", message: "搜索关键词不能超过 100 个字符" },
    });
    expect(searchPublishedPosts).not.toHaveBeenCalled();
  });
});
