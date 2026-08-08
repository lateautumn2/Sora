import { Save, Trash2 } from "lucide-react";

import { PostPagination } from "@/components/site/post-pagination";
import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomyManagerProps {
  items: TaxonomyItem[];
  noun: string;
  notice?: string;
  saveAction: (formData: FormData) => Promise<never>;
  deleteAction: (formData: FormData) => Promise<never>;
  page: number;
  totalPages: number;
  basePath: string;
}

const notices: Record<string, string> = {
  saved: "保存成功",
  deleted: "删除成功",
  invalid: "名称或 URL 别名格式不正确",
  duplicate: "名称或 URL 别名已经存在",
  "in-use": "该项仍被内容使用，暂时不能删除",
};

export function TaxonomyManager({
  items,
  noun,
  notice,
  saveAction,
  deleteAction,
  page,
  totalPages,
  basePath,
}: TaxonomyManagerProps) {
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>{noun}</h1>
          <p>维护名称、公开 URL 与内容关联，保持站点内容结构清晰。</p>
        </div>
        <span className="admin-page-badge">共 {items.length} 条当前页记录</span>
      </header>

      {notice && notices[notice] ? (
        <p className="admin-notice mt-5" role="status">
          {notices[notice]}
        </p>
      ) : null}

      <section aria-labelledby="new-taxonomy" className="admin-panel mt-6">
        <div className="admin-panel-header">
          <div>
            <h2 id="new-taxonomy">新建{noun}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">填写名称、URL 别名和可选说明。</p>
          </div>
          <span className="admin-section-index">01</span>
        </div>
        <form action={saveAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]">
          <label className="admin-field">
            <span>名称</span>
            <input
              aria-label={`${noun}名称`}
              className="form-input"
              name="name"
              placeholder="例如：产品设计"
              required
            />
          </label>
          <label className="admin-field">
            <span>URL 别名</span>
            <input
              aria-label={`${noun} URL 别名`}
              className="form-input font-mono text-sm"
              name="slug"
              placeholder="product-design"
              required
            />
          </label>
          <label className="admin-field">
            <span>说明</span>
            <input
              aria-label={`${noun}说明`}
              className="form-input"
              name="description"
              placeholder="简短说明（可选）"
            />
          </label>
          <button className="primary-button self-end justify-center" type="submit">
            <Save aria-hidden="true" size={16} />
            保存
          </button>
        </form>
      </section>

      <section aria-labelledby="taxonomy-list" className="admin-panel mt-6">
        <div className="admin-panel-header">
          <div>
            <h2 id="taxonomy-list">已有{noun}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              可直接修改字段，保存后立即更新内容关联。
            </p>
          </div>
          <span className="admin-section-index">02</span>
        </div>
        {items.length === 0 ? (
          <div className="admin-empty mt-5">暂无{noun}</div>
        ) : (
          <div className="admin-list mt-5">
            {items.map((item) => (
              <div
                className="admin-taxonomy-row md:grid-cols-[1fr_1fr_1.5fr_auto_auto]"
                key={item.id}
              >
                <form action={saveAction} className="contents">
                  <input name="id" type="hidden" value={item.id} />
                  <label className="admin-field">
                    <span>名称</span>
                    <input
                      aria-label={`${item.name}名称`}
                      className="form-input"
                      defaultValue={item.name}
                      name="name"
                      required
                    />
                  </label>
                  <label className="admin-field">
                    <span>URL 别名</span>
                    <input
                      aria-label={`${item.name} URL 别名`}
                      className="form-input font-mono text-sm"
                      defaultValue={item.slug}
                      name="slug"
                      required
                    />
                  </label>
                  <label className="admin-field">
                    <span>说明</span>
                    <input
                      aria-label={`${item.name}说明`}
                      className="form-input"
                      defaultValue={item.description}
                      name="description"
                    />
                  </label>
                  <button
                    aria-label={`保存${item.name}`}
                    className="icon-button self-end"
                    title="保存"
                    type="submit"
                  >
                    <Save aria-hidden="true" size={16} />
                  </button>
                </form>
                <form action={deleteAction} className="self-end">
                  <input name="id" type="hidden" value={item.id} />
                  <button
                    aria-label={`删除${item.name}`}
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
        <PostPagination
          basePath={basePath}
          className="admin-pagination mt-5"
          page={page}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
