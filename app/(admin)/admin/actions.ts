"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export async function signOutAction(): Promise<never> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
