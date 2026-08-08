import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminSurfaceProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export const AdminSurface = forwardRef<HTMLElement, AdminSurfaceProps>(function AdminSurface(
  { children, className, ...props },
  ref,
) {
  return (
    <section className={cn("admin-surface", className)} ref={ref} {...props}>
      {children}
    </section>
  );
});
