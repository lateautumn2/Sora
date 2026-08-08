"use client";

import { useEffect, useState } from "react";

import { CategorySelect, TagMultiSelect } from "@/components/admin/taxonomy-selectors";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

interface EditorMetadata {
  allowComment: boolean;
  canonicalUrl: string;
  categoryId: string;
  excerpt: string;
  pinned: boolean;
  seoDescription: string;
  seoTitle: string;
  status: string;
  tagIds: string[];
  visibility: string;
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

function createMetadata(content?: ContentDetail): EditorMetadata {
  return {
    allowComment: content?.allowComment ?? true,
    canonicalUrl: content?.canonicalUrl ?? "",
    categoryId: content?.categories[0]?.id ?? "",
    excerpt: content?.excerpt ?? "",
    pinned: content?.pinned ?? false,
    seoDescription: content?.seoDescription ?? "",
    seoTitle: content?.seoTitle ?? "",
    status: content?.status ?? "DRAFT",
    tagIds: content?.tags.map((tag) => tag.id) ?? [],
    visibility: content?.visibility ?? "PUBLIC",
  };
}

function EditorSettingsFields({
  categories,
  formId,
  kind,
  metadata,
  onMetadataChange,
  onSlugChange,
  slug,
  tags,
}: Omit<EditorSettingsPanelProps, "content"> & {
  metadata: EditorMetadata;
  onMetadataChange: (metadata: EditorMetadata) => void;
}) {
  function updateMetadata<K extends keyof EditorMetadata>(key: K, value: EditorMetadata[K]) {
    onMetadataChange({ ...metadata, [key]: value });
  }

  return (
    <div className="editor-settings-panel-fields">
      <SelectField
        form={formId}
        label="状态"
        name="status"
        onValueChange={(value) => updateMetadata("status", value)}
        options={statusOptions}
        value={metadata.status}
      />
      <SelectField
        form={formId}
        label="可见性"
        name="visibility"
        onValueChange={(value) => updateMetadata("visibility", value)}
        options={visibilityOptions}
        value={metadata.visibility}
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
        <Textarea
          form={formId}
          maxLength={500}
          name="excerpt"
          onChange={(event) => updateMetadata("excerpt", event.target.value)}
          value={metadata.excerpt}
        />
      </Field>

      {kind === "POST" ? (
        <fieldset className="editor-settings-panel-options">
          <legend>文章选项</legend>
          <label>
            <Checkbox
              checked={metadata.pinned}
              className="ui-checkbox-input"
              form={formId}
              name="pinned"
              onCheckedChange={(checked) => updateMetadata("pinned", checked === true)}
            />
            置顶文章
          </label>
          <label>
            <Checkbox
              checked={metadata.allowComment}
              className="ui-checkbox-input"
              form={formId}
              name="allowComment"
              onCheckedChange={(checked) => updateMetadata("allowComment", checked === true)}
            />
            允许评论
          </label>
        </fieldset>
      ) : null}

      <fieldset className="editor-settings-panel-seo">
        <legend>SEO 设置</legend>
        <Field label="SEO 标题">
          <Input
            form={formId}
            name="seoTitle"
            onChange={(event) => updateMetadata("seoTitle", event.target.value)}
            value={metadata.seoTitle}
          />
        </Field>
        <Field label="SEO 描述">
          <Textarea
            form={formId}
            name="seoDescription"
            onChange={(event) => updateMetadata("seoDescription", event.target.value)}
            value={metadata.seoDescription}
          />
        </Field>
        <Field label="规范链接">
          <Input
            form={formId}
            name="canonicalUrl"
            onChange={(event) => updateMetadata("canonicalUrl", event.target.value)}
            type="url"
            value={metadata.canonicalUrl}
          />
        </Field>
      </fieldset>

      {kind === "POST" ? (
        <div className="editor-settings-panel-taxonomy">
          <CategorySelect
            form={formId}
            items={categories}
            onValueChange={(value) => updateMetadata("categoryId", value as string)}
            selected={[]}
            value={metadata.categoryId}
          />
          <TagMultiSelect
            form={formId}
            items={tags}
            onValueChange={(value) => updateMetadata("tagIds", value as string[])}
            selected={[]}
            value={metadata.tagIds}
          />
        </div>
      ) : null}
    </div>
  );
}

function EditorMetadataBridge({
  formId,
  kind,
  metadata,
  slug,
}: Pick<EditorSettingsPanelProps, "formId" | "kind" | "slug"> & { metadata: EditorMetadata }) {
  return (
    <>
      <input form={formId} name="status" type="hidden" value={metadata.status} />
      <input form={formId} name="visibility" type="hidden" value={metadata.visibility} />
      <input form={formId} name="slug" type="hidden" value={slug} />
      <input form={formId} name="excerpt" type="hidden" value={metadata.excerpt} />
      <input form={formId} name="seoTitle" type="hidden" value={metadata.seoTitle} />
      <input form={formId} name="seoDescription" type="hidden" value={metadata.seoDescription} />
      <input form={formId} name="canonicalUrl" type="hidden" value={metadata.canonicalUrl} />
      {kind === "POST" ? (
        <>
          {metadata.pinned ? <input form={formId} name="pinned" type="hidden" value="on" /> : null}
          {metadata.allowComment ? (
            <input form={formId} name="allowComment" type="hidden" value="on" />
          ) : null}
          <input form={formId} name="categoryIds" type="hidden" value={metadata.categoryId} />
          {metadata.tagIds.map((tagId) => (
            <input form={formId} key={tagId} name="tagIds" type="hidden" value={tagId} />
          ))}
        </>
      ) : null}
    </>
  );
}

export function EditorSettingsPanel({ content, ...props }: EditorSettingsPanelProps) {
  const isMobile = useMobileLayout();
  const [metadata, setMetadata] = useState(() => createMetadata(content));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fieldProps = { ...props, metadata, onMetadataChange: setMetadata };

  if (isMobile) {
    return (
      <div className="editor-settings-panel-mobile">
        {!isDialogOpen ? <EditorMetadataBridge {...props} metadata={metadata} /> : null}
        <Dialog
          onOpenChange={setIsDialogOpen}
          open={isDialogOpen}
          title="文章设置"
          trigger="文章设置"
        >
          <EditorSettingsFields {...fieldProps} />
        </Dialog>
      </div>
    );
  }

  return (
    <aside aria-label="文章设置" className="admin-surface editor-settings-panel">
      <h2>文章设置</h2>
      <EditorSettingsFields {...fieldProps} />
    </aside>
  );
}
