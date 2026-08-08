"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { resolvePage } from "@/lib/content/pagination";
import { deleteFriendLink, FriendLinkConflictError, saveFriendLink } from "@/lib/friends/service";
import { friendLinkInputSchema } from "@/lib/friends/validation";

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

export async function saveFriendLinkAction(formData: FormData): Promise<never> {
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
    redirect(adminFriendsUrl(page, "invalid"));
  }

  try {
    saveFriendLink(result.data);
  } catch (error) {
    if (error instanceof FriendLinkConflictError) {
      redirect(adminFriendsUrl(page, "duplicate"));
    }
    throw error;
  }

  revalidateFriendLinks();
  redirect(adminFriendsUrl(page, "saved"));
}

export async function deleteFriendLinkAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const page = formPage(formData);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    redirect(adminFriendsUrl(page, "invalid"));
  }

  deleteFriendLink(id.data);
  revalidateFriendLinks();
  redirect(adminFriendsUrl(page, "deleted"));
}
