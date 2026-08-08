import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export interface AdminDataListColumn<T> {
  align?: "start" | "end";
  className?: string;
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export function AdminDataList<T>({
  columns,
  getRowKey,
  getRowLabel,
  label,
  rows,
}: {
  columns: readonly AdminDataListColumn<T>[];
  getRowKey: (item: T) => string;
  getRowLabel?: (item: T) => string;
  label: string;
  rows: readonly T[];
}) {
  return (
    <div className="admin-data-list-scroll">
      <table aria-label={label} className="admin-data-list">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={cn(column.align === "end" && "is-end", column.className)}
                key={column.key}
                scope="col"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr aria-label={getRowLabel?.(item)} key={getRowKey(item)}>
              {columns.map((column) => (
                <td
                  className={cn(column.align === "end" && "is-end", column.className)}
                  data-label={column.label}
                  key={column.key}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
