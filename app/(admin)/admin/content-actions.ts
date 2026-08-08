"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { restoreContent, saveContent, trashContent } from "@/lib/content/service";
import { contentInputSchema, normalizeSlug } from "@/lib/content/validation";

export interface ContentActionState {
  error?: string;
}

function formStrings(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export async function saveContentAction(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  await requireAdminSession();

  const kind = formData.get("kind") === "PAGE" ? "PAGE" : "POST";
  const result = contentInputSchema.safeParse({
    id: formData.get("id") || undefined,
    kind,
    title: formData.get("title"),
    slug: normalizeSlug(String(formData.get("slug") ?? "")),
    excerpt: formData.get("excerpt") || undefined,
    sourceContent: formData.get("sourceContent"),
    sourceFormat: formData.get("sourceFormat") === "HTML" ? "HTML" : "MARKDOWN",
    status: formData.get("status"),
    visibility: formData.get("visibility"),
    allowComment: formData.has("allowComment"),
    pinned: formData.has("pinned"),
    categoryIds: formStrings(formData, "categoryIds"),
    tagIds: formStrings(formData, "tagIds"),
    seoTitle: formData.get("seoTitle") || undefined,
    seoDescription: formData.get("seoDescription") || undefined,
    canonicalUrl: formData.get("canonicalUrl") || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "请检查表单内容" };
  }

  let id: string;
  try {
    id = saveContent(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("posts.slug") || message.includes("UNIQUE constraint failed")) {
      return { error: "URL 别名已经被其他内容使用" };
    }
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/${kind === "POST" ? "posts" : "pages"}/${id}?saved=1`);
}

export async function trashContentAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const kind = formData.get("kind") === "PAGE" ? "PAGE" : "POST";
  if (id) {
    trashContent(id);
    revalidatePath("/", "layout");
  }
  redirect(`/admin/${kind === "POST" ? "posts" : "pages"}`);
}

export async function restoreContentAction(formData: FormData): Promise<never> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const kind = formData.get("kind") === "PAGE" ? "PAGE" : "POST";
  if (id) {
    restoreContent(id);
    revalidatePath("/", "layout");
  }
  redirect(`/admin/${kind === "POST" ? "posts" : "pages"}?status=TRASHED`);
}
