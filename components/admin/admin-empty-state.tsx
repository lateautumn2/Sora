import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminEmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function AdminEmptyState({
  action,
  className,
  description,
  title,
  ...props
}: AdminEmptyStateProps) {
  return (
    <section className={cn("admin-empty-state", className)} {...props}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="admin-empty-state-action">{action}</div> : null}
    </section>
  );
}
