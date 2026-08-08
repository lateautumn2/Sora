import { Pagination, type PaginationProps } from "@/components/ui/pagination";

interface PostPaginationProps extends PaginationProps {
  /** 列表页基础路径，如 "/"、"/categories/xxx"、"/search"。 */
  basePath: string;
  /** 当前页码，从 1 开始。 */
  page: number;
  totalPages: number;
  /** 需要保留在 URL 上的额外查询参数（如搜索关键词）。 */
  extraQuery?: Record<string, string>;
  /** 追加的样式类名（后台管理页复用同一组件时使用）。 */
  className?: string;
  /** 前台保持 Sora 原视觉；后台使用共享管理分页视觉。 */
  variant?: "site" | "admin";
}

/**
 * 前台列表页通用分页条。
 * 页码较多时收缩为 "1 … 5 6 7 … 20" 的形式，避免一页展示全部页码。
 */
export function PostPagination({
  basePath,
  page,
  totalPages,
  extraQuery,
  className = "",
  variant = "site",
}: PostPaginationProps) {
  return (
    <Pagination
      basePath={basePath}
      className={className}
      extraQuery={extraQuery}
      page={page}
      totalPages={totalPages}
      variant={variant}
    />
  );
}
