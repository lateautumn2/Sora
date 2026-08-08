import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "./cn";

export const FileInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function FileInput({ className, ...props }, ref) {
    return (
      <input className={cn("ui-file-input-native", className)} ref={ref} type="file" {...props} />
    );
  },
);
