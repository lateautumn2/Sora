"use client";

import { useEffect, useState } from "react";

import { CategorySelect, TagMultiSelect } from "@/components/admin/taxonomy-selectors";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { ContentDetail, TaxonomyItem } from "@/lib/content/service";

interface EditorSettingsPanelProps {
  categories: TaxonomyItem[];
  content?: ContentDetail;
  formId: string;
  kind: "POST" | "PAGE";
  onSlugChange: (value: string) => void;
  slug: string;
  tags: TaxonomyItem[];
}

const statusOptions = [
  { value: "DRAFT", label: "草稿" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "ARCHIVED", label: "已归档" },
];

const visibilityOptions = [
  { value: "PUBLIC", label: "公开" },
  { value: "PRIVATE", label: "私有" },
];

function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(max-width: 63.9375rem)");
    const sync = () => setIsMobile(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function EditorSettingsFields({
  categories,
  content,
  formId,
  kind,
  onSlugChange,
  slug,
  tags,
}: EditorSettingsPanelProps) {
  return (
    <div className="editor-settings-panel-fields">
      <SelectField
        defaultValue={content?.status ?? "DRAFT"}
        form={formId}
        label="状态"
        name="status"
        options={statusOptions}
      />
      <SelectField
        defaultValue={content?.visibility ?? "PUBLIC"}
        form={formId}
        label="可见性"
        name="visibility"
        options={visibilityOptions}
      />
      <Field label="URL 别名">
        <Input
          form={formId}
          maxLength={160}
          name="slug"
          onChange={(event) => onSlugChange(event.target.value)}
          placeholder="article-slug"
          required
          value={slug}
        />
      </Field>
      <Field label="摘要（留空时从正文生成）">
        <Textarea defaultValue={content?.excerpt} form={formId} maxLength={500} name="excerpt" />
      </Field>

      {kind === "POST" ? (
        <fieldset className="editor-settings-panel-options">
          <legend>文章选项</legend>
          <label>
            <Checkbox
              className="ui-checkbox-input"
              defaultChecked={content?.pinned}
              form={formId}
              name="pinned"
            />
            置顶文章
          </label>
          <label>
            <Checkbox
              className="ui-checkbox-input"
              defaultChecked={content?.allowComment ?? true}
              form={formId}
              name="allowComment"
            />
            允许评论
          </label>
        </fieldset>
      ) : null}

      <fieldset className="editor-settings-panel-seo">
        <legend>SEO 设置</legend>
        <Field label="SEO 标题">
          <Input defaultValue={content?.seoTitle} form={formId} name="seoTitle" />
        </Field>
        <Field label="SEO 描述">
          <Textarea defaultValue={content?.seoDescription} form={formId} name="seoDescription" />
        </Field>
        <Field label="规范链接">
          <Input defaultValue={content?.canonicalUrl} form={formId} name="canonicalUrl" type="url" />
        </Field>
      </fieldset>

      {kind === "POST" ? (
        <div className="editor-settings-panel-taxonomy">
          <CategorySelect form={formId} items={categories} selected={content?.categories ?? []} />
          <TagMultiSelect form={formId} items={tags} selected={content?.tags ?? []} />
        </div>
      ) : null}
    </div>
  );
}

export function EditorSettingsPanel(props: EditorSettingsPanelProps) {
  const isMobile = useMobileLayout();

  if (isMobile) {
    return (
      <div className="editor-settings-panel-mobile">
        <Dialog title="文章设置" trigger="文章设置">
          <EditorSettingsFields {...props} />
        </Dialog>
      </div>
    );
  }

  return (
    <aside aria-label="文章设置" className="admin-surface editor-settings-panel">
      <h2>文章设置</h2>
      <EditorSettingsFields {...props} />
    </aside>
  );
}
