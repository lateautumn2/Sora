"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { recordOperation, operationActions } from "@/lib/auth/operation-log";

const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱地址"),
  password: z.string().min(1, "请输入密码").max(128),
});

export interface LoginActionState {
  error?: string;
  fields?: Partial<Record<"email" | "password", string>>;
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      fields: {
        email: fields.email?.[0],
        password: fields.password?.[0],
      },
    };
  }

  let authResult: Awaited<ReturnType<typeof auth.api.signInEmail>>;
  try {
    authResult = await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch {
    await recordOperation({
      action: operationActions.LOGIN_FAILED,
      actorEmail: parsed.data.email,
      metadata: { method: "email" },
      targetType: "AUTH",
    });
    return { error: "邮箱或密码不正确" };
  }

  await recordOperation({
    action: operationActions.LOGIN,
    actor: authResult.user,
    metadata: { method: "email" },
    targetId: authResult.user.id,
    targetType: "AUTH",
  });

  redirect("/admin");
}
