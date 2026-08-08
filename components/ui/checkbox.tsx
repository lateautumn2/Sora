"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "./cn";

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, children, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root className={cn("ui-checkbox", className)} ref={ref} {...props}>
      <CheckboxPrimitive.Indicator className="ui-checkbox-indicator">
        <Check aria-hidden="true" size={14} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
      {children}
    </CheckboxPrimitive.Root>
  );
});
