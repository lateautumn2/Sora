import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  label?: string;
}

export function AdminToolbar({
  children,
  className,
  label = "页面工具栏",
  ...props
}: AdminToolbarProps) {
  return (
    <div aria-label={label} className={cn("admin-toolbar", className)} role="toolbar" {...props}>
      {children}
    </div>
  );
}
