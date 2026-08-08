import { Trash2 } from "lucide-react";

import { deleteMediaAction, uploadMediaAction } from "@/app/(admin)/admin/media/actions";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { MediaAddressTabs, MediaPreview, MediaUploadForm } from "@/components/admin/media-manager";
import { IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { PostPagination } from "@/components/site/post-pagination";
import { resolvePage, resolveTotalPages } from "@/lib/content/pagination";
import { countMedia, listMedia } from "@/lib/media/service";
import { getRuntimeConfig } from "@/lib/runtime-config";

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
  const total = countMedia();
  const media = listMedia(MEDIA_PAGE_SIZE, (page - 1) * MEDIA_PAGE_SIZE);
  const appUrl = getRuntimeConfig().appUrl;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={<span className="admin-count-badge">{total} 张图片</span>}
        description="上传图片，切换地址格式后自动复制。"
        title="图片管理"
      >
        {query.notice && noticeText[query.notice] ? (
          <p className="admin-notice" role="status">
            {noticeText[query.notice]}
          </p>
        ) : null}
      </AdminPageHeader>

      <MediaUploadForm action={uploadMediaAction} />

      {media.length === 0 ? (
        <AdminEmptyState description="上传后的图片会显示在这里。" title="还没有图片" />
      ) : (
        <>
          <ul aria-label="图片列表" className="admin-media-grid">
            {media.map((item) => (
              <li className="admin-media-card" key={item.id}>
                <MediaPreview
                  alt={item.altText || item.originalName}
                  src={`/media/${item.storageKey}`}
                />
                <div className="admin-media-card-body">
                  <div className="admin-media-name-row">
                    <strong title={item.originalName}>{item.originalName}</strong>
                    <form action={deleteMediaAction}>
                      <input name="id" type="hidden" value={item.id} />
                      <Tooltip content="删除图片">
                        <IconButton
                          aria-label={`删除${item.originalName}`}
                          className="admin-record-delete-action"
                          type="submit"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </IconButton>
                      </Tooltip>
                    </form>
                  </div>
                  <p className="admin-media-meta">
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
            totalPages={resolveTotalPages(total, MEDIA_PAGE_SIZE)}
            variant="admin"
          />
        </>
      )}
    </AdminPage>
  );
}
