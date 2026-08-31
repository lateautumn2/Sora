"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { deleteTaxonomy, saveTaxonomy } from "@/lib/content/service";
import {
  normalizeSlug,
  storedIdentifierSchema,
  taxonomyInputSchema,
} from "@/lib/content/validation";
import type { FormActionState } from "@/lib/forms/action-state";

export type TaxonomyActionState = FormActionState<"id" | "name" | "slug" | "description">;

async function save(
  type: "category" | "tag",
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const session = await requireAdminSession();
  const segment = type === "category" ? "categories" : "tags";
  const result = taxonomyInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
    description: formData.get("description") ?? "",
  });
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      status: "error",
      formError: "请检查分类信息。",
      fieldErrors: {
        description: fields.description?.[0],
        id: fields.id?.[0],
        name: fields.name?.[0],
        slug: fields.slug?.[0],
      },
    };
  }

  try {
    const id = saveTaxonomy(type, result.data);
    await recordOperation({
      action: result.data.id ? operationActions.UPDATE : operationActions.CREATE,
      actor: session.user,
      metadata: { name: result.data.name, type },
      targetId: id,
      targetType: type.toUpperCase(),
    });
  } catch {
    return {
      status: "error",
      formError: "名称或 URL 别名已经存在。",
      fieldErrors: { name: "名称或 URL 别名已经存在。", slug: "名称或 URL 别名已经存在。" },
    };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${segment}?notice=saved`);
}

async function remove(
  type: "category" | "tag",
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const session = await requireAdminSession();
  const segment = type === "category" ? "categories" : "tags";
  const id = storedIdentifierSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", fieldErrors: { id: "记录不存在。" }, formError: "删除失败。" };
  }
  try {
    deleteTaxonomy(type, id.data);
    await recordOperation({
      action: operationActions.DELETE,
      actor: session.user,
      metadata: { type },
      targetId: id.data,
      targetType: type.toUpperCase(),
    });
  } catch {
    return {
      status: "error",
      fieldErrors: { id: "该项仍被内容使用。" },
      formError: "该项仍被内容使用，暂时不能删除。",
    };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${segment}?notice=deleted`);
}

export async function saveCategoryAction(
  previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  return save("category", previousState, formData);
}

export async function deleteCategoryAction(
  previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  return remove("category", previousState, formData);
}

export async function saveTagAction(
  previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  return save("tag", previousState, formData);
}

export async function deleteTagAction(
  previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  return remove("tag", previousState, formData);
}
