import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface AdminPageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface AdminPageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function AdminPage({ children, className, ...props }: AdminPageProps) {
  return (
    <div className={cn("admin-page-template", className)} {...props}>
      {children}
    </div>
  );
}

export function AdminPageHeader({
  actions,
  className,
  description,
  title,
  ...props
}: AdminPageHeaderProps) {
  return (
    <header className={cn("admin-page-template-header", className)} {...props}>
      <div className="admin-page-template-heading">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-template-actions">{actions}</div> : null}
    </header>
  );
}
