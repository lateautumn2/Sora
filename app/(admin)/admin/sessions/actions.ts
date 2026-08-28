"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { operationActions, recordOperation } from "@/lib/auth/operation-log";
import { auth } from "@/lib/auth/server";
import {
  countOtherAdminSessions,
  getSessionForRevocation,
  revokeSessionById,
} from "@/lib/auth/session-management";

export async function revokeSessionAction(formData: FormData): Promise<never> {
  const session = await requireAdminSession();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!sessionId || sessionId === session.session.id) {
    redirect("/admin/sessions?notice=current");
  }

  const target = getSessionForRevocation(session.user.id, sessionId);
  if (!target) {
    redirect("/admin/sessions?notice=missing");
  }

  const revoked = await revokeSessionById(session.user.id, sessionId);
  if (!revoked) {
    redirect("/admin/sessions?notice=missing");
  }
  await recordOperation({
    action: operationActions.SESSION_REVOKE,
    actor: session.user,
    metadata: {
      createdAt: target.createdAt,
      ipAddress: target.ipAddress,
      updatedAt: target.updatedAt,
    },
    targetId: sessionId,
    targetType: "SESSION",
  });
  redirect("/admin/sessions?notice=revoked");
}

export async function revokeOtherSessionsAction(): Promise<never> {
  const session = await requireAdminSession();
  const requestHeaders = await headers();
  const count = countOtherAdminSessions(session.user.id, session.session.id);

  if (count > 0) {
    await auth.api.revokeOtherSessions({ headers: requestHeaders });
  }
  await recordOperation({
    action: operationActions.SESSION_REVOKE_OTHERS,
    actor: session.user,
    metadata: { revokedCount: count },
    targetType: "SESSION",
  });
  redirect(`/admin/sessions?notice=${count > 0 ? "revoked-others" : "none"}`);
}
