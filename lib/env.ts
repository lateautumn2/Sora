import { z } from "zod";

import { getAuthSecret, getRuntimeConfig, getVisitorHashSecret } from "@/lib/runtime-config";

const DEV_AUTH_SECRET = "development-auth-secret-change-before-production";
const DEV_VISITOR_SECRET = "development-visitor-secret-change-before-production";

const rawEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PHASE: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/blog.db"),
  UPLOAD_DIR: z.string().trim().min(1).default("./data/uploads"),
  AUTH_SECRET: z.string().min(32).optional(),
  VISITOR_HASH_SECRET: z.string().min(32).optional(),
  TRUSTED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATA_ARCHIVE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 ** 3),
  DATA_ARCHIVE_MAX_ENTRIES: z.coerce.number().int().positive().default(20_000),
  DATA_ARCHIVE_MAX_ENTRY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 ** 3),
  DATA_ARCHIVE_MAX_EXPANDED_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(4 * 1024 ** 3),
});

export interface AppEnvironment {
  nodeEnv: "development" | "test" | "production";
  appUrl: URL;
  databasePath: string;
  uploadDir: string;
  authSecret: string;
  visitorHashSecret: string;
  trustedOrigins: string[];
  logLevel: "debug" | "info" | "warn" | "error";
  dataArchiveMaxBytes: number;
  dataArchiveMaxEntries: number;
  dataArchiveMaxEntryBytes: number;
  dataArchiveMaxExpandedBytes: number;
}

function requireProductionSecret(
  value: string | undefined,
  name: "AUTH_SECRET" | "VISITOR_HASH_SECRET",
  isProductionBuild: boolean,
): string {
  if (value) {
    return value;
  }

  if (!isProductionBuild) {
    throw new Error(`${name} must be set to at least 32 characters in production.`);
  }

  // Next.js can evaluate route modules while bundling. The placeholder exists only
  // for that build process; a real production server still fails fast at startup.
  return `build-only-${name.toLowerCase()}-placeholder-value`;
}

export function parseEnvironment(source: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const raw = rawEnvironmentSchema.parse(source);
  const isProduction = raw.NODE_ENV === "production";
  const isProductionBuild = isProduction && raw.NEXT_PHASE === "phase-production-build";
  const appUrl = new URL(raw.APP_URL);
  const configuredOrigins = (raw.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);

  return {
    nodeEnv: raw.NODE_ENV,
    appUrl,
    databasePath: raw.DATABASE_PATH,
    uploadDir: raw.UPLOAD_DIR,
    authSecret: isProduction
      ? requireProductionSecret(raw.AUTH_SECRET, "AUTH_SECRET", isProductionBuild)
      : (raw.AUTH_SECRET ?? DEV_AUTH_SECRET),
    visitorHashSecret: isProduction
      ? requireProductionSecret(raw.VISITOR_HASH_SECRET, "VISITOR_HASH_SECRET", isProductionBuild)
      : (raw.VISITOR_HASH_SECRET ?? DEV_VISITOR_SECRET),
    trustedOrigins: Array.from(new Set([appUrl.origin, ...configuredOrigins])),
    logLevel: raw.LOG_LEVEL,
    dataArchiveMaxBytes: raw.DATA_ARCHIVE_MAX_BYTES,
    dataArchiveMaxEntries: raw.DATA_ARCHIVE_MAX_ENTRIES,
    dataArchiveMaxEntryBytes: raw.DATA_ARCHIVE_MAX_ENTRY_BYTES,
    dataArchiveMaxExpandedBytes: raw.DATA_ARCHIVE_MAX_EXPANDED_BYTES,
  };
}

/**
 * 生产运行时用 runtime.json 与自动生成的密钥补全环境变量，
 * 使 parseEnvironment 保持纯函数（构建期与测试无文件副作用）。
 */
function resolveRuntimeEnvironment(): NodeJS.ProcessEnv {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return process.env;
  }

  const runtime = getRuntimeConfig();
  return {
    ...process.env,
    APP_URL: process.env.APP_URL ?? runtime.appUrl,
    TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS ?? runtime.trustedOrigins.join(","),
    AUTH_SECRET: process.env.AUTH_SECRET ?? getAuthSecret(),
    VISITOR_HASH_SECRET: process.env.VISITOR_HASH_SECRET ?? getVisitorHashSecret(),
  };
}

let cachedEnvironment: AppEnvironment | undefined;

export function getEnvironment(): AppEnvironment {
  const parsed = parseEnvironment(resolveRuntimeEnvironment());
  if (!cachedEnvironment) {
    cachedEnvironment = parsed;
    return cachedEnvironment;
  }
  // 站点地址与可信来源属于运行期可配置项（后台保存后立即生效），
  // 每次调用都从 runtime.json 重新解析；数据库路径、密钥等机器级
  // 设置在进程启动时固定，不随运行期配置变化。
  cachedEnvironment.appUrl = parsed.appUrl;
  cachedEnvironment.trustedOrigins = parsed.trustedOrigins;
  return cachedEnvironment;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
