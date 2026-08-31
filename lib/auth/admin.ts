import { count } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth/server";
import { getDatabaseConnection } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";

export async function isAdminInitialized(): Promise<boolean> {
  const [row] = await getDatabaseConnection().db.select({ value: count() }).from(authUsers);
  return (row?.value ?? 0) > 0;
}

export const getAdminSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    // 即使以后重新启用通用 Cookie 缓存，后台授权仍必须即时感知会话撤销。
    query: { disableCookieCache: true },
  });
});

export async function requireAdminSession() {
  if (!(await isAdminInitialized())) {
    redirect("/admin/setup");
  }

  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
