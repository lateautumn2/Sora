"use client";

import { Code2, FileText, ImageUp, Link2, X } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent } from "react";

interface MediaUploadFormProps {
  action: (formData: FormData) => Promise<never>;
}

function timestampName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "-" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

export function MediaUploadForm({ action }: MediaUploadFormProps) {
  const [altText, setAltText] = useState("");
  const [fileName, setFileName] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? "");
    if (file && !altText) setAltText(timestampName());
    if (!file) setAltText("");
  }

  return (
    <form action={action} className="admin-panel mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr_auto]">
      <label className="grid gap-2 text-sm font-medium">
        {"\u9009\u62e9\u56fe\u7247"}
        <input
          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
          aria-label={"\u9009\u62e9\u56fe\u7247"}
          className="form-input"
          name="file"
          onChange={handleFileChange}
          required
          type="file"
        />
        {fileName ? (
          <span className="text-xs font-normal text-[var(--muted)]">{fileName}</span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {"\u56fe\u7247\u540d\u79f0 / Alt \u6587\u672c"}
        <input
          aria-label={"\u56fe\u7247\u540d\u79f0"}
          className="form-input"
          name="altText"
          onChange={(event) => setAltText(event.target.value)}
          placeholder={"\u9009\u62e9\u56fe\u7247\u540e\u81ea\u52a8\u751f\u6210"}
          value={altText}
        />
      </label>
      <button className="primary-button self-end justify-center" type="submit">
        <ImageUp aria-hidden="true" size={17} />
        {"\u4e0a\u4f20\u56fe\u7247"}
      </button>
    </form>
  );
}

export function MediaPreview({ alt, src }: { alt: string; src: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`放大查看${alt}`}
        className="admin-media-preview"
        onClick={() => setOpen(true)}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Runtime uploads are served outside Next image optimization. */}
        <img alt={alt} className="aspect-video w-full bg-[var(--surface)] object-contain" src={src} />
      </button>
      {open ? (
        <div
          aria-label="图片预览"
          aria-modal="true"
          className="admin-lightbox"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <button
            aria-label="关闭图片预览"
            className="admin-lightbox-close"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Runtime uploads are served outside Next image optimization. */}
          <img
            alt={alt}
            className="admin-lightbox-image"
            onClick={(event) => event.stopPropagation()}
            src={src}
          />
        </div>
      ) : null}
    </>
  );
}

interface MediaAddressTabsProps {
  altText: string;
  appUrl: string;
  originalName: string;
  storageKey: string;
}

const tabNames = ["URL", "Markdown", "\u9879\u76ee\u5185\u90e8"] as const;
type TabName = (typeof tabNames)[number];

const tabIcons = {
  URL: Link2,
  Markdown: FileText,
  "\u9879\u76ee\u5185\u90e8": Code2,
} as const;

export function MediaAddressTabs({
  altText,
  appUrl,
  originalName,
  storageKey,
}: MediaAddressTabsProps) {
  const [active, setActive] = useState<TabName>(tabNames[0]);
  const [copied, setCopied] = useState(false);
  const directUrl = appUrl.replace(/\/$/, "") + "/media/" + storageKey;
  const internalPath = "/media/" + storageKey;
  const markdown = "![" + (altText || originalName) + "](" + directUrl + ")";
  const values: Record<TabName, string> = {
    URL: directUrl,
    Markdown: markdown,
    "\u9879\u76ee\u5185\u90e8": internalPath,
  };

  async function selectTab(tab: TabName) {
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
    <div className="mt-3">
      <div
        aria-label={"\u56fe\u7247\u5730\u5740\u7c7b\u578b"}
        className="admin-tabs"
        role="tablist"
      >
        {tabNames.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button
              aria-label={tab}
              aria-selected={active === tab}
              className={active === tab ? "admin-tab admin-tab-active" : "admin-tab"}
              key={tab}
              onClick={() => void selectTab(tab)}
              role="tab"
              title={tab}
              type="button"
            >
              <Icon aria-hidden="true" size={17} />
              <span className="sr-only">{tab}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          aria-label={active + "\u5730\u5740"}
          className="form-input min-w-0 flex-1 font-mono text-xs"
          readOnly
          value={values[active]}
        />
        <span className="sr-only" role="status">
          {copied ? "\u5df2\u590d\u5236" : ""}
        </span>
      </div>
    </div>
  );
}
