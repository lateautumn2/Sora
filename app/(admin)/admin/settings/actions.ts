"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { auth } from "@/lib/auth/server";
import { saveSiteSettings } from "@/lib/content/service";
import { siteSettingsSchema } from "@/lib/content/validation";
import { saveRuntimeConfig } from "@/lib/runtime-config";

export async function saveSiteSettingsAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const result = siteSettingsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    authorName: formData.get("authorName"),
    avatarUrl: formData.get("avatarUrl"),
    email: formData.get("email"),
    githubUrl: formData.get("githubUrl"),
    footerText: formData.get("footerText"),
    allowComments: formData.get("allowComments") === "on",
    requireCommentModeration: formData.get("requireCommentModeration") === "on",
  });
  if (!result.success) {
    redirect("/admin/settings?notice=invalid");
  }
  saveSiteSettings(result.data);
  revalidatePath("/", "layout");
  redirect("/admin/settings?notice=saved");
}

const runtimeConfigFormSchema = z.object({
  appUrl: z.string().trim().url("站点地址格式不正确"),
  trustedOrigins: z.string().trim().default(""),
});

/** 保存站点地址与可信来源，写入 runtime.json 并立即生效，无需重启容器。 */
export async function saveRuntimeConfigAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const result = runtimeConfigFormSchema.safeParse({
    appUrl: formData.get("appUrl"),
    trustedOrigins: formData.get("trustedOrigins"),
  });
  if (!result.success) {
    redirect("/admin/settings?notice=invalid-runtime");
  }

  // 来源按逗号分隔，逐项校验并统一归一化为 origin（去掉路径与末尾斜杠）。
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
    redirect("/admin/settings?notice=invalid-runtime");
  }

  revalidatePath("/", "layout");
  redirect("/admin/settings?notice=runtime-saved");
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

export async function changePasswordAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const result = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) redirect("/admin/settings?notice=password-invalid");
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
    redirect("/admin/settings?notice=password-current");
  }
  redirect("/admin/settings?notice=password-saved");
}
