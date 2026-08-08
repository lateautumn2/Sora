"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react";

import { IconButton } from "./button";

export interface ToastOptions {
  title: string;
  description?: string;
  action?: ReactNode;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

export function Toast({
  action,
  description,
  onOpenChange,
  open,
  title,
}: ToastOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ToastPrimitive.Root className="ui-toast" onOpenChange={onOpenChange} open={open}>
      <div className="ui-toast-copy">
        <ToastPrimitive.Title className="ui-toast-title">{title}</ToastPrimitive.Title>
        {description ? (
          <ToastPrimitive.Description className="ui-toast-description">
            {description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      {action ? <div className="ui-toast-action">{action}</div> : null}
      <ToastPrimitive.Close asChild>
        <IconButton aria-label="关闭通知" type="button">
          <X aria-hidden="true" size={16} />
        </IconButton>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextToastId = useRef(0);
  const context = useMemo<ToastContextValue>(
    () => ({
      toast(options) {
        const id = ++nextToastId.current;
        setToasts((currentToasts) => [...currentToasts, { ...options, id }]);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={context}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast
            {...toast}
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) {
                setToasts((currentToasts) =>
                  currentToasts.filter((currentToast) => currentToast.id !== toast.id),
                );
              }
            }}
            open
          />
        ))}
        <ToastPrimitive.Viewport className="ui-toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
