import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";
import { getDatabaseConnection } from "@/lib/db/client";

export interface AdminSessionRow {
  id: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
  isCurrent: boolean;
}

type RawSessionRow = Omit<
  AdminSessionRow,
  "expiresAt" | "createdAt" | "updatedAt" | "isCurrent"
> & {
  expiresAt: string | number;
  createdAt: string | number;
  updatedAt: string | number;
};

function toTimestamp(value: string | number): number {
  return typeof value === "number" ? value : Date.parse(value);
}

function mapSession(row: RawSessionRow, currentSessionId: string): AdminSessionRow {
  return {
    ...row,
    createdAt: toTimestamp(row.createdAt),
    expiresAt: toTimestamp(row.expiresAt),
    isCurrent: row.id === currentSessionId,
    updatedAt: toTimestamp(row.updatedAt),
  };
}

export function listAdminSessions(userId: string, currentSessionId: string): AdminSessionRow[] {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, expiresAt, createdAt, updatedAt,
              ipAddress, userAgent, token
       FROM session
       WHERE userId = ? AND expiresAt > ?
       ORDER BY updatedAt DESC`,
    )
    .all(userId, new Date().toISOString())
    .map((row) => mapSession(row as RawSessionRow, currentSessionId));
}

export function getSessionForRevocation(userId: string, sessionId: string): AdminSessionRow | null {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, expiresAt, createdAt, updatedAt,
              ipAddress, userAgent, token
       FROM session WHERE userId = ? AND id = ? AND expiresAt > ?`,
    )
    .get(userId, sessionId, new Date().toISOString()) as RawSessionRow | undefined;
  return row ? mapSession(row, "") : null;
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const session = getSessionForRevocation(userId, sessionId);
  if (!session) return false;
  await auth.api.revokeSession({ body: { token: session.token }, headers: await headers() });
  return true;
}

export function countOtherAdminSessions(userId: string, currentSessionId: string): number {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT COUNT(*) AS total FROM session
       WHERE userId = ? AND id <> ? AND expiresAt > ?`,
    )
    .get(userId, currentSessionId, new Date().toISOString()) as { total: number };
  return row.total;
}
