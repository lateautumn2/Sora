import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export function FormMessage({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-form-message", className)} role="alert" {...props} />;
}
