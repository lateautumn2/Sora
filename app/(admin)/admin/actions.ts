"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { getAdminSession } from "@/lib/auth/admin";

export async function signOutAction(): Promise<never> {
  const session = await getAdminSession();
  await auth.api.signOut({ headers: await headers() });
  if (session) {
    await recordOperation({
      action: operationActions.LOGOUT,
      actor: session.user,
      targetId: session.user.id,
      targetType: "AUTH",
    });
  }
  redirect("/admin/login");
}
