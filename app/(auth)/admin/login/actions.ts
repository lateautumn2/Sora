"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth/server";

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
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    return {
      fields: {
        email: fields.email?.[0],
        password: fields.password?.[0],
      },
    };
  }

  try {
    await auth.api.signInEmail({
      body: result.data,
      headers: await headers(),
    });
  } catch {
    return { error: "邮箱或密码不正确" };
  }

  redirect("/admin");
}
