import { Save } from "lucide-react";

import { getSiteSettings } from "@/lib/content/service";

import { changePasswordAction, saveSiteSettingsAction } from "./actions";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const settings = getSiteSettings();
  const notice = (await searchParams).notice;
  return (
    <div className="max-w-3xl">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">站点身份、作者信息与页脚内容</p>
      </header>
      {notice ? (
        <p
          className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          role="status"
        >
          {notice === "saved"
            ? "设置已保存"
            : notice === "password-saved"
              ? "密码已更新，其他会话已撤销"
              : notice === "password-current"
                ? "当前密码不正确"
                : notice === "password-invalid"
                  ? "新密码至少 12 个字符，且两次输入必须一致"
                  : "设置格式不正确，请检查后重试"}
        </p>
      ) : null}
      <form action={saveSiteSettingsAction} className="mt-6 grid gap-5">
        <label className="grid gap-2 text-sm font-medium">
          站点名称
          <input className="form-input" defaultValue={settings.title} name="title" required />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          站点说明
          <textarea
            className="form-textarea"
            defaultValue={settings.description}
            name="description"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          作者名称
          <input className="form-input" defaultValue={settings.authorName} name="authorName" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          头像地址
          <input
            className="form-input"
            defaultValue={settings.avatarUrl}
            name="avatarUrl"
            placeholder="https://example.com/avatar.png"
            type="url"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            联系邮箱
            <input className="form-input" defaultValue={settings.email} name="email" type="email" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            GitHub 地址
            <input
              className="form-input"
              defaultValue={settings.githubUrl}
              name="githubUrl"
              type="url"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          页脚文字
          <input className="form-input" defaultValue={settings.footerText} name="footerText" />
        </label>
        <button className="primary-button w-fit" type="submit">
          <Save aria-hidden="true" size={17} />
          保存设置
        </button>
      </form>
      <section
        className="mt-12 border-t border-[var(--border)] pt-6"
        aria-labelledby="account-security"
      >
        <h2 className="text-lg font-semibold" id="account-security">
          账号安全
        </h2>
        <form action={changePasswordAction} className="mt-4 grid max-w-xl gap-4">
          <label className="grid gap-2 text-sm font-medium">
            当前密码
            <input
              autoComplete="current-password"
              className="form-input"
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            新密码
            <input
              autoComplete="new-password"
              className="form-input"
              minLength={12}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            确认新密码
            <input
              autoComplete="new-password"
              className="form-input"
              minLength={12}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <button className="primary-button w-fit" type="submit">
            更新密码
          </button>
        </form>
      </section>
    </div>
  );
}
