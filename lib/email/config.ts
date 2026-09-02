import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { z } from "zod";

const smtpBaseSchema = z.object({
  enabled: z.boolean().default(false),
  suppressVisitorReplies: z.boolean().default(true),
  host: z.string().trim().max(253).default(""),
  port: z.coerce.number().int().min(1).max(65_535).default(465),
  secure: z.boolean().default(true),
  user: z.string().trim().max(320).default(""),
  fromName: z.string().trim().max(100).default("Sora"),
  fromAddress: z.union([z.literal(""), z.string().trim().email()]).default(""),
  ownerEmail: z.union([z.literal(""), z.string().trim().email()]).default(""),
});

export const smtpConfigFormSchema = smtpBaseSchema.extend({
  password: z.string().max(1024).default(""),
});

const smtpStoredConfigSchema = smtpConfigFormSchema.superRefine((config, context) => {
  if (!config.enabled) return;

  for (const [field, value, message] of [
    ["host", config.host, "请输入 SMTP 服务器"],
    ["user", config.user, "请输入 SMTP 用户名"],
    ["password", config.password, "请输入 SMTP 密码或授权码"],
    ["fromAddress", config.fromAddress, "请输入发件邮箱"],
    ["ownerEmail", config.ownerEmail, "请输入博主收件邮箱"],
  ] as const) {
    if (!value) {
      context.addIssue({ code: "custom", message, path: [field] });
    }
  }
});

export type SmtpConfigFormInput = z.infer<typeof smtpConfigFormSchema>;
type StoredSmtpConfig = z.infer<typeof smtpStoredConfigSchema>;

export type SmtpConfigView = StoredSmtpConfig & {
  passwordConfigured: boolean;
};

const defaultConfig: StoredSmtpConfig = smtpStoredConfigSchema.parse({});

function smtpConfigPath(): string {
  const databasePath = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ?? "./data/blog.db",
  );
  return join(dirname(databasePath), "secrets", "smtp.json");
}

function isProductionBuild(): boolean {
  return (
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE === "phase-production-build"
  );
}

/** 读取完整 SMTP 配置，仅供服务端邮件发送与保存逻辑使用。 */
export function getSmtpConfig(): StoredSmtpConfig {
  if (isProductionBuild()) return defaultConfig;

  try {
    return smtpStoredConfigSchema.parse(JSON.parse(readFileSync(smtpConfigPath(), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return defaultConfig;
    throw new Error(`smtp.json is invalid: ${(error as Error).message}`);
  }
}

/**
 * 返回后台 SMTP 设置视图，包含密码以支持管理员页面回填。
 * 调用方必须确保该数据只进入经过管理员会话保护的页面，不得写入日志或公开接口。
 */
export function getSmtpConfigView(): SmtpConfigView {
  const config = getSmtpConfig();
  return { ...config, passwordConfigured: Boolean(config.password) };
}

/**
 * 保存 SMTP 配置。密码留空时沿用已保存值，避免误操作清除现有凭据。
 * 文件位于 data/secrets，权限按当前平台能力收紧为仅当前用户可读写。
 */
export function saveSmtpConfig(input: SmtpConfigFormInput): SmtpConfigView {
  const current = getSmtpConfig();
  const config = smtpStoredConfigSchema.parse({
    ...input,
    password: input.password || current.password,
  });
  const file = smtpConfigPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return { ...config, passwordConfigured: Boolean(config.password) };
}
