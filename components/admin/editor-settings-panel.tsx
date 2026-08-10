"use client";

import { Image as ImageIcon, Images, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CategorySelect, TagMultiSelect } from "@/components/admin/taxonomy-selectors";
import { IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import type { ContentDetail, TaxonomyItem } from "@/lib/content/service";
import type { MediaSelectionItem } from "@/lib/media/service";

interface EditorSettingsPanelProps {
  categories: TaxonomyItem[];
  content?: ContentDetail;
  formId: string;
  kind: "POST" | "PAGE";
  media: MediaSelectionItem[];
  onSlugChange: (value: string) => void;
  slug: string;
  tags: TaxonomyItem[];
}

interface EditorMetadata {
  allowComment: boolean;
  canonicalUrl: string;
  categoryId: string;
  coverMediaId: string;
  coverUrl: string;
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
    coverMediaId: content?.cover?.id ?? "",
    coverUrl: content?.cover && !content.cover.id ? content.cover.url : "",
    excerpt: content?.excerpt ?? "",
    pinned: content?.pinned ?? false,
    seoDescription: content?.seoDescription ?? "",
    seoTitle: content?.seoTitle ?? "",
    status: content?.status ?? "DRAFT",
    tagIds: content?.tags.map((tag) => tag.id) ?? [],
    visibility: content?.visibility ?? "PUBLIC",
  };
}

function CoverMediaField({
  formId,
  media,
  mediaId,
  onValueChange,
  url,
}: {
  formId: string;
  media: MediaSelectionItem[];
  mediaId: string;
  onValueChange: (value: Pick<EditorMetadata, "coverMediaId" | "coverUrl">) => void;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = media.find((item) => item.id === mediaId);
  const externalUrl = /^https?:\/\/\S+$/i.test(url.trim()) ? url.trim() : "";
  const previewUrl = selected ? `/media/${selected.storageKey}` : externalUrl;

  return (
    <Field label="文章封面">
      <div className="editor-cover-picker">
        <input form={formId} name="coverMediaId" type="hidden" value={mediaId} />
        <div className="editor-cover-preview">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Covers may use local media or an administrator-provided URL.
            <img
              alt={selected?.altText || selected?.originalName || "文章封面预览"}
              referrerPolicy="no-referrer"
              src={previewUrl}
            />
          ) : (
            <div className="editor-cover-empty">
              <ImageIcon aria-hidden="true" size={20} />
              <span>未设置封面</span>
            </div>
          )}
        </div>
        <label className="editor-cover-url-field">
          <span>
            <Link2 aria-hidden="true" size={14} />
            图片 URL
          </span>
          <Input
            form={formId}
            name="coverUrl"
            onChange={(event) => onValueChange({ coverMediaId: "", coverUrl: event.target.value })}
            placeholder="https://example.com/cover.jpg"
            type="url"
            value={url}
          />
        </label>
        <div className="editor-cover-actions">
          <Dialog
            contentClassName="editor-cover-dialog"
            description="从媒体库中选择文章列表封面。"
            onOpenChange={setOpen}
            open={open}
            title="选择文章封面"
            trigger={
              <>
                <Images aria-hidden="true" size={16} />
                选择封面
              </>
            }
          >
            {media.length > 0 ? (
              <div className="editor-cover-media-grid">
                {media.map((item) => (
                  <button
                    aria-label={`选择 ${item.originalName} 作为封面`}
                    aria-pressed={item.id === mediaId}
                    className={
                      item.id === mediaId
                        ? "editor-cover-media-option is-selected"
                        : "editor-cover-media-option"
                    }
                    key={item.id}
                    onClick={() => {
                      onValueChange({ coverMediaId: item.id, coverUrl: "" });
                      setOpen(false);
                    }}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Runtime media is served by the local media route. */}
                    <img
                      alt={item.altText || item.originalName}
                      loading="lazy"
                      src={`/media/${item.storageKey}`}
                    />
                    <span title={item.originalName}>{item.originalName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="editor-cover-media-empty">媒体库暂无图片</p>
            )}
          </Dialog>
          {mediaId || url ? (
            <Tooltip content="清除封面">
              <IconButton
                aria-label="清除封面"
                onClick={() => onValueChange({ coverMediaId: "", coverUrl: "" })}
              >
                <X aria-hidden="true" size={16} />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </Field>
  );
}

function EditorSettingsFields({
  categories,
  formId,
  kind,
  media,
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
        <>
          <CoverMediaField
            formId={formId}
            media={media}
            mediaId={metadata.coverMediaId}
            onValueChange={(value) => onMetadataChange({ ...metadata, ...value })}
            url={metadata.coverUrl}
          />
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
        </>
      ) : null}

      <details className="editor-settings-panel-seo">
        <summary>SEO 设置</summary>
        <div className="editor-settings-panel-seo-fields">
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
        </div>
      </details>

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
          <input form={formId} name="coverMediaId" type="hidden" value={metadata.coverMediaId} />
          <input form={formId} name="coverUrl" type="hidden" value={metadata.coverUrl} />
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
