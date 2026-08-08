import { Trash2 } from "lucide-react";

import { MediaAddressTabs, MediaPreview, MediaUploadForm } from "@/components/admin/media-manager";
import { PostPagination } from "@/components/site/post-pagination";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countMedia, listMedia } from "@/lib/media/service";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { deleteMediaAction, uploadMediaAction } from "./actions";

const MEDIA_PAGE_SIZE = 12;

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
  searchParams: Promise<{ notice?: string; page?: string }>;
}) {
  const query = await searchParams;
  const page = resolvePage(query.page);
  const media = listMedia(MEDIA_PAGE_SIZE, (page - 1) * MEDIA_PAGE_SIZE);
  const totalPages = resolveTotalPages(countMedia(), MEDIA_PAGE_SIZE);
  const appUrl = getRuntimeConfig().appUrl;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>图片管理</h1>
          <p>仅上传图片，选择地址类型后自动复制</p>
        </div>
        <span className="admin-page-badge">{countMedia()} 张图片</span>
      </header>

      {query.notice && noticeText[query.notice] ? (
        <p className="admin-notice mt-5" role="status">
          {noticeText[query.notice]}
        </p>
      ) : null}

      <MediaUploadForm action={uploadMediaAction} />

      {media.length === 0 ? (
        <p className="admin-empty mt-6">还没有图片</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => (
              <li className="admin-media-card overflow-hidden" key={item.id}>
                <MediaPreview
                  alt={item.altText || item.originalName}
                  src={`/media/${item.storageKey}`}
                />
                <div className="space-y-2 p-3">
                  <div className="admin-media-name-row">
                    <p className="truncate text-sm font-medium" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <form action={deleteMediaAction}>
                      <input name="id" type="hidden" value={item.id} />
                      <button
                        aria-label={`删除${item.originalName}`}
                        className="admin-media-delete"
                        title="删除图片"
                        type="submit"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </form>
                  </div>
                  <p className="font-mono text-xs text-[var(--muted)]">
                    {item.width}x{item.height} · {(item.byteSize / 1024).toFixed(1)} KB
                  </p>
                  <MediaAddressTabs
                    altText={item.altText}
                    appUrl={appUrl}
                    originalName={item.originalName}
                    storageKey={item.storageKey}
                  />
                </div>
              </li>
            ))}
          </ul>
          <PostPagination
            basePath="/admin/media"
            className="admin-pagination"
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
