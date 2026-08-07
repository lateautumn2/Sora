import { z } from "zod";

const DEV_AUTH_SECRET = "development-auth-secret-change-before-production";
const DEV_VISITOR_SECRET = "development-visitor-secret-change-before-production";
const DEV_SETUP_TOKEN = "development-setup-token-change-before-production";

const rawEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PHASE: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/blog.db"),
  UPLOAD_DIR: z.string().trim().min(1).default("./data/uploads"),
  AUTH_SECRET: z.string().min(32).optional(),
  VISITOR_HASH_SECRET: z.string().min(32).optional(),
  SETUP_TOKEN: z.string().min(32).optional(),
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
  setupToken: string;
  trustedOrigins: string[];
  logLevel: "debug" | "info" | "warn" | "error";
  dataArchiveMaxBytes: number;
  dataArchiveMaxEntries: number;
  dataArchiveMaxEntryBytes: number;
  dataArchiveMaxExpandedBytes: number;
}

function requireProductionSecret(
  value: string | undefined,
  name: "AUTH_SECRET" | "VISITOR_HASH_SECRET" | "SETUP_TOKEN",
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
    setupToken: isProduction
      ? requireProductionSecret(raw.SETUP_TOKEN, "SETUP_TOKEN", isProductionBuild)
      : (raw.SETUP_TOKEN ?? DEV_SETUP_TOKEN),
    trustedOrigins: Array.from(new Set([appUrl.origin, ...configuredOrigins])),
    logLevel: raw.LOG_LEVEL,
    dataArchiveMaxBytes: raw.DATA_ARCHIVE_MAX_BYTES,
    dataArchiveMaxEntries: raw.DATA_ARCHIVE_MAX_ENTRIES,
    dataArchiveMaxEntryBytes: raw.DATA_ARCHIVE_MAX_ENTRY_BYTES,
    dataArchiveMaxExpandedBytes: raw.DATA_ARCHIVE_MAX_EXPANDED_BYTES,
  };
}

let cachedEnvironment: AppEnvironment | undefined;

export function getEnvironment(): AppEnvironment {
  cachedEnvironment ??= parseEnvironment();
  return cachedEnvironment;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
