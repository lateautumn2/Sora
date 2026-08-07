"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { Eye, Save, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  saveContentAction,
  trashContentAction,
  type ContentActionState,
} from "@/app/(admin)/admin/content-actions";
import { renderContent } from "@/lib/content/render";
import type { ContentDetail, TaxonomyItem } from "@/lib/content/service";
import { normalizeSlug } from "@/lib/content/validation";

interface ContentEditorProps {
  kind: "POST" | "PAGE";
  content?: ContentDetail;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

const initialState: ContentActionState = {};

export function ContentEditor({ kind, content, categories, tags }: ContentEditorProps) {
  const [state, formAction, pending] = useActionState(saveContentAction, initialState);
  const [title, setTitle] = useState(content?.title ?? "");
  const [slug, setSlug] = useState(content?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(content?.slug));
  const [source, setSource] = useState(content?.sourceContent ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const preview = useMemo(() => renderContent(source, "MARKDOWN").html, [source]);
  const noun = kind === "POST" ? "文章" : "页面";

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold">{content ? `编辑${noun}` : `新建${noun}`}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            保存会生成修订记录；选择已发布后内容立即公开。
          </p>
        </div>
        <div
          aria-label="编辑模式"
          className="inline-flex rounded-[var(--radius)] border border-[var(--border)] p-1"
        >
          <button
            aria-pressed={mode === "edit"}
            className={`h-8 px-3 text-sm ${mode === "edit" ? "bg-[var(--surface-strong)]" : "text-[var(--muted)]"}`}
            onClick={() => setMode("edit")}
            type="button"
          >
            编辑
          </button>
          <button
            aria-pressed={mode === "preview"}
            className={`inline-flex h-8 items-center gap-1.5 px-3 text-sm ${mode === "preview" ? "bg-[var(--surface-strong)]" : "text-[var(--muted)]"}`}
            onClick={() => setMode("preview")}
            type="button"
          >
            <Eye aria-hidden="true" size={15} />
            预览
          </button>
        </div>
      </header>

      <form action={formAction} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <input name="kind" type="hidden" value={kind} />
        {content ? <input name="id" type="hidden" value={content.id} /> : null}
        <input name="sourceFormat" type="hidden" value="MARKDOWN" />
        <input name="sourceContent" type="hidden" value={source} />

        <div className="min-w-0 space-y-5">
          <label className="grid gap-2 text-sm font-medium">
            标题
            <input
              className="h-12 border-b border-[var(--border)] text-2xl font-semibold outline-none focus:border-[var(--primary)]"
              maxLength={200}
              name="title"
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                if (!slugEdited) setSlug(normalizeSlug(nextTitle));
              }}
              placeholder={`${noun}标题`}
              required
              value={title}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            URL 别名
            <input
              className="h-10 rounded-[var(--radius)] border border-[var(--border)] px-3 font-mono text-sm outline-none focus:border-[var(--primary)]"
              maxLength={160}
              name="slug"
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              placeholder="article-slug"
              required
              value={slug}
            />
          </label>

          {mode === "edit" ? (
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
              <CodeMirror
                aria-label={`${noun}正文`}
                basicSetup={{ lineNumbers: true, foldGutter: true }}
                extensions={[markdown()]}
                height="34rem"
                onChange={setSource}
                placeholder="使用 Markdown 开始写作..."
                value={source}
              />
            </div>
          ) : (
            <article
              className="prose-content min-h-[34rem] rounded-[var(--radius)] border border-[var(--border)] p-5 md:p-8"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}

          <label className="grid gap-2 text-sm font-medium">
            摘要（留空时从正文生成）
            <textarea
              className="min-h-24 resize-y rounded-[var(--radius)] border border-[var(--border)] p-3 font-normal leading-6 outline-none focus:border-[var(--primary)]"
              defaultValue={content?.excerpt}
              maxLength={500}
              name="excerpt"
            />
          </label>

          <details className="rounded-[var(--radius)] border border-[var(--border)] p-4">
            <summary className="cursor-pointer text-sm font-medium">SEO 设置</summary>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm">
                SEO 标题
                <input className="form-input" defaultValue={content?.seoTitle} name="seoTitle" />
              </label>
              <label className="grid gap-2 text-sm">
                SEO 描述
                <textarea
                  className="form-textarea"
                  defaultValue={content?.seoDescription}
                  name="seoDescription"
                />
              </label>
              <label className="grid gap-2 text-sm">
                规范链接
                <input
                  className="form-input"
                  defaultValue={content?.canonicalUrl}
                  name="canonicalUrl"
                  type="url"
                />
              </label>
            </div>
          </details>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] p-4">
            <label className="grid gap-2 text-sm font-medium">
              状态
              <select
                className="form-input"
                defaultValue={content?.status ?? "DRAFT"}
                name="status"
              >
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="ARCHIVED">已归档</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              可见性
              <select
                className="form-input"
                defaultValue={content?.visibility ?? "PUBLIC"}
                name="visibility"
              >
                <option value="PUBLIC">公开</option>
                <option value="PRIVATE">私密</option>
              </select>
            </label>
            {kind === "POST" ? (
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={content?.pinned} name="pinned" type="checkbox" />
                置顶文章
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={content?.allowComment ?? true}
                name="allowComment"
                type="checkbox"
              />
              允许评论
            </label>
          </section>

          {kind === "POST" ? (
            <>
              <TaxonomyPicker
                items={categories}
                name="categoryIds"
                selected={content?.categories ?? []}
                title="分类"
              />
              <TaxonomyPicker
                items={tags}
                name="tagIds"
                selected={content?.tags ?? []}
                title="标签"
              />
            </>
          ) : null}

          {state.error ? (
            <p
              className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <Save aria-hidden="true" size={17} />
            {pending ? "正在保存..." : "保存内容"}
          </button>
        </aside>
      </form>

      {content ? (
        <form action={trashContentAction} className="mt-8 border-t border-[var(--border)] pt-5">
          <input name="id" type="hidden" value={content.id} />
          <input name="kind" type="hidden" value={kind} />
          <button
            className="inline-flex items-center gap-2 text-sm text-[var(--danger)] hover:underline"
            type="submit"
          >
            <Trash2 aria-hidden="true" size={16} />
            移至回收站
          </button>
        </form>
      ) : null}
    </div>
  );
}

function TaxonomyPicker({
  items,
  name,
  selected,
  title,
}: {
  items: TaxonomyItem[];
  name: "categoryIds" | "tagIds";
  selected: TaxonomyItem[];
  title: string;
}) {
  const selectedIds = new Set(selected.map((item) => item.id));
  return (
    <fieldset className="rounded-[var(--radius)] border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      {items.length > 0 ? (
        <div className="mt-1 max-h-40 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <label className="flex items-center gap-2 text-sm" key={item.id}>
              <input
                defaultChecked={selectedIds.has(item.id)}
                name={name}
                type="checkbox"
                value={item.id}
              />
              {item.name}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">暂无可选项</p>
      )}
    </fieldset>
  );
}
