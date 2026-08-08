import { Save } from "lucide-react";

import { getSiteSettings } from "@/lib/content/service";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { changePasswordAction, saveRuntimeConfigAction, saveSiteSettingsAction } from "./actions";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const settings = getSiteSettings();
  const runtimeConfig = getRuntimeConfig();
  const notice = (await searchParams).notice;
  return (
    <div className="admin-page max-w-4xl">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">站点身份、站点地址与运行配置</p>
      </header>
      {notice ? (
        <p className="admin-notice mt-5" role="status">
          {notice === "saved"
            ? "设置已保存"
            : notice === "runtime-saved"
              ? "站点地址与来源已保存，刷新页面即可生效"
              : notice === "invalid-runtime"
                ? "站点地址或来源格式不正确，请检查后重试"
                : notice === "password-saved"
                  ? "密码已更新，其他会话已撤销"
                  : notice === "password-current"
                    ? "当前密码不正确"
                    : notice === "password-invalid"
                      ? "新密码至少 12 个字符，且两次输入必须一致"
                      : "设置格式不正确，请检查后重试"}
        </p>
      ) : null}
      <form action={saveSiteSettingsAction} className="admin-panel mt-6 grid gap-5">
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
        <fieldset className="admin-settings-panel">
          <legend className="text-sm font-semibold">{"\u8bc4\u8bba\u8bbe\u7f6e"}</legend>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input
              className="mt-0.5 size-4 accent-[var(--primary)]"
              defaultChecked={settings.allowComments}
              name="allowComments"
              type="checkbox"
            />
            <span>
              {"\u5141\u8bb8\u5168\u7ad9\u8bc4\u8bba"}
              <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                {
                  "\u5173\u95ed\u540e\uff0c\u6240\u6709\u6587\u7ae0\u548c\u9875\u9762\u90fd\u4e0d\u4f1a\u63a5\u53d7\u65b0\u8bc4\u8bba\u3002"
                }
              </span>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input
              className="mt-0.5 size-4 accent-[var(--primary)]"
              defaultChecked={settings.requireCommentModeration}
              name="requireCommentModeration"
              type="checkbox"
            />
            <span>
              {"\u8bc4\u8bba\u9700\u8981\u5ba1\u6838"}
              <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                {
                  "\u5173\u95ed\u540e\uff0c\u8bbf\u5ba2\u8bc4\u8bba\u4f1a\u76f4\u63a5\u516c\u5f00\u3002"
                }
              </span>
            </span>
          </label>
        </fieldset>
        <button className="primary-button w-fit" type="submit">
          <Save aria-hidden="true" size={17} />
          保存设置
        </button>
      </form>
      <section className="admin-panel mt-6" aria-labelledby="runtime-config">
        <h2 className="text-lg font-semibold" id="runtime-config">
          站点地址与来源
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          保存后立即生效，无需重启容器。站点地址用于生成规范链接、RSS 与认证 Cookie；
          可信来源允许跨域请求提交评论、点赞等公开写入操作。
        </p>
        <form action={saveRuntimeConfigAction} className="mt-4 grid max-w-xl gap-4">
          <label className="grid gap-2 text-sm font-medium">
            站点地址
            <input
              className="form-input"
              defaultValue={runtimeConfig.appUrl}
              name="appUrl"
              placeholder="https://blog.example.com"
              type="url"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            可信来源
            <textarea
              className="form-textarea"
              defaultValue={runtimeConfig.trustedOrigins.join(", ")}
              name="trustedOrigins"
              placeholder="https://admin.example.com, https://blog.example.com"
              rows={3}
            />
            <span className="text-xs font-normal text-[var(--muted)]">
              多个来源用英文逗号分隔，无需重复填写站点地址本身。
            </span>
          </label>
          <button className="primary-button w-fit" type="submit">
            <Save aria-hidden="true" size={17} />
            保存站点地址与来源
          </button>
        </form>
      </section>
      <section className="admin-panel mt-6" aria-labelledby="account-security">
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
