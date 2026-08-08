import { getAdminSession } from "@/lib/auth/admin";
import { storeMedia } from "@/lib/media/service";

/**
 * 编辑器内图片上传接口。
 * 接收 multipart 表单（file + 可选 altText），返回可直接插入 Markdown 的地址。
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: { code: "INVALID_FORM", message: "请求内容格式不正确" } },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: { code: "FILE_REQUIRED", message: "请选择图片" } },
      { status: 400 },
    );
  }

  try {
    const item = await storeMedia(file, String(form.get("altText") ?? ""));
    return Response.json({
      data: {
        url: `/media/${item.storageKey}`,
        alt: item.altText,
        title: item.originalName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isSize = message === "MEDIA_SIZE_INVALID";
    return Response.json(
      {
        error: {
          code: isSize ? "MEDIA_SIZE_INVALID" : "MEDIA_TYPE_INVALID",
          message: isSize
            ? "图片不能为空且不能超过 10 MB"
            : "仅支持 JPEG、PNG、WebP、GIF 和 AVIF 图片",
        },
      },
      { status: 400 },
    );
  }
}
