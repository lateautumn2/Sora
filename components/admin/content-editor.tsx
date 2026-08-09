"use client";

import gfm from "@bytemd/plugin-gfm";
import { Editor } from "@bytemd/react";
import zhHans from "bytemd/locales/zh_Hans.json";
import "bytemd/dist/index.css";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  saveContentAction,
  trashContentAction,
  type ContentActionState,
} from "@/app/(admin)/admin/content-actions";
import { EditorSettingsPanel } from "@/components/admin/editor-settings-panel";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
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

const initialState: ContentActionState = { status: "idle" };

/**
 * 编辑器主区只保留标题和 ByteMD，避免设置字段打断写作。
 * 设置字段由 EditorSettingsPanel 管理；移动端 Portal 中的字段通过 form 属性关联本表单。
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
      <AdminToolbar className="content-editor-toolbar" label="编辑器工具">
        <Link className="content-editor-toolbar-back" href={listHref}>
          <ArrowLeft aria-hidden="true" size={16} />
          返回列表
        </Link>
        <div className="content-editor-toolbar-actions">
          {content ? (
            <form action={trashContentAction} className="content-editor-toolbar-trash">
              <input name="id" type="hidden" value={content.id} />
              <input name="kind" type="hidden" value={kind} />
              <Button className="ui-button-danger" type="submit">
                <Trash2 aria-hidden="true" size={16} />
                移至回收站
              </Button>
            </form>
          ) : null}
          <Button form="content-editor-form" loading={pending} type="submit">
            <Save aria-hidden="true" size={16} />
            {pending ? "正在保存" : "保存内容"}
          </Button>
        </div>
      </AdminToolbar>

      <form action={formAction} className="content-editor-form" id="content-editor-form">
        <input name="kind" type="hidden" value={kind} />
        {content ? <input name="id" type="hidden" value={content.id} /> : null}
        <input name="sourceFormat" type="hidden" value="MARKDOWN" />
        <input name="sourceContent" type="hidden" value={source} />

        <div className="content-editor-workspace">
          <div className="content-editor-main">
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
          </div>

          <EditorSettingsPanel
            categories={categories}
            content={content}
            formId="content-editor-form"
            kind={kind}
            onSlugChange={(nextSlug) => {
              setSlugEdited(true);
              setSlug(nextSlug);
            }}
            slug={slug}
            tags={tags}
          />
        </div>

        {state.formError ? <FormMessage>{state.formError}</FormMessage> : null}
      </form>
    </div>
  );
}
