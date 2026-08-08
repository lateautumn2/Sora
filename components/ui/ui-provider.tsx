"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import { ToastProvider } from "./toast";

export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <ToastProvider>{children}</ToastProvider>
    </TooltipPrimitive.Provider>
  );
}
