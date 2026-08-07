"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { deletePrimaryMenuItem, savePrimaryMenuItem } from "@/lib/content/service";

const menuItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(40),
  url: z
    .string()
    .trim()
    .refine((value) => value.startsWith("/") || /^https:\/\//.test(value), "URL 格式不正确"),
  sortOrder: z.coerce.number().int().min(0).max(999),
  openInNewTab: z.boolean(),
  enabled: z.boolean(),
});

export async function saveMenuItemAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const result = menuItemSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    url: formData.get("url"),
    sortOrder: formData.get("sortOrder") || 0,
    openInNewTab: formData.has("openInNewTab"),
    enabled: formData.has("enabled"),
  });
  if (!result.success) redirect("/admin/menus?notice=invalid");
  savePrimaryMenuItem(result.data);
  revalidatePath("/", "layout");
  redirect("/admin/menus?notice=saved");
}

export async function deleteMenuItemAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  deletePrimaryMenuItem(String(formData.get("id") ?? ""));
  revalidatePath("/", "layout");
  redirect("/admin/menus?notice=deleted");
}
