import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface PostPaginationProps {
  /** 列表页基础路径，如 "/"、"/categories/xxx"、"/search"。 */
  basePath: string;
  /** 当前页码，从 1 开始。 */
  page: number;
  totalPages: number;
  /** 需要保留在 URL 上的额外查询参数（如搜索关键词）。 */
  extraQuery?: Record<string, string>;
  /** 追加的样式类名（后台管理页复用同一组件时使用）。 */
  className?: string;
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
}: PostPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageWindow(page, totalPages);

  function href(targetPage: number): string {
    const params = new URLSearchParams(extraQuery);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function route(targetPage: number): Route {
    return href(targetPage) as Route;
  }

  return (
    <nav aria-label="分页" className={`sora-pagination ${className}`.trim()}>
      {page > 1 ? (
        <Link aria-label="上一页" className="sora-pagination-item" href={route(page - 1)}>
          <ChevronLeft aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className="sora-pagination-item sora-pagination-disabled">
          <ChevronLeft size={16} />
        </span>
      )}
      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span aria-hidden="true" className="sora-pagination-ellipsis" key={`e-${index}`}>
            …
          </span>
        ) : (
          <Link
            aria-current={item === page ? "page" : undefined}
            className={`sora-pagination-item ${item === page ? "sora-pagination-current" : ""}`}
            href={route(item)}
            key={item}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link aria-label="下一页" className="sora-pagination-item" href={route(page + 1)}>
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className="sora-pagination-item sora-pagination-disabled">
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}

/**
 * 生成页码窗口：始终包含首尾页，当前页前后各保留 1 页，
 * 被跳过的区间用 "ellipsis" 占位。
 */
function buildPageWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  const result: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (let candidate = 1; candidate <= totalPages; candidate += 1) {
    const isEdge = candidate === 1 || candidate === totalPages;
    const isNearCurrent = Math.abs(candidate - page) <= 1;
    if (isEdge || isNearCurrent) {
      if (previous && candidate - previous > 1) {
        result.push("ellipsis");
      }
      result.push(candidate);
      previous = candidate;
    }
  }
  return result;
}
