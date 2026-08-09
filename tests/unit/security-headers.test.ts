import { describe, expect, test } from "vitest";

import nextConfig from "@/next.config";

async function getContentSecurityPolicyDirectives() {
  const headerRules = await nextConfig.headers?.();
  const policy = headerRules
    ?.flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value;

  if (!policy) throw new Error("Content-Security-Policy header is missing.");

  return new Map(
    policy
      .split("; ")
      .map((directive) => directive.split(" "))
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe("security headers", () => {
  test("allows only the site and Hitokoto API to receive browser connections", async () => {
    const directives = await getContentSecurityPolicyDirectives();

    expect(directives.get("connect-src")).toEqual(["'self'", "https://v1.hitokoto.cn"]);
  });
});
