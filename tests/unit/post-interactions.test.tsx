// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostInteractions } from "@/components/site/post-interactions";
import type { PublicComment } from "@/lib/comments/service";

const approvedComment: PublicComment = {
  id: "comment-1",
  parentId: null,
  rootId: null,
  authorName: "访客",
  authorWebsite: "https://example.com",
  avatarHash: "baa0f4114eafbdd39ce828d01b849ae6",
  browserName: "Chrome",
  browserVersion: "139",
  ipCity: "杭州",
  renderedHtml: "<p>实时公开评论</p>",
  createdAt: new Date(2026, 7, 9, 14, 30).getTime(),
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function mockInteractions(commentResult: {
  id: string;
  status: "PENDING" | "APPROVED";
  duplicate: boolean;
  comment: PublicComment | null;
}) {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/view")) {
      return Promise.resolve(
        Response.json({ data: { viewCount: 2, upvoteCount: 0, upvoted: false } }),
      );
    }
    if (url.endsWith("/comments")) {
      return Promise.resolve(Response.json({ data: commentResult }, { status: 201 }));
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("post comments", () => {
  it("restores the saved profile and appends an immediately approved comment", async () => {
    localStorage.setItem(
      "sora.comment-profile.v1",
      JSON.stringify({
        authorName: "访客",
        authorEmail: "reader@example.com",
        authorWebsite: "https://example.com",
      }),
    );
    mockInteractions({
      id: approvedComment.id,
      status: "APPROVED",
      duplicate: false,
      comment: approvedComment,
    });

    const { container } = render(
      <PostInteractions
        allowComment
        comments={[]}
        initialUpvoteCount={0}
        initialViewCount={1}
        postId="post-1"
      />,
    );

    await waitFor(() => expect(screen.getByLabelText("昵称")).toHaveValue("访客"));
    expect(screen.getByLabelText("邮箱")).toHaveValue("reader@example.com");
    expect(screen.getByLabelText("个人网站")).toHaveValue("https://example.com");

    fireEvent.change(screen.getByRole("textbox", { name: "评论内容" }), {
      target: { value: "实时公开评论" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "提交评论" }).closest("form")!);

    expect(await screen.findByText("实时公开评论")).toBeVisible();
    const browserTag = screen.getByText("Chrome 139");
    const cityTag = screen.getByText("杭州");
    expect(browserTag).toHaveClass("comment-environment-tag", "comment-environment-browser");
    expect(cityTag).toHaveClass("comment-environment-tag", "comment-environment-city");
    expect(browserTag.parentElement).toBe(cityTag.parentElement);
    expect(container.querySelector(".sora-comments-count")).toHaveTextContent("1");
    expect(screen.getByRole("textbox", { name: "评论内容" })).toHaveValue("");
    expect(screen.getByLabelText("昵称")).toHaveValue("访客");
    expect(screen.getByLabelText("邮箱")).toHaveValue("reader@example.com");
    expect(screen.getByLabelText("个人网站")).toHaveValue("https://example.com");
  });

  it("keeps a pending comment out of the public list", async () => {
    mockInteractions({
      id: "comment-pending",
      status: "PENDING",
      duplicate: false,
      comment: null,
    });

    render(
      <PostInteractions
        allowComment
        comments={[]}
        initialUpvoteCount={0}
        initialViewCount={1}
        postId="post-1"
      />,
    );
    fireEvent.change(screen.getByLabelText("昵称"), { target: { value: "待审访客" } });
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "pending@example.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "评论内容" }), {
      target: { value: "等待审核的评论" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "提交评论" }).closest("form")!);

    expect(await screen.findByText("评论已提交，审核通过后会显示在这里。")).toBeVisible();
    expect(screen.queryByText("等待审核的评论")).not.toBeInTheDocument();
    expect(screen.getByText("还没有公开评论。")).toBeVisible();
  });
});
