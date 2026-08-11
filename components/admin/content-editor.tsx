"use client";

import { TextAreaTextApi, type ICommand, type MDEditorProps } from "@uiw/react-md-editor";
import { getCommands, getExtraCommands } from "@uiw/react-md-editor/commands-cn";
import "@uiw/react-md-editor/markdown-editor.css";
import { ArrowLeft, ImagePlus, Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  saveContentAction,
  trashContentAction,
  type ContentActionState,
} from "@/app/(admin)/admin/content-actions";
import { EditorSettingsPanel } from "@/components/admin/editor-settings-panel";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { useToast } from "@/components/ui/toast";
import type { ContentDetail, TaxonomyItem } from "@/lib/content/service";
import { normalizeSlug } from "@/lib/content/validation";
import type { CoverSource } from "@/lib/content/validation";
import type { MediaSelectionItem } from "@/lib/media/service";

interface ContentEditorProps {
  kind: "POST" | "PAGE";
  content?: ContentDetail;
  categories: TaxonomyItem[];
  coverSources?: CoverSource[];
  media?: MediaSelectionItem[];
  tags: TaxonomyItem[];
}

interface UploadResult {
  data?: { url: string; alt?: string; title?: string };
  error?: { message?: string };
}

const initialState: ContentActionState = { status: "idle" };
const MDEditor = dynamic<MDEditorProps>(
  () => import("@uiw/react-md-editor").then((module) => module.default),
  { ssr: false },
);

/**
 * 编辑器主区只保留标题和 Markdown 编辑器，避免设置字段打断写作。
 * 设置字段由 EditorSettingsPanel 管理；移动端 Portal 中的字段通过 form 属性关联本表单。
 */
export function ContentEditor({
  kind,
  content,
  categories,
  coverSources = [],
  media = [],
  tags,
}: ContentEditorProps) {
  const [state, formAction, pending] = useActionState(saveContentAction, initialState);
  const { toast } = useToast();
  const handledErrorState = useRef<ContentActionState | null>(null);
  const [title, setTitle] = useState(content?.title ?? "");
  const [slug, setSlug] = useState(content?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(content?.slug));
  const [source, setSource] = useState(content?.sourceContent ?? "");
  const [uploadError, setUploadError] = useState("");
  const noun = kind === "POST" ? "文章" : "页面";
  const listHref = kind === "POST" ? "/admin/posts" : "/admin/pages";

  useEffect(() => {
    if (state.status !== "error" || handledErrorState.current === state) return;
    handledErrorState.current = state;

    toast({
      title: `${noun}保存失败`,
      description: state.formError ?? "请检查表单内容",
    });
  }, [noun, state, toast]);

  const availableMedia = useMemo(() => {
    if (
      !content?.cover?.id ||
      !content.cover.storageKey ||
      media.some((item) => item.id === content.cover?.id)
    ) {
      return media;
    }

    return [
      {
        id: content.cover.id,
        storageKey: content.cover.storageKey,
        originalName: content.cover.originalName,
        altText: content.cover.altText,
      },
      ...media,
    ];
  }, [content, media]);

  const uploadImages = useCallback(async (files: File[]) => {
    setUploadError("");
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
  }, []);

  const insertUploadedImages = useCallback(
    async (files: File[], textApi: TextAreaTextApi) => {
      try {
        const uploaded = await uploadImages(files);
        const markdown = uploaded
          .map((item, index) => {
            const fallbackAlt = files[index]?.name.replace(/\.[^.]+$/, "") ?? "图片";
            const alt = (item.alt || fallbackAlt).replace(/[\\\[\]]/g, "\\$&");
            return `![${alt}](${item.url})`;
          })
          .join("\n\n");
        textApi.replaceSelection(markdown);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "图片上传失败");
      }
    },
    [uploadImages],
  );

  const uploadCommand = useMemo<ICommand>(
    () => ({
      name: "upload-image",
      keyCommand: "upload-image",
      buttonProps: { "aria-label": "上传图片", title: "上传图片" },
      icon: <ImagePlus aria-hidden="true" size={15} />,
      execute: (_state, textApi) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        input.addEventListener(
          "change",
          () => {
            const files = Array.from(input.files ?? []);
            if (files.length > 0) void insertUploadedImages(files, textApi);
          },
          { once: true },
        );
        input.click();
      },
    }),
    [insertUploadedImages],
  );

  const editorCommands = useMemo(() => {
    const defaultCommands = getCommands();
    const imageIndex = defaultCommands.findIndex((command) => command.keyCommand === "image");
    defaultCommands.splice(imageIndex + 1, 0, uploadCommand);
    return defaultCommands;
  }, [uploadCommand]);

  const handleImagePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(event.clipboardData.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      void insertUploadedImages(files, new TextAreaTextApi(event.currentTarget));
    },
    [insertUploadedImages],
  );

  const handleImageDrop = useCallback(
    (event: DragEvent<HTMLTextAreaElement>) => {
      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      void insertUploadedImages(files, new TextAreaTextApi(event.currentTarget));
    },
    [insertUploadedImages],
  );

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
              <MDEditor
                commands={editorCommands}
                data-color-mode="light"
                extraCommands={getExtraCommands()}
                height="calc(100vh - 16rem)"
                minHeight={512}
                onChange={(value) => setSource(value ?? "")}
                preview="live"
                textareaProps={{
                  "aria-label": `${noun}正文`,
                  onDrop: handleImageDrop,
                  onPaste: handleImagePaste,
                  placeholder: "从这里开始写作，支持 Markdown 语法与图片上传…",
                }}
                value={source}
                visibleDragbar
              />
              {uploadError ? <FormMessage>{uploadError}</FormMessage> : null}
            </div>
          </div>

          <EditorSettingsPanel
            categories={categories}
            content={content}
            coverSources={coverSources}
            formId="content-editor-form"
            kind={kind}
            media={availableMedia}
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
