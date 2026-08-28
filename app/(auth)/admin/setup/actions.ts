"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAdminInitialized } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { auth } from "@/lib/auth/server";

const setupSchema = z
  .object({
    name: z.string().trim().min(1, "请输入显示名称").max(60, "显示名称不能超过 60 个字符"),
    email: z.string().trim().email("请输入有效邮箱地址"),
    password: z.string().min(12, "密码至少需要 12 个字符").max(128, "密码不能超过 128 个字符"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export interface SetupActionState {
  error?: string;
  fields?: Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
}

export async function setupAdminAction(
  _previousState: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  if (await isAdminInitialized()) {
    return { error: "站点已经完成初始化" };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      fields: {
        name: fields.name?.[0],
        email: fields.email?.[0],
        password: fields.password?.[0],
        confirmPassword: fields.confirmPassword?.[0],
      },
    };
  }

  let authResult: Awaited<ReturnType<typeof auth.api.signUpEmail>>;
  try {
    authResult = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch {
    return { error: "初始化失败，请确认数据库为空后重试" };
  }

  await recordOperation({
    action: operationActions.CREATE,
    actor: authResult.user,
    metadata: { resource: "admin" },
    targetId: authResult.user.id,
    targetType: "ADMIN",
  });

  redirect("/admin");
}
