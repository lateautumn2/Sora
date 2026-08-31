"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { auth } from "@/lib/auth/server";
import { saveSiteSettings } from "@/lib/content/service";
import { siteSettingsSchema } from "@/lib/content/validation";
import { saveSmtpConfig, smtpConfigFormSchema } from "@/lib/email/config";
import type { FormActionState } from "@/lib/forms/action-state";
import { saveRuntimeConfig } from "@/lib/runtime-config";

export type SiteSettingsField =
  | "title"
  | "description"
  | "homeQuoteHtml"
  | "authorName"
  | "avatarUrl"
  | "faviconUrl"
  | "email"
  | "githubUrl"
  | "weiboUrl"
  | "bilibiliUrl"
  | "xUrl"
  | "footerText"
  | "footerQuoteSource"
  | "coverSources";
export type SiteSettingsActionState = FormActionState<SiteSettingsField>;
export type RuntimeConfigActionState = FormActionState<"appUrl" | "trustedOrigins">;
export type SmtpConfigActionState = FormActionState<
  "host" | "port" | "user" | "password" | "fromName" | "fromAddress" | "ownerEmail"
>;
export type PasswordActionState = FormActionState<
  "currentPassword" | "newPassword" | "confirmPassword"
>;

function parseCoverSources(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(typeof value === "string" ? value : "[]");
  } catch {
    return null;
  }
}

export async function saveSiteSettingsAction(
  _previousState: SiteSettingsActionState,
  formData: FormData,
): Promise<SiteSettingsActionState> {
  const session = await requireAdminSession();

  const result = siteSettingsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    homeQuoteHtml: formData.get("homeQuoteHtml"),
    authorName: formData.get("authorName"),
    avatarUrl: formData.get("avatarUrl"),
    faviconUrl: formData.get("faviconUrl"),
    email: formData.get("email"),
    githubUrl: formData.get("githubUrl"),
    weiboUrl: formData.get("weiboUrl"),
    bilibiliUrl: formData.get("bilibiliUrl"),
    xUrl: formData.get("xUrl"),
    footerText: formData.get("footerText"),
    footerQuoteSource: formData.get("footerQuoteSource"),
    coverSources: parseCoverSources(formData.get("coverSourcesJson")),
    allowComments: formData.get("allowComments") === "on",
    requireCommentModeration: formData.get("requireCommentModeration") === "on",
  });
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查设置内容。",
      fieldErrors: {
        title: fields.title?.[0],
        description: fields.description?.[0],
        homeQuoteHtml: fields.homeQuoteHtml?.[0],
        authorName: fields.authorName?.[0],
        avatarUrl: fields.avatarUrl?.[0],
        faviconUrl: fields.faviconUrl?.[0],
        email: fields.email?.[0],
        githubUrl: fields.githubUrl?.[0],
        weiboUrl: fields.weiboUrl?.[0],
        bilibiliUrl: fields.bilibiliUrl?.[0],
        xUrl: fields.xUrl?.[0],
        footerText: fields.footerText?.[0],
        footerQuoteSource: fields.footerQuoteSource?.[0],
        coverSources: fields.coverSources?.[0],
      },
    };
  }

  saveSiteSettings(result.data);
  await recordOperation({
    action: operationActions.UPDATE,
    actor: session.user,
    targetType: "SITE_SETTINGS",
  });
  revalidatePath("/", "layout");
  redirect("/admin/settings?notice=saved");
}

const runtimeConfigFormSchema = z.object({
  appUrl: z.string().trim().url("站点地址格式不正确"),
  trustedOrigins: z.string().trim().default(""),
});

/** 保存站点地址与可信来源，归一化为 origin 后立即生效。 */
export async function saveRuntimeConfigAction(
  _previousState: RuntimeConfigActionState,
  formData: FormData,
): Promise<RuntimeConfigActionState> {
  const session = await requireAdminSession();

  const result = runtimeConfigFormSchema.safeParse({
    appUrl: formData.get("appUrl"),
    trustedOrigins: formData.get("trustedOrigins"),
  });
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查运行配置。",
      fieldErrors: { appUrl: fields.appUrl?.[0], trustedOrigins: fields.trustedOrigins?.[0] },
    };
  }

  const trustedOrigins = result.data.trustedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  try {
    const normalizedOrigins = trustedOrigins.map((origin) => new URL(origin).origin);
    saveRuntimeConfig({
      appUrl: new URL(result.data.appUrl).origin,
      trustedOrigins: normalizedOrigins,
    });
  } catch {
    return {
      status: "error",
      formError: "请检查运行配置。",
      fieldErrors: { trustedOrigins: "可信来源格式不正确" },
    };
  }

  await recordOperation({
    action: operationActions.UPDATE,
    actor: session.user,
    metadata: { fields: ["appUrl", "trustedOrigins"] },
    targetType: "RUNTIME_CONFIG",
  });

  revalidatePath("/", "layout");
  redirect("/admin/settings?notice=runtime-saved");
}

/** 保存 SMTP 参数；密码留空时由配置层沿用现有值，且不会写入操作日志。 */
export async function saveSmtpConfigAction(
  _previousState: SmtpConfigActionState,
  formData: FormData,
): Promise<SmtpConfigActionState> {
  const session = await requireAdminSession();
  const result = smtpConfigFormSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    suppressVisitorReplies: formData.get("suppressVisitorReplies") === "on",
    host: formData.get("host"),
    port: formData.get("port"),
    secure: formData.get("secure") === "true",
    user: formData.get("user"),
    password: formData.get("password"),
    fromName: formData.get("fromName"),
    fromAddress: formData.get("fromAddress"),
    ownerEmail: formData.get("ownerEmail"),
  });

  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查邮件提醒设置。",
      fieldErrors: {
        host: fields.host?.[0],
        port: fields.port?.[0],
        user: fields.user?.[0],
        password: fields.password?.[0],
        fromName: fields.fromName?.[0],
        fromAddress: fields.fromAddress?.[0],
        ownerEmail: fields.ownerEmail?.[0],
      },
    };
  }

  try {
    saveSmtpConfig(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issueFor = (field: string) =>
        error.issues.find((issue) => issue.path[0] === field)?.message;
      return {
        status: "error",
        formError: "启用邮件提醒前，请完整填写 SMTP 配置。",
        fieldErrors: {
          host: issueFor("host"),
          port: issueFor("port"),
          user: issueFor("user"),
          password: issueFor("password"),
          fromName: issueFor("fromName"),
          fromAddress: issueFor("fromAddress"),
          ownerEmail: issueFor("ownerEmail"),
        },
      };
    }
    return { status: "error", formError: "邮件提醒设置保存失败，请检查数据目录权限。" };
  }

  await recordOperation({
    action: operationActions.UPDATE,
    actor: session.user,
    metadata: {
      enabled: result.data.enabled,
      suppressVisitorReplies: result.data.suppressVisitorReplies,
    },
    targetType: "SMTP_CONFIG",
  });
  redirect("/admin/settings?notice=smtp-saved");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const session = await requireAdminSession();

  const result = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查密码输入。",
      fieldErrors: {
        currentPassword: fields.currentPassword?.[0],
        newPassword: fields.newPassword?.[0],
        confirmPassword: fields.confirmPassword?.[0],
      },
    };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return {
      status: "error",
      fieldErrors: { currentPassword: "当前密码不正确" },
    };
  }

  await recordOperation({
    action: operationActions.UPDATE,
    actor: session.user,
    metadata: { resource: "password", revokedOtherSessions: true },
    targetId: session.user.id,
    targetType: "AUTH",
  });

  redirect("/admin/settings?notice=password-saved");
}
