import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { z } from "zod";

/**
 * 运行期配置（data/runtime.json）与自动生成的密钥（data/secrets/）。
 *
 * 设计意图：
 * - APP_URL / TRUSTED_ORIGINS 属于机器级配置，存于数据卷内的 runtime.json，
 *   可在管理后台修改，保存后立即生效（better-auth 动态 baseURL 每请求解析）。
 * - AUTH_SECRET / VISITOR_HASH_SECRET 首次启动自动生成并持久化到 data/secrets/，
 *   之后复用；环境变量优先级最高，可覆盖文件值。
 * - 备份/恢复只迁移数据库与上传目录，不包含 runtime.json 与 secrets，
 *   因为它们是部署环境的一部分而非站点内容。
 */

export interface RuntimeConfig {
  appUrl: string;
  trustedOrigins: string[];
}

export const DEFAULT_APP_URL = "http://localhost:3000";

const runtimeConfigSchema = z.object({
  appUrl: z.string().url().default(DEFAULT_APP_URL),
  trustedOrigins: z.array(z.string().url()).default([]),
});

let cachedRuntimeConfig: RuntimeConfig | undefined;

function isProductionRuntime(): boolean {
  // Next.js 构建期（next build）不读、不写数据卷，直接返回默认值。
  return (
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build"
  );
}

function dataRoot(): string {
  // 数据目录在容器内是运行期数据卷（/app/data），不需要打进 standalone 产物；
  // 用 turbopackIgnore 关闭静态追踪，避免整个项目被纳入输出导致镜像膨胀。
  return dirname(resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH ?? "./data/blog.db"));
}

function defaultRuntimeConfig(): RuntimeConfig {
  return { appUrl: DEFAULT_APP_URL, trustedOrigins: [] };
}

function writeRuntimeConfigFile(config: RuntimeConfig): void {
  const file = join(dataRoot(), "runtime.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

/**
 * 读取运行期配置。生产环境每次从数据卷读取，确保 Server Action、API 路由等
 * 独立服务端模块都能立即观察到最新配置；首次读取会创建默认 runtime.json。
 * 开发/测试/构建环境只使用内存缓存，不触碰数据卷。
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!isProductionRuntime()) {
    cachedRuntimeConfig ??= defaultRuntimeConfig();
    return cachedRuntimeConfig;
  }

  const file = join(dataRoot(), "runtime.json");
  let parsed: z.infer<typeof runtimeConfigSchema>;
  try {
    parsed = runtimeConfigSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      // 配置文件损坏时快速失败，避免用旧值静默运行；删除文件即可重置。
      throw new Error(`runtime.json is invalid: ${(error as Error).message}`);
    }
    parsed = defaultRuntimeConfig();
    writeRuntimeConfigFile(parsed);
  }

  return { appUrl: parsed.appUrl, trustedOrigins: parsed.trustedOrigins };
}

/**
 * 保存运行期配置。生产环境写入 runtime.json，后续请求会从数据卷读取新值；
 * 开发/测试环境只更新内存缓存（不落盘）。
 */
export function saveRuntimeConfig(next: RuntimeConfig): void {
  const parsed = runtimeConfigSchema.parse(next);
  const config = { appUrl: parsed.appUrl, trustedOrigins: parsed.trustedOrigins };
  if (isProductionRuntime()) {
    writeRuntimeConfigFile(config);
    return;
  }
  cachedRuntimeConfig = config;
}

/** 当前站点对外地址（含协议与端口）。 */
export function getAppUrl(): URL {
  return new URL(getRuntimeConfig().appUrl);
}

/** 可信来源：站点自身地址 + 后台配置的额外来源，全部归一化为 origin。 */
export function getTrustedOrigins(): string[] {
  const runtime = getRuntimeConfig();
  return Array.from(
    new Set([runtime.appUrl, ...runtime.trustedOrigins].map((value) => new URL(value).origin)),
  );
}

function ensureSecret(name: string): string {
  const file = join(dataRoot(), "secrets", name);
  try {
    const value = readFileSync(file, "utf8").trim();
    if (value.length >= 32) {
      return value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      throw error;
    }
  }

  // 首次启动自动生成 32 字节十六进制密钥（64 字符），持久化后复用。
  const value = randomBytes(32).toString("hex");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${value}\n`, { encoding: "utf8", mode: 0o600 });
  return value;
}

/** 认证会话签名密钥，自动生成并持久化；可用 AUTH_SECRET 环境变量覆盖。 */
export function getAuthSecret(): string {
  return ensureSecret("auth-secret");
}

/** 访客指纹 HMAC 密钥，自动生成并持久化；可用 VISITOR_HASH_SECRET 环境变量覆盖。 */
export function getVisitorHashSecret(): string {
  return ensureSecret("visitor-hash-secret");
}

/** 测试辅助：清空内存缓存，避免跨用例串值。 */
export function resetRuntimeConfigForTests(): void {
  cachedRuntimeConfig = undefined;
}
