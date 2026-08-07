import { Save, Trash2 } from "lucide-react";

import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomyManagerProps {
  items: TaxonomyItem[];
  noun: string;
  notice?: string;
  saveAction: (formData: FormData) => Promise<never>;
  deleteAction: (formData: FormData) => Promise<never>;
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
}: TaxonomyManagerProps) {
  return (
    <div>
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">{noun}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">维护名称、公开 URL 与内容关联</p>
      </header>
      {notice && notices[notice] ? (
        <p
          className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          role="status"
        >
          {notices[notice]}
        </p>
      ) : null}

      <section className="mt-6" aria-labelledby="new-taxonomy">
        <h2 className="text-lg font-semibold" id="new-taxonomy">
          新建{noun}
        </h2>
        <form action={saveAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
          <input
            aria-label={`${noun}名称`}
            className="form-input"
            name="name"
            placeholder="名称"
            required
          />
          <input
            aria-label={`${noun} URL 别名`}
            className="form-input"
            name="slug"
            placeholder="url-slug"
            required
          />
          <input
            aria-label={`${noun}说明`}
            className="form-input"
            name="description"
            placeholder="简短说明（可选）"
          />
          <button className="primary-button justify-center" type="submit">
            <Save aria-hidden="true" size={16} />
            保存
          </button>
        </form>
      </section>

      <section className="mt-10" aria-labelledby="taxonomy-list">
        <h2
          className="border-b border-[var(--border)] pb-3 text-lg font-semibold"
          id="taxonomy-list"
        >
          已有{noun}
        </h2>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">暂无{noun}</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div className="grid gap-2 py-4 md:grid-cols-[1fr_1fr_2fr_auto_auto]" key={item.id}>
                <form action={saveAction} className="contents">
                  <input name="id" type="hidden" value={item.id} />
                  <input
                    aria-label={`${item.name}名称`}
                    className="form-input"
                    defaultValue={item.name}
                    name="name"
                    required
                  />
                  <input
                    aria-label={`${item.name} URL 别名`}
                    className="form-input font-mono text-sm"
                    defaultValue={item.slug}
                    name="slug"
                    required
                  />
                  <input
                    aria-label={`${item.name}说明`}
                    className="form-input"
                    defaultValue={item.description}
                    name="description"
                  />
                  <button
                    aria-label={`保存${item.name}`}
                    className="icon-button"
                    title="保存"
                    type="submit"
                  >
                    <Save aria-hidden="true" size={16} />
                  </button>
                </form>
                <form action={deleteAction}>
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
      </section>
    </div>
  );
}
