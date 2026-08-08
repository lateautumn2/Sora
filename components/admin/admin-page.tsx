import { forwardRef } from "react";
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

export const AdminPage = forwardRef<HTMLDivElement, AdminPageProps>(function AdminPage(
  { children, className, ...props },
  ref,
) {
  return (
    <div className={cn("admin-page-template", className)} ref={ref} {...props}>
      {children}
    </div>
  );
});

export const AdminPageHeader = forwardRef<HTMLElement, AdminPageHeaderProps>(
  function AdminPageHeader({ actions, children, className, description, title, ...props }, ref) {
    return (
      <header className={cn("admin-page-template-header", className)} ref={ref} {...props}>
        <div className="admin-page-template-header-main">
          <div className="admin-page-template-heading">
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="admin-page-template-actions">{actions}</div> : null}
        </div>
        {children ? <div className="admin-page-template-extra">{children}</div> : null}
      </header>
    );
  },
);
