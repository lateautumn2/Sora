"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { deletePrimaryMenuItem, savePrimaryMenuItem } from "@/lib/content/service";
import type { FormActionState } from "@/lib/forms/action-state";

const menuItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(40),
  url: z
    .string()
    .trim()
    .refine(
      (value) => (value.startsWith("/") && !value.startsWith("//")) || /^https:\/\//.test(value),
      "URL 格式不正确",
    ),
  sortOrder: z.coerce.number().int().min(0).max(999),
  openInNewTab: z.boolean(),
  enabled: z.boolean(),
});

export type MenuItemActionState = FormActionState<"id" | "label" | "url" | "sortOrder">;

export async function saveMenuItemAction(
  _previousState: MenuItemActionState,
  formData: FormData,
): Promise<MenuItemActionState> {
  const session = await requireAdminSession();
  const result = menuItemSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    url: formData.get("url"),
    sortOrder: formData.get("sortOrder") || 0,
    openInNewTab: formData.has("openInNewTab"),
    enabled: formData.has("enabled"),
  });
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查菜单信息。",
      fieldErrors: {
        id: fields.id?.[0],
        label: fields.label?.[0],
        sortOrder: fields.sortOrder?.[0],
        url: fields.url?.[0],
      },
    };
  }
  const id = savePrimaryMenuItem(result.data);
  await recordOperation({
    action: result.data.id ? operationActions.UPDATE : operationActions.CREATE,
    actor: session.user,
    metadata: { label: result.data.label },
    targetId: id,
    targetType: "MENU_ITEM",
  });
  revalidatePath("/", "layout");
  redirect("/admin/menus?notice=saved");
}

export async function deleteMenuItemAction(
  _previousState: MenuItemActionState,
  formData: FormData,
): Promise<MenuItemActionState> {
  const session = await requireAdminSession();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", fieldErrors: { id: "菜单项不存在。" }, formError: "删除失败。" };
  }
  deletePrimaryMenuItem(id.data);
  await recordOperation({
    action: operationActions.DELETE,
    actor: session.user,
    targetId: id.data,
    targetType: "MENU_ITEM",
  });
  revalidatePath("/", "layout");
  redirect("/admin/menus?notice=deleted");
}
