import { ImageUp, Trash2 } from "lucide-react";

import { listMedia, suggestedMediaMarkdown } from "@/lib/media/service";

import { deleteMediaAction, uploadMediaAction } from "./actions";

const noticeText: Record<string, string> = {
  uploaded: "图片已上传",
  deleted: "图片已删除",
  invalid: "请选择图片",
  size: "图片不能为空且不能超过 10 MB",
  type: "仅支持 JPEG、PNG、WebP、GIF 和 AVIF 图片",
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const media = listMedia();
  const notice = (await searchParams).notice;
  return (
    <div>
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">媒体</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">上传文章图片并复制 Markdown 地址</p>
      </header>
      {notice && noticeText[notice] ? (
        <p
          className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          role="status"
        >
          {noticeText[notice]}
        </p>
      ) : null}
      <form
        action={uploadMediaAction}
        className="mt-6 grid gap-3 rounded-[var(--radius)] border border-[var(--border)] p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <input
          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
          aria-label="选择图片"
          className="form-input py-2"
          name="file"
          required
          type="file"
        />
        <input aria-label="替代文本" className="form-input" name="altText" placeholder="替代文本" />
        <button className="primary-button justify-center" type="submit">
          <ImageUp aria-hidden="true" size={17} />
          上传
        </button>
      </form>
      {media.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--muted)]">还没有媒体文件</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <li
              className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]"
              key={item.id}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Runtime uploads are served outside Next image optimization. */}
              <img
                alt={item.altText || item.originalName}
                className="aspect-video w-full bg-[var(--surface)] object-contain"
                src={`/media/${item.storageKey}`}
              />
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium" title={item.originalName}>
                  {item.originalName}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">
                  {item.width}x{item.height} · {(item.byteSize / 1024).toFixed(1)} KB
                </p>
                <input
                  aria-label={`${item.originalName} Markdown 地址`}
                  className="form-input w-full font-mono text-xs"
                  readOnly
                  value={suggestedMediaMarkdown(item)}
                />
                <form action={deleteMediaAction}>
                  <input name="id" type="hidden" value={item.id} />
                  <button
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--danger)] hover:underline"
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                    删除
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
