import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { getDatabaseConnection } from "@/lib/db/client";

export const operationActions = {
  LOGIN: "LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  SESSION_REVOKE: "SESSION_REVOKE",
  SESSION_REVOKE_OTHERS: "SESSION_REVOKE_OTHERS",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  RESTORE: "RESTORE",
  TRASH: "TRASH",
  DATA_IMPORT: "DATA_IMPORT",
  DATA_RESTORE: "DATA_RESTORE",
  DATA_EXPORT: "DATA_EXPORT",
} as const;

export type OperationAction = (typeof operationActions)[keyof typeof operationActions];

export const operationActionLabels: Record<OperationAction, string> = {
  LOGIN: "登录成功",
  LOGIN_FAILED: "登录失败",
  LOGOUT: "退出登录",
  SESSION_REVOKE: "撤销会话",
  SESSION_REVOKE_OTHERS: "撤销其他会话",
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "删除",
  RESTORE: "恢复",
  TRASH: "移入回收站",
  DATA_IMPORT: "导入数据",
  DATA_RESTORE: "恢复备份",
  DATA_EXPORT: "导出备份",
};

export interface OperationActor {
  id?: string;
  name?: string | null;
  email?: string | null;
}

export interface OperationLogInput {
  actor?: OperationActor;
  action: OperationAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  actorEmail?: string;
}

function requestIpAddress(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || null;
}

/**
 * 写入一条后台审计记录。日志只保存业务定位所需的元数据，调用方不得传入
 * 密码、session token 或其他凭据；该约束通过这里统一的输入边界保持清晰。
 */
export async function recordOperation(input: OperationLogInput): Promise<void> {
  const requestHeaders = await headers();
  const metadata = input.metadata ?? {};
  const actorName = input.actor?.name?.trim() || "未知用户";
  const actorEmail = input.actor?.email?.trim() || input.actorEmail?.trim() || "未知邮箱";

  getDatabaseConnection()
    .sqlite.prepare(
      `INSERT INTO operation_logs (
         id, user_id, actor_name, actor_email, action, target_type, target_id,
         metadata_json, ip_address, user_agent, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.actor?.id ?? null,
      actorName,
      actorEmail,
      input.action,
      input.targetType,
      input.targetId ?? null,
      JSON.stringify(metadata),
      requestIpAddress(requestHeaders),
      requestHeaders.get("user-agent"),
      Date.now(),
    );
}

export interface OperationLogRow {
  id: string;
  userId: string | null;
  actorName: string;
  actorEmail: string;
  action: OperationAction;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
}

interface OperationLogDatabaseRow extends Omit<OperationLogRow, "action" | "metadata"> {
  action: string;
  metadataJson: string;
}

function mapOperationLog(row: OperationLogDatabaseRow): OperationLogRow {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.metadataJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    // 保留损坏日志本身，避免单条异常记录阻塞整页查看。
  }
  return { ...row, action: row.action as OperationAction, metadata };
}

export function countOperationLogs(action?: OperationAction): number {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT COUNT(*) AS total FROM operation_logs ${action ? "WHERE action = ?" : ""}`,
    )
    .get(...(action ? [action] : [])) as { total: number };
  return row.total;
}

export function listOperationLogs(
  limit: number,
  offset: number,
  action?: OperationAction,
): OperationLogRow[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, user_id AS userId, actor_name AS actorName, actor_email AS actorEmail,
              action, target_type AS targetType, target_id AS targetId,
              metadata_json AS metadataJson, ip_address AS ipAddress,
              user_agent AS userAgent, created_at AS createdAt
       FROM operation_logs
       ${action ? "WHERE action = ?" : ""}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...(action ? [action, limit, offset] : [limit, offset])) as OperationLogDatabaseRow[];
  return rows.map(mapOperationLog);
}
