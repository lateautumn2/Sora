import { Save, Trash2 } from "lucide-react";

import { listPrimaryMenuItems } from "@/lib/content/service";

import { deleteMenuItemAction, saveMenuItemAction } from "./actions";

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const items = listPrimaryMenuItems(true);
  const notice = (await searchParams).notice;
  return (
    <div>
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">菜单</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          维护公开站点主导航；支持站内路径和 HTTPS 链接
        </p>
      </header>
      {notice ? (
        <p
          className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          role="status"
        >
          {notice === "invalid"
            ? "菜单名称或 URL 格式不正确"
            : notice === "deleted"
              ? "菜单项已删除"
              : "菜单项已保存"}
        </p>
      ) : null}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">新建菜单项</h2>
        <form
          action={saveMenuItemAction}
          className="mt-3 grid gap-3 lg:grid-cols-[1fr_2fr_6rem_auto_auto_auto]"
        >
          <input
            aria-label="菜单名称"
            className="form-input"
            name="label"
            placeholder="名称"
            required
          />
          <input
            aria-label="菜单 URL"
            className="form-input"
            name="url"
            placeholder="/about"
            required
          />
          <input
            aria-label="菜单顺序"
            className="form-input"
            defaultValue="0"
            min="0"
            name="sortOrder"
            type="number"
          />
          <label className="flex items-center gap-2 text-sm">
            <input defaultChecked name="enabled" type="checkbox" />
            启用
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="openInNewTab" type="checkbox" />
            新窗口
          </label>
          <button className="primary-button justify-center" type="submit">
            <Save aria-hidden="true" size={16} />
            保存
          </button>
        </form>
      </section>
      <section className="mt-10">
        <h2 className="border-b border-[var(--border)] pb-3 text-lg font-semibold">主导航</h2>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">未配置时将使用默认导航</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div
                className="grid gap-2 py-4 lg:grid-cols-[1fr_2fr_6rem_auto_auto_auto]"
                key={item.id}
              >
                <form action={saveMenuItemAction} className="contents">
                  <input name="id" type="hidden" value={item.id} />
                  <input
                    aria-label={`${item.label}名称`}
                    className="form-input"
                    defaultValue={item.label}
                    name="label"
                    required
                  />
                  <input
                    aria-label={`${item.label} URL`}
                    className="form-input"
                    defaultValue={item.url}
                    name="url"
                    required
                  />
                  <input
                    aria-label={`${item.label}顺序`}
                    className="form-input"
                    defaultValue={item.sortOrder}
                    min="0"
                    name="sortOrder"
                    type="number"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input defaultChecked={item.enabled} name="enabled" type="checkbox" />
                    启用
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input defaultChecked={item.openInNewTab} name="openInNewTab" type="checkbox" />
                    新窗口
                  </label>
                  <button
                    aria-label={`保存${item.label}`}
                    className="icon-button"
                    title="保存"
                    type="submit"
                  >
                    <Save aria-hidden="true" size={16} />
                  </button>
                </form>
                <form action={deleteMenuItemAction}>
                  <input name="id" type="hidden" value={item.id} />
                  <button
                    aria-label={`删除${item.label}`}
                    className="icon-button text-[var(--danger)]"
                    title="删除"
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
