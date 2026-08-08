"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { resolvePage } from "@/lib/content/pagination";
import { deleteFriendLink, FriendLinkConflictError, saveFriendLink } from "@/lib/friends/service";
import { friendLinkInputSchema } from "@/lib/friends/validation";
import type { FormActionState } from "@/lib/forms/action-state";

export type FriendLinkActionState = FormActionState<
  "id" | "name" | "url" | "logoUrl" | "description" | "sortOrder"
>;

function adminFriendsUrl(page: number, notice: "saved" | "deleted" | "invalid" | "duplicate") {
  return `/admin/friends?page=${page}&notice=${notice}` as Route;
}

function formPage(formData: FormData): number {
  return resolvePage(String(formData.get("page") ?? ""));
}

function revalidateFriendLinks() {
  revalidatePath("/admin/friends");
  revalidatePath("/friends");
}

export async function saveFriendLinkAction(
  _previousState: FriendLinkActionState,
  formData: FormData,
): Promise<FriendLinkActionState> {
  await requireAdminSession();

  const page = formPage(formData);
  const result = friendLinkInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    url: formData.get("url"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder") || 0,
    enabled: formData.has("enabled"),
  });

  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查友链信息。",
      fieldErrors: {
        description: fields.description?.[0],
        id: fields.id?.[0],
        logoUrl: fields.logoUrl?.[0],
        name: fields.name?.[0],
        sortOrder: fields.sortOrder?.[0],
        url: fields.url?.[0],
      },
    };
  }

  try {
    saveFriendLink(result.data);
  } catch (error) {
    if (error instanceof FriendLinkConflictError) {
      return {
        status: "error",
        formError: "该友链地址已存在。",
        fieldErrors: { url: "该友链地址已存在。" },
      };
    }
    throw error;
  }

  revalidateFriendLinks();
  redirect(adminFriendsUrl(page, "saved"));
}

export async function deleteFriendLinkAction(
  _previousState: FriendLinkActionState,
  formData: FormData,
): Promise<FriendLinkActionState> {
  await requireAdminSession();

  const page = formPage(formData);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", fieldErrors: { id: "友链不存在。" }, formError: "删除失败。" };
  }

  deleteFriendLink(id.data);
  revalidateFriendLinks();
  redirect(adminFriendsUrl(page, "deleted"));
}
