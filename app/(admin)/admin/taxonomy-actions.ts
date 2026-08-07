"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { deleteTaxonomy, saveTaxonomy } from "@/lib/content/service";
import { normalizeSlug, taxonomyInputSchema } from "@/lib/content/validation";

async function save(type: "category" | "tag", formData: FormData): Promise<never> {
  await requireAdminSession();
  const segment = type === "category" ? "categories" : "tags";
  const result = taxonomyInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
    description: formData.get("description") ?? "",
  });
  if (!result.success) {
    redirect(`/admin/${segment}?notice=invalid`);
  }

  let notice = "saved";
  try {
    saveTaxonomy(type, result.data);
  } catch {
    notice = "duplicate";
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${segment}?notice=${notice}`);
}

async function remove(type: "category" | "tag", formData: FormData): Promise<never> {
  await requireAdminSession();
  const segment = type === "category" ? "categories" : "tags";
  let notice = "deleted";
  try {
    deleteTaxonomy(type, String(formData.get("id") ?? ""));
  } catch {
    notice = "in-use";
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${segment}?notice=${notice}`);
}

export async function saveCategoryAction(formData: FormData): Promise<never> {
  return save("category", formData);
}

export async function deleteCategoryAction(formData: FormData): Promise<never> {
  return remove("category", formData);
}

export async function saveTagAction(formData: FormData): Promise<never> {
  return save("tag", formData);
}

export async function deleteTagAction(formData: FormData): Promise<never> {
  return remove("tag", formData);
}
