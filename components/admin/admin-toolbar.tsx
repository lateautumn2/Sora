import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  label?: string;
}

export const AdminToolbar = forwardRef<HTMLDivElement, AdminToolbarProps>(function AdminToolbar(
  { children, className, label = "页面工具栏", ...props },
  ref,
) {
  return (
    <div
      aria-label={label}
      className={cn("admin-toolbar", className)}
      ref={ref}
      role="toolbar"
      {...props}
    >
      {children}
    </div>
  );
});
