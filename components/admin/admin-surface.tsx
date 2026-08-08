import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminSurfaceProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function AdminSurface({ children, className, ...props }: AdminSurfaceProps) {
  return (
    <section className={cn("admin-surface", className)} {...props}>
      {children}
    </section>
  );
}
