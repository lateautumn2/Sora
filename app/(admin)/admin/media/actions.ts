"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { deleteMedia, storeMedia } from "@/lib/media/service";

export async function uploadMediaAction(formData: FormData): Promise<never> {
  const session = await requireAdminSession();
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/admin/media?notice=invalid");

  let notice = "uploaded";
  try {
    const item = await storeMedia(file, String(formData.get("imageName") ?? formData.get("altText") ?? ""));
    await recordOperation({
      action: operationActions.CREATE,
      actor: session.user,
      metadata: { name: item.originalName },
      targetId: item.id,
      targetType: "MEDIA",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    notice = message === "MEDIA_SIZE_INVALID" ? "size" : "type";
  }
  revalidatePath("/admin/media");
  redirect(`/admin/media?notice=${notice}`);
}

export async function deleteMediaAction(formData: FormData): Promise<never> {
  const session = await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  await deleteMedia(id);
  await recordOperation({
    action: operationActions.DELETE,
    actor: session.user,
    targetId: id,
    targetType: "MEDIA",
  });
  revalidatePath("/admin/media");
  redirect("/admin/media?notice=deleted");
}
