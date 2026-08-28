"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { replyToComment, setCommentStatus } from "@/lib/comments/service";

const statusSchema = z.enum(["PENDING", "APPROVED", "SPAM", "TRASHED"]);

export async function changeCommentStatusAction(formData: FormData): Promise<never> {
  const session = await requireAdminSession();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (id.success && status.success) {
    setCommentStatus(id.data, status.data);
    await recordOperation({
      action: operationActions.UPDATE,
      actor: session.user,
      metadata: { status: status.data },
      targetId: id.data,
      targetType: "COMMENT",
    });
    revalidatePath("/", "layout");
  }
  redirect("/admin/comments");
}

export async function replyCommentAction(formData: FormData): Promise<never> {
  const session = await requireAdminSession();
  const result = z
    .object({ parentId: z.string().uuid(), content: z.string().trim().min(1).max(5000) })
    .safeParse({ parentId: formData.get("parentId"), content: formData.get("content") });
  if (!result.success) redirect("/admin/comments?notice=invalid");
  replyToComment(
    result.data.parentId,
    session.user.name || "管理员",
    session.user.email,
    result.data.content,
  );
  await recordOperation({
    action: operationActions.CREATE,
    actor: session.user,
    targetId: result.data.parentId,
    targetType: "COMMENT_REPLY",
  });
  revalidatePath("/", "layout");
  redirect("/admin/comments?notice=replied");
}
