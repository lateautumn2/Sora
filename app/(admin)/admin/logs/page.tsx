import { ClipboardList } from "lucide-react";

import { AdminDataList, type AdminDataListColumn } from "@/components/admin/admin-data-list";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PostPagination } from "@/components/site/post-pagination";
import {
  operationActionLabels,
  operationActions,
  type OperationAction,
  countOperationLogs,
  listOperationLogs,
  type OperationLogRow,
} from "@/lib/auth/operation-log";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";

const PAGE_SIZE = 10;
const actionOptions: readonly { value: OperationAction; label: string }[] = Object.values(
  operationActions,
).map((value) => ({ value, label: operationActionLabels[value] }));

function parseAction(value: string | undefined): OperationAction | undefined {
  return actionOptions.some((option) => option.value === value)
    ? (value as OperationAction)
    : undefined;
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function metadataText(metadata: Record<string, unknown>): string {
  const value = JSON.stringify(metadata);
  return value === "{}" ? "—" : value;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const query = await searchParams;
  const action = parseAction(query.action);
  const total = countOperationLogs(action);
  const totalPages = resolveTotalPages(total, PAGE_SIZE);
  const requestedPage = resolvePage(query.page);
  const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  const logs = listOperationLogs(PAGE_SIZE, (page - 1) * PAGE_SIZE, action);
  const columns: readonly AdminDataListColumn<OperationLogRow>[] = [
    {
      key: "createdAt",
      label: "时间",
      render: (item) => (
        <time dateTime={new Date(item.createdAt).toISOString()}>{formatDate(item.createdAt)}</time>
      ),
    },
    {
      key: "actor",
      label: "操作者",
      render: (item) => (
        <div className="admin-data-primary">
          <strong>{item.actorName}</strong>
          <span>{item.actorEmail}</span>
        </div>
      ),
    },
    {
      key: "action",
      label: "操作",
      render: (item) => (
        <span className="admin-log-action">
          {operationActionLabels[item.action] ?? item.action}
        </span>
      ),
    },
    {
      key: "target",
      label: "对象",
      render: (item) => (
        <div className="admin-data-primary">
          <strong>{item.targetType}</strong>
          <span>{item.targetId || "—"}</span>
        </div>
      ),
    },
    {
      key: "request",
      label: "请求信息",
      render: (item) => (
        <div className="admin-log-request">
          <span>{item.ipAddress || "未知 IP"}</span>
          <span title={item.userAgent ?? undefined}>{item.userAgent || "未知设备"}</span>
        </div>
      ),
    },
    {
      key: "metadata",
      label: "详细信息",
      render: (item) => <code className="admin-log-metadata">{metadataText(item.metadata)}</code>,
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        actions={<span className="admin-count-badge">共 {total} 条</span>}
        description="永久保留登录、会话管理及后台数据变更记录。"
        title="操作日志"
      />
      <AdminTabs
        activeValue="logs"
        label="会话管理"
        tabs={[
          { href: "/admin/sessions", label: "登录会话", value: "sessions" },
          { href: "/admin/logs", label: "操作日志", value: "logs" },
        ]}
      />
      <AdminSurface>
        <form className="admin-log-filter" method="get">
          <label htmlFor="operation-log-action">操作类型</label>
          <select id="operation-log-action" name="action" defaultValue={action ?? ""}>
            <option value="">全部操作</option>
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="ui-button ui-button-compact" type="submit">
            筛选
          </button>
        </form>
        <div className="admin-surface-heading">
          <h2>
            <ClipboardList aria-hidden="true" size={18} />
            审计记录
          </h2>
          <span>永久保留</span>
        </div>
        {logs.length === 0 ? (
          <p className="admin-record-empty">暂无操作日志。</p>
        ) : (
          <AdminDataList
            columns={columns}
            getRowKey={(item) => item.id}
            getRowLabel={(item) => `${item.actorName} ${item.action}`}
            label="操作日志列表"
            rows={logs}
          />
        )}
        <div className="admin-log-pagination-footer">
          <span>
            第 {page} / {Math.max(totalPages, 1)} 页 · 每页 {PAGE_SIZE} 条
          </span>
          <PostPagination
            basePath="/admin/logs"
            className="admin-pagination"
            extraQuery={action ? { action } : undefined}
            page={page}
            totalPages={totalPages}
            variant="admin"
          />
        </div>
      </AdminSurface>
    </AdminPage>
  );
}
