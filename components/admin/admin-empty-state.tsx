import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminEmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export const AdminEmptyState = forwardRef<HTMLElement, AdminEmptyStateProps>(
  function AdminEmptyState({ action, children, className, description, title, ...props }, ref) {
    return (
      <section className={cn("admin-empty-state", className)} ref={ref} {...props}>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {children}
        {action ? <div className="admin-empty-state-action">{action}</div> : null}
      </section>
    );
  },
);
