/** 前台列表页统一每页文章数。 */
export const SITE_PAGE_SIZE = 5;

/**
 * 把 URL 上的 page 参数解析为合法页码（1 起）。
 * 非法、负数、非数字一律回退到 1，避免 SQL 越界。
 */
export function resolvePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/** 根据总数计算总页数；空数据返回 0，供分页条判断是否渲染。 */
export function resolveTotalPages(total: number, pageSize = SITE_PAGE_SIZE): number {
  if (total <= 0) return 0;
  return Math.max(1, Math.ceil(total / pageSize));
}
