const STATIC_IMAGE_EXTENSION = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;

/**
 * 为随机图片 API 生成文章级唯一请求地址，避免浏览器把同一 API URL 的多个封面
 * 合并为一次请求。明确指向静态图片文件的 URL 保持原样，避免破坏 CDN 缓存和
 * 带签名的对象存储地址；文章更新时间参与标识，使重新保存封面后旧缓存立即失效。
 */
export function resolveCoverImageUrl(source: string, identity: string): string {
  try {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return source;
    }

    const fileName = url.pathname.split("/").at(-1) ?? "";
    if (STATIC_IMAGE_EXTENSION.test(fileName)) {
      return source;
    }

    url.searchParams.set("_sora_cover", identity);
    return url.href;
  } catch {
    return source;
  }
}
