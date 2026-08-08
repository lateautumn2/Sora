import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { "aria-label": ariaLabel, className, disabled, loading = false, ...props },
  ref,
) {
  return (
    <button
      aria-label={loading ? "正在处理" : ariaLabel}
      className={cn("ui-button", loading && "ui-button-loading", className)}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, type = "button", ...props }, ref) {
    return <button className={cn("ui-icon-button", className)} ref={ref} type={type} {...props} />;
  },
);
