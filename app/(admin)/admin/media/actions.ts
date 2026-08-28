"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { deleteMedia, storeMedia } from "@/lib/media/service";

export async function uploadMediaAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/admin/media?notice=invalid");

  let notice = "uploaded";
  try {
    await storeMedia(file, String(formData.get("imageName") ?? formData.get("altText") ?? ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    notice = message === "MEDIA_SIZE_INVALID" ? "size" : "type";
  }
  revalidatePath("/admin/media");
  redirect(`/admin/media?notice=${notice}`);
}

export async function deleteMediaAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  await deleteMedia(String(formData.get("id") ?? ""));
  revalidatePath("/admin/media");
  redirect("/admin/media?notice=deleted");
}
