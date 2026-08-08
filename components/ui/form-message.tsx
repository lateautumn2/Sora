import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FormMessage({ className, ...props }, ref) {
    return <p className={cn("ui-form-message", className)} ref={ref} role="alert" {...props} />;
  },
);
