import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSiteSettings } from "@/lib/content/service";
import { getRuntimeConfig } from "@/lib/runtime-config";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const settings = getSiteSettings();
  const runtimeConfig = getRuntimeConfig();
  const notice = (await searchParams).notice;

  return (
    <AdminPage className="max-w-4xl">
      <AdminPageHeader description="站点身份、评论、运行配置与账号安全" title="设置" />
      {notice === "saved" || notice === "runtime-saved" || notice === "password-saved" ? (
        <p className="admin-notice" role="status">
          {notice === "saved"
            ? "设置已保存"
            : notice === "runtime-saved"
              ? "运行配置已保存"
              : "密码已更新，其他会话已撤销"}
        </p>
      ) : null}
      <SettingsForm runtimeConfig={runtimeConfig} settings={settings} />
    </AdminPage>
  );
}
