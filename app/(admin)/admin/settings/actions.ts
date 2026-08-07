"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { auth } from "@/lib/auth/server";
import { saveSiteSettings } from "@/lib/content/service";
import { siteSettingsSchema } from "@/lib/content/validation";

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
  });
  if (!result.success) {
    redirect("/admin/settings?notice=invalid");
  }
  saveSiteSettings(result.data);
  revalidatePath("/", "layout");
  redirect("/admin/settings?notice=saved");
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
