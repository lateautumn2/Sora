import { MonitorSmartphone, ShieldCheck } from "lucide-react";

import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/app/(admin)/admin/sessions/actions";
import { AdminDataList, type AdminDataListColumn } from "@/components/admin/admin-data-list";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/auth/admin";
import { listAdminSessions, type AdminSessionRow } from "@/lib/auth/session-management";

const noticeText: Record<string, string> = {
  current: "当前会话不能撤销。",
  missing: "目标会话不存在或已经过期。",
  none: "没有可撤销的其他会话。",
  revoked: "会话已撤销。",
  "revoked-others": "其他会话已全部撤销，当前会话仍然保留。",
};

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function describeUserAgent(value: string | null): string {
  if (!value) return "未知设备";
  const browser = value.match(/Edg\/([\d.]+)/u)
    ? "Edge"
    : value.match(/Chrome\/([\d.]+)/u)
      ? "Chrome"
      : value.match(/Firefox\/([\d.]+)/u)
        ? "Firefox"
        : value.match(/Safari\/([\d.]+)/u)
          ? "Safari"
          : "未知浏览器";
  const system = value.includes("Windows")
    ? "Windows"
    : value.includes("Mac OS")
      ? "macOS"
      : value.includes("Android")
        ? "Android"
        : value.includes("iPhone")
          ? "iPhone"
          : value.includes("Linux")
            ? "Linux"
            : "未知系统";
  return `${browser} · ${system}`;
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const sessions = listAdminSessions(session.user.id, session.session.id);
  const columns: readonly AdminDataListColumn<AdminSessionRow>[] = [
    {
      key: "device",
      label: "设备与浏览器",
      render: (item) => (
        <div className="admin-session-device">
          <strong>{describeUserAgent(item.userAgent)}</strong>
          <span title={item.userAgent ?? undefined}>{item.userAgent || "未提供 User-Agent"}</span>
        </div>
      ),
    },
    {
      key: "ip",
      label: "IP 地址",
      render: (item) => <span className="admin-mono-text">{item.ipAddress || "未知"}</span>,
    },
    {
      key: "time",
      label: "时间",
      render: (item) => (
        <div className="admin-session-times">
          <span>创建：{formatDate(item.createdAt)}</span>
          <span>最近：{formatDate(item.updatedAt)}</span>
          <span>过期：{formatDate(item.expiresAt)}</span>
        </div>
      ),
    },
    {
      align: "end",
      key: "action",
      label: "状态",
      render: (item) =>
        item.isCurrent ? (
          <span className="admin-session-current">
            <ShieldCheck aria-hidden="true" size={15} />
            当前会话
          </span>
        ) : (
          <form action={revokeSessionAction}>
            <input name="sessionId" type="hidden" value={item.id} />
            <Button className="ui-button-danger ui-button-compact" type="submit">
              撤销
            </Button>
          </form>
        ),
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <form action={revokeOtherSessionsAction}>
            <Button className="ui-button-danger" disabled={sessions.length <= 1} type="submit">
              撤销其他全部会话
            </Button>
          </form>
        }
        description="查看当前账号的有效登录设备，并撤销不再使用的会话。"
        title="登录会话"
      />
      <AdminTabs
        activeValue="sessions"
        label="会话管理"
        tabs={[
          { href: "/admin/sessions", label: "登录会话", value: "sessions" },
          { href: "/admin/logs", label: "操作日志", value: "logs" },
        ]}
      />
      {query.notice && noticeText[query.notice] ? (
        <p className="admin-notice" role="status">
          {noticeText[query.notice]}
        </p>
      ) : null}
      <AdminSurface>
        <div className="admin-surface-heading">
          <h2>
            <MonitorSmartphone aria-hidden="true" size={18} />
            有效会话
          </h2>
          <span>{sessions.length} 个会话</span>
        </div>
        {sessions.length === 0 ? (
          <p className="admin-record-empty">暂无有效会话。</p>
        ) : (
          <AdminDataList
            columns={columns}
            getRowKey={(item) => item.id}
            getRowLabel={(item) => describeUserAgent(item.userAgent)}
            label="登录会话列表"
            rows={sessions}
          />
        )}
      </AdminSurface>
    </AdminPage>
  );
}
