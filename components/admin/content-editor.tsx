"use client";

import gfm from "@bytemd/plugin-gfm";
import { Editor } from "@bytemd/react";
import zhHans from "bytemd/locales/zh_Hans.json";
import "bytemd/dist/index.css";
import { ArrowLeft, ChevronDown, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  saveContentAction,
  trashContentAction,
  type ContentActionState,
} from "@/app/(admin)/admin/content-actions";
import { CategorySelect, TagMultiSelect } from "@/components/admin/taxonomy-selectors";
import type { ContentDetail, TaxonomyItem } from "@/lib/content/service";
import { normalizeSlug } from "@/lib/content/validation";

interface ContentEditorProps {
  kind: "POST" | "PAGE";
  content?: ContentDetail;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

interface UploadResult {
  data?: { url: string; alt?: string; title?: string };
  error?: { message?: string };
}

const initialState: ContentActionState = {};

/**
 * 文章/页面编辑器。
 * 采用 ByteMD（开源 Markdown 编辑器），支持工具栏、左右分屏预览和图片上传；
 * 布局刻意精简：第一屏只有标题与正文，属性设置全部收进折叠面板，便于沉浸写作。
 */
export function ContentEditor({ kind, content, categories, tags }: ContentEditorProps) {
  const [state, formAction, pending] = useActionState(saveContentAction, initialState);
  const [title, setTitle] = useState(content?.title ?? "");
  const [slug, setSlug] = useState(content?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(content?.slug));
  const [source, setSource] = useState(content?.sourceContent ?? "");
  const noun = kind === "POST" ? "文章" : "页面";
  const listHref = kind === "POST" ? "/admin/posts" : "/admin/pages";
  const plugins = useMemo(() => [gfm()], []);

  async function uploadImages(files: File[]): Promise<Array<{ url: string; alt?: string }>> {
    const uploaded: Array<{ url: string; alt?: string }> = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("altText", "");
      const response = await fetch("/api/v1/admin/media", { method: "POST", body: form });
      const payload = (await response.json()) as UploadResult;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "图片上传失败");
      }
      uploaded.push({ url: payload.data.url, alt: payload.data.alt });
    }
    return uploaded;
  }

  return (
    <div className="content-editor">
      <header className="content-editor-toolbar">
        <Link
          className="content-editor-toolbar-back text-sm text-[var(--muted)] hover:text-[var(--primary)]"
          href={listHref}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          返回列表
        </Link>
        <div className="content-editor-toolbar-actions">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            disabled={pending}
            form="content-editor-form"
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
            {pending ? "正在保存…" : "保存内容"}
          </button>
        </div>
      </header>

      <form action={formAction} className="content-editor-form" id="content-editor-form">
        <input name="kind" type="hidden" value={kind} />
        {content ? <input name="id" type="hidden" value={content.id} /> : null}
        <input name="sourceFormat" type="hidden" value="MARKDOWN" />
        <input name="sourceContent" type="hidden" value={source} />

        <input
          aria-label={`${noun}标题`}
          className="content-editor-title"
          maxLength={200}
          name="title"
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (!slugEdited) setSlug(normalizeSlug(nextTitle));
          }}
          placeholder={`输入${noun}标题…`}
          required
          value={title}
        />

        <div className="content-editor-body">
          <Editor
            locale={zhHans}
            mode="split"
            onChange={setSource}
            placeholder="从这里开始写作，支持 Markdown 语法与图片上传…"
            plugins={plugins}
            uploadImages={uploadImages}
            value={source}
          />
        </div>

        <details className="content-editor-settings">
          <summary>
            <span>文章设置</span>
            <ChevronDown aria-hidden="true" className="content-editor-summary-icon" size={16} />
          </summary>
          <div className="content-editor-settings-grid">
            <label className="grid gap-2 text-sm">
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
            <label className="grid gap-2 text-sm">
              可见性
              <select
                className="form-input"
                defaultValue={content?.visibility ?? "PUBLIC"}
                name="visibility"
              >
                <option value="PUBLIC">公开</option>
                <option value="PRIVATE">私有</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              URL 别名
              <input
                className="form-input font-mono"
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
            <label className="grid gap-2 text-sm">
              摘要（留空时从正文生成）
              <textarea
                className="form-textarea"
                defaultValue={content?.excerpt}
                maxLength={500}
                name="excerpt"
              />
            </label>

            {kind === "POST" ? (
              <fieldset className="content-editor-checks">
                <legend className="text-sm font-medium">选项</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input defaultChecked={content?.pinned} name="pinned" type="checkbox" />
                  置顶文章
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    defaultChecked={content?.allowComment ?? true}
                    name="allowComment"
                    type="checkbox"
                  />
                  允许评论
                </label>
              </fieldset>
            ) : null}

            <details className="content-editor-seo">
              <summary className="text-sm font-medium">SEO 设置</summary>
              <div className="mt-3 grid gap-4">
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

            {kind === "POST" ? (
              <>
                <CategorySelect items={categories} selected={content?.categories ?? []} />
                <TagMultiSelect items={tags} selected={content?.tags ?? []} />
              </>
            ) : null}
          </div>
        </details>

        {state.error ? (
          <p
            className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
      </form>

      {content ? (
        <form action={trashContentAction} className="content-editor-trash">
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
