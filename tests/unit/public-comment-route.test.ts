import { beforeEach, describe, expect, it, vi } from "vitest";

const createPublicComment = vi.hoisted(() => vi.fn());
const resolveCommentRequestContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/comments/service", () => ({
  createPublicComment,
  InteractionError: class InteractionError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

vi.mock("@/lib/comments/request-context", () => ({ resolveCommentRequestContext }));

vi.mock("@/lib/interactions/request", () => ({
  getVisitorHash: () => "visitor-hash",
  isTrustedRequestOrigin: () => true,
}));

import { POST } from "@/app/api/v1/public/posts/[postId]/comments/route";

const approvedComment = {
  id: "comment-1",
  parentId: null,
  rootId: null,
  authorName: "访客",
  authorWebsite: null,
  avatarHash: "baa0f4114eafbdd39ce828d01b849ae6",
  browserName: "Chrome",
  browserVersion: "139.0.0.0",
  ipCity: "杭州",
  renderedHtml: "<p>公开评论</p>",
  createdAt: 1_786_262_400_000,
};

function makeRequest(): Request {
  return new Request("https://blog.example/api/v1/public/posts/post-1/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      authorName: "访客",
      authorEmail: "reader@example.com",
      authorWebsite: "",
      content: "公开评论",
      company: "",
      parentId: null,
      requestToken: "6cc71f9f-34ea-4d34-b5ae-d01e86013635",
      ipAddress: "1.1.1.1",
      ipCity: "伪造城市",
    }),
  });
}

describe("public comment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCommentRequestContext.mockResolvedValue({
      ipAddress: "203.0.113.8",
      ipCity: "杭州",
      userAgentSummary: "Chrome/139.0.0.0",
      browserName: "Chrome",
      browserVersion: "139.0.0.0",
    });
  });

  it("returns the complete public comment when moderation approves it immediately", async () => {
    createPublicComment.mockReturnValue({
      id: "comment-1",
      status: "APPROVED",
      duplicate: false,
      comment: approvedComment,
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "comment-1",
        status: "APPROVED",
        duplicate: false,
        comment: approvedComment,
      },
    });
    expect(createPublicComment).toHaveBeenCalledWith(
      "post-1",
      expect.not.objectContaining({ ipAddress: "1.1.1.1", ipCity: "伪造城市" }),
      "visitor-hash",
      {
        ipAddress: "203.0.113.8",
        ipCity: "杭州",
        userAgentSummary: "Chrome/139.0.0.0",
        browserName: "Chrome",
        browserVersion: "139.0.0.0",
      },
    );
  });

  it("returns no public comment while moderation is pending", async () => {
    createPublicComment.mockReturnValue({
      id: "comment-2",
      status: "PENDING",
      duplicate: false,
      comment: null,
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "comment-2",
        status: "PENDING",
        duplicate: false,
        comment: null,
      },
    });
  });
});
