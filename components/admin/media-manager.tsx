"use client";

import { ImageUp } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent } from "react";

import { AdminSurface } from "@/components/admin/admin-surface";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

interface MediaUploadFormProps {
  action: (formData: FormData) => Promise<never>;
}

function timestampName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function MediaUploadForm({ action }: MediaUploadFormProps) {
  const [imageName, setImageName] = useState("");
  const [fileName, setFileName] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? "");
    if (file && !imageName) setImageName(timestampName());
    if (!file) setImageName("");
  }

  return (
    <AdminSurface aria-label="上传图片">
      <form action={action} className="admin-media-upload-form">
        <Field description={fileName || "支持 JPEG、PNG、WebP、GIF 和 AVIF。"} label="选择图片">
          <FileInput
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            aria-label="选择图片"
            name="file"
            onChange={handleFileChange}
            required
          />
        </Field>
        <Field label="图片名称">
          <Input
            aria-label="图片名称"
            name="imageName"
            onChange={(event) => setImageName(event.target.value)}
            placeholder="选择图片后自动生成 YYYYMMDDHHmmss"
            value={imageName}
          />
        </Field>
        <div className="admin-media-upload-action">
          <span aria-hidden="true" className="ui-field-label">
            操作
          </span>
          <Button className="admin-media-upload-button" type="submit">
            <ImageUp aria-hidden="true" size={17} />
            上传图片
          </Button>
        </div>
      </form>
    </AdminSurface>
  );
}

export function MediaPreview({ alt, src }: { alt: string; src: string }) {
  return (
    <Dialog
      title="图片预览"
      trigger={
        <button aria-label={`放大查看${alt}`} className="admin-media-preview" type="button">
          {/* eslint-disable-next-line @next/next/no-img-element -- Runtime uploads are served outside Next image optimization. */}
          <img alt={alt} src={src} />
        </button>
      }
      triggerAsChild
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Runtime uploads are served outside Next image optimization. */}
      <img alt={alt} className="admin-media-dialog-image" src={src} />
    </Dialog>
  );
}

interface MediaAddressTabsProps {
  altText: string;
  appUrl: string;
  originalName: string;
  storageKey: string;
}

const tabNames = ["URL", "Markdown", "项目内部"] as const;
type TabName = (typeof tabNames)[number];

export function MediaAddressTabs({
  altText,
  appUrl,
  originalName,
  storageKey,
}: MediaAddressTabsProps) {
  const [active, setActive] = useState<TabName>("URL");
  const [copied, setCopied] = useState(false);
  const directUrl = `${appUrl.replace(/\/$/, "")}/media/${storageKey}`;
  const values: Record<TabName, string> = {
    URL: directUrl,
    Markdown: `![${altText || originalName}](${directUrl})`,
    项目内部: `/media/${storageKey}`,
  };

  async function selectTab(value: string) {
    if (!tabNames.includes(value as TabName)) return;
    const tab = value as TabName;
    setActive(tab);
    setCopied(false);
    try {
      await navigator.clipboard.writeText(values[tab]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="admin-media-addresses">
      <Tabs
        ariaLabel="图片地址类型"
        onValueChange={(value) => void selectTab(value)}
        tabs={tabNames.map((tab) => ({
          content: (
            <Input
              aria-label={`${tab}地址`}
              className="admin-media-address-input"
              readOnly
              value={values[tab]}
            />
          ),
          label: tab,
          value: tab,
        }))}
        value={active}
      />
      <span className="sr-only" role="status">
        {copied ? "已复制" : ""}
      </span>
    </div>
  );
}
