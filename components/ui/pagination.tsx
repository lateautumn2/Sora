import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cn } from "./cn";

export interface PaginationProps {
  basePath: string;
  className?: string;
  extraQuery?: Record<string, string>;
  page: number;
  totalPages: number;
  variant?: "site" | "admin";
}

export function Pagination({
  basePath,
  className,
  extraQuery,
  page,
  totalPages,
  variant = "site",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const site = variant === "site";
  const rootClass = site ? "sora-pagination" : "ui-pagination";
  const itemClass = site ? "sora-pagination-item" : "ui-pagination-item";
  const currentClass = site ? "sora-pagination-current" : "ui-pagination-current";
  const disabledClass = site ? "sora-pagination-disabled" : "ui-pagination-disabled";
  const ellipsisClass = site ? "sora-pagination-ellipsis" : "ui-pagination-ellipsis";

  function route(targetPage: number): Route {
    const params = new URLSearchParams(extraQuery);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return (query ? `${basePath}?${query}` : basePath) as Route;
  }

  return (
    <nav aria-label="分页" className={cn(rootClass, className)}>
      {page > 1 ? (
        <Link aria-label="上一页" className={itemClass} href={route(page - 1)}>
          <ChevronLeft aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(itemClass, disabledClass)}>
          <ChevronLeft size={16} />
        </span>
      )}
      {buildPageWindow(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span aria-hidden="true" className={ellipsisClass} key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <Link
            aria-current={item === page ? "page" : undefined}
            className={cn(itemClass, item === page && currentClass)}
            href={route(item)}
            key={item}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link aria-label="下一页" className={itemClass} href={route(page + 1)}>
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(itemClass, disabledClass)}>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}

export function buildPageWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  const result: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (let candidate = 1; candidate <= totalPages; candidate += 1) {
    if (candidate === 1 || candidate === totalPages || Math.abs(candidate - page) <= 1) {
      if (previous && candidate - previous > 1) result.push("ellipsis");
      result.push(candidate);
      previous = candidate;
    }
  }
  return result;
}
