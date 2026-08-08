import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAuthSecret,
  getRuntimeConfig,
  getTrustedOrigins,
  getVisitorHashSecret,
  resetRuntimeConfigForTests,
  saveRuntimeConfig,
} from "@/lib/runtime-config";

const temporaryDirectories: string[] = [];

afterEach(() => {
  resetRuntimeConfigForTests();
  vi.unstubAllEnvs();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("runtime config", () => {
  it("defaults to localhost outside production and updates the memory cache after save", () => {
    expect(getRuntimeConfig()).toEqual({
      appUrl: "http://localhost:3000",
      trustedOrigins: [],
    });
    expect(getTrustedOrigins()).toEqual(["http://localhost:3000"]);

    saveRuntimeConfig({
      appUrl: "https://blog.example.com",
      trustedOrigins: ["https://admin.example.com", "https://blog.example.com"],
    });

    // 保存后立即生效（无需重启），站点地址自身也会并入可信来源并去重。
    expect(getRuntimeConfig()).toEqual({
      appUrl: "https://blog.example.com",
      trustedOrigins: ["https://admin.example.com", "https://blog.example.com"],
    });
    expect(getTrustedOrigins()).toEqual(["https://blog.example.com", "https://admin.example.com"]);
  });

  it("persists runtime.json and auto-generated secrets in production", () => {
    const directory = mkdtempSync(join(tmpdir(), "sora-runtime-"));
    temporaryDirectories.push(directory);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_PATH", join(directory, "blog.db"));

    saveRuntimeConfig({
      appUrl: "https://blog.example.com",
      trustedOrigins: ["https://admin.example.com"],
    });

    const runtimeFile = join(directory, "runtime.json");
    expect(JSON.parse(readFileSync(runtimeFile, "utf8"))).toEqual({
      appUrl: "https://blog.example.com",
      trustedOrigins: ["https://admin.example.com"],
    });

    // 密钥首次生成后持久化，后续调用复用同一个值。
    const firstAuthSecret = getAuthSecret();
    const firstVisitorSecret = getVisitorHashSecret();
    expect(firstAuthSecret.length).toBeGreaterThanOrEqual(32);
    expect(firstVisitorSecret.length).toBeGreaterThanOrEqual(32);
    expect(getAuthSecret()).toBe(firstAuthSecret);
    expect(getVisitorHashSecret()).toBe(firstVisitorSecret);

    const secretsRoot = join(directory, "secrets");
    expect(existsSync(join(secretsRoot, "auth-secret"))).toBe(true);
    expect(existsSync(join(secretsRoot, "visitor-hash-secret"))).toBe(true);
  });
});
