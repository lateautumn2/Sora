import { describe, expect, it } from "vitest";

import { parseEnvironment } from "@/lib/env";

describe("parseEnvironment", () => {
  it("uses safe local defaults during development", () => {
    const environment = parseEnvironment({ NODE_ENV: "development" });

    expect(environment.appUrl.origin).toBe("http://localhost:3000");
    expect(environment.databasePath).toBe("./data/blog.db");
    expect(environment.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(environment.authSecret.length).toBeGreaterThanOrEqual(32);
  });

  it("normalizes and deduplicates trusted origins", () => {
    const environment = parseEnvironment({
      NODE_ENV: "test",
      APP_URL: "https://blog.example.com/path",
      TRUSTED_ORIGINS: "https://admin.example.com/path, https://blog.example.com",
    });

    expect(environment.trustedOrigins).toEqual([
      "https://blog.example.com",
      "https://admin.example.com",
    ]);
  });

  it("rejects missing production secrets at runtime", () => {
    expect(() =>
      parseEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://blog.example.com",
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("allows placeholders only during the Next.js production build", () => {
    const environment = parseEnvironment({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      APP_URL: "https://blog.example.com",
    });

    expect(environment.authSecret).toContain("build-only");
    expect(environment.visitorHashSecret).toContain("build-only");
  });
});
