import { describe, expect, it, vi } from "vitest";

import { resolveCommentRequestContext } from "@/lib/comments/request-context";
import { getClientIp, parseBrowser } from "@/lib/interactions/request";

describe("comment request context", () => {
  it("prefers the first forwarded address over the real IP header", () => {
    const request = new Request("https://blog.example/api", {
      headers: {
        "x-forwarded-for": "203.0.113.8, 10.0.0.2",
        "x-real-ip": "198.51.100.2",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.8");
  });

  it.each([
    [
      "Mozilla/5.0 AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
      { name: "Edge", version: "139.0.0.0" },
    ],
    ["Mozilla/5.0 Firefox/141.0", { name: "Firefox", version: "141.0" }],
    ["Mozilla/5.0 Version/18.6 Safari/605.1.15", { name: "Safari", version: "18.6" }],
    ["curl/8.14.1", { name: null, version: null }],
  ])("parses a stable browser label from %s", (userAgent, expected) => {
    expect(parseBrowser(userAgent)).toEqual(expected);
  });

  it("keeps the raw request IP but stores only the returned city", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ success: true, city: "杭州", country: "中国" }));
    const request = new Request("https://blog.example/api", {
      headers: {
        "user-agent": "Mozilla/5.0 Firefox/141.0",
        "x-real-ip": "203.0.113.8",
      },
    });

    await expect(resolveCommentRequestContext(request, fetcher)).resolves.toEqual({
      ipAddress: "203.0.113.8",
      ipCity: "杭州",
      userAgentSummary: "Mozilla/5.0 Firefox/141.0",
      browserName: "Firefox",
      browserVersion: "141.0",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://ipwho.is/203.0.113.8?fields=success%2Ccity&lang=zh-CN",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("does not query private addresses and degrades failed lookups to an empty city", async () => {
    const privateFetcher = vi.fn<typeof fetch>();
    const privateRequest = new Request("https://blog.example/api", {
      headers: { "x-real-ip": "192.168.1.12" },
    });
    await expect(
      resolveCommentRequestContext(privateRequest, privateFetcher),
    ).resolves.toMatchObject({ ipAddress: "192.168.1.12", ipCity: null });
    expect(privateFetcher).not.toHaveBeenCalled();

    const failedFetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    const publicRequest = new Request("https://blog.example/api", {
      headers: { "x-real-ip": "203.0.113.8" },
    });
    await expect(resolveCommentRequestContext(publicRequest, failedFetcher)).resolves.toMatchObject(
      {
        ipAddress: "203.0.113.8",
        ipCity: null,
      },
    );
  });
});
